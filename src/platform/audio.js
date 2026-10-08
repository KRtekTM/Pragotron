const soundUrl = (fileName) => (
    typeof document === 'undefined'
        ? fileName
        : new URL(fileName, document.baseURI).href
);

const DEFAULT_SOUND_URL = soundUrl('split-flap.wav');
const PITCHED_SOUND_URL = soundUrl('split-flap_pitched_down.wav');
const FLAP_SOUND_DURATION_MS = 170;

const AUDIO_MUTE_STORAGE_KEY = 'pragotron.board.audioMuted.v1';

const readStoredMute = () => {
    try {
        return globalThis.sessionStorage?.getItem(AUDIO_MUTE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

const writeStoredMute = (muted) => {
    try {
        globalThis.sessionStorage?.setItem(
            AUDIO_MUTE_STORAGE_KEY,
            muted ? '1' : '0'
        );
    } catch {
        // The board can still mute for this page view.
    }
};

export class SplitFlapAudio {
    constructor(source = DEFAULT_SOUND_URL) {
        this.template = typeof Audio === 'function' ? new Audio(source) : null;
        this.pitchedTemplate = typeof Audio === 'function'
            ? new Audio(PITCHED_SOUND_URL)
            : null;
        this.unlocked = false;
        this.muted = readStoredMute();
        this.activationTarget = null;
        this.activationHandler = null;
        this.listeners = new Set();

        [this.template, this.pitchedTemplate].forEach((template) => {
            if (template) {
                template.preload = 'auto';
            }
        });
    }

    getState() {
        return {
            available: Boolean(this.template),
            unlocked: this.unlocked,
            muted: this.muted
        };
    }

    setMuted(value) {
        const nextValue = Boolean(value);
        if (nextValue === this.muted) {
            return this.muted;
        }

        this.muted = nextValue;
        writeStoredMute(nextValue);
        this.listeners.forEach((listener) => listener(this.getState()));
        return this.muted;
    }

    setUnlocked(value) {
        const nextValue = Boolean(value);
        if (nextValue === this.unlocked) {
            return;
        }

        this.unlocked = nextValue;
        this.listeners.forEach((listener) => listener(this.getState()));
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener audia musí být funkce.');
        }

        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    removeActivationListeners() {
        if (!this.activationTarget || !this.activationHandler) {
            return;
        }

        ['pointerdown', 'keydown'].forEach((eventName) => {
            this.activationTarget.removeEventListener(
                eventName,
                this.activationHandler,
                true
            );
        });
        this.activationTarget = null;
        this.activationHandler = null;
    }

    bindUserActivation(target = globalThis.document) {
        if (!this.template || !target?.addEventListener) {
            return this;
        }

        if (this.unlocked || this.activationTarget) {
            return this;
        }

        this.activationTarget = target;
        this.activationHandler = () => {
            this.unlock();
        };
        ['pointerdown', 'keydown'].forEach((eventName) => {
            target.addEventListener(
                eventName,
                this.activationHandler,
                true
            );
        });
        return this;
    }

    unlock() {
        if (!this.template || this.unlocked) {
            return this.unlocked;
        }

        const sound = this.template.cloneNode();
        sound.preload = 'auto';
        sound.muted = true;
        sound.volume = 0;
        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                return;
            }

            cleanedUp = true;
            sound.pause();
            sound.remove();
        };
        const unlocked = () => {
            this.setUnlocked(true);
            this.removeActivationListeners();
            cleanup();
        };

        try {
            const playback = sound.play();
            if (playback?.then) {
                playback.then(unlocked).catch(cleanup);
            } else {
                unlocked();
            }
        } catch {
            cleanup();
        }

        return this.unlocked;
    }

    play(variant, durationMs) {
        const template = variant === 'pitched'
            ? this.pitchedTemplate
            : this.template;
        if (!template || this.muted) {
            return;
        }

        const sound = template.cloneNode();
        sound.preload = 'auto';
        const duration = Number(durationMs);
        if (Number.isFinite(duration) && duration > 0) {
            const rate = Math.min(
                16,
                Math.max(0.0625, FLAP_SOUND_DURATION_MS / duration)
            );
            sound.playbackRate = rate;
            sound.preservesPitch = true;
        }

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                return;
            }

            cleanedUp = true;
            sound.remove();
        };

        sound.addEventListener('ended', cleanup, { once: true });
        sound.addEventListener('error', cleanup, { once: true });

        try {
            const playback = sound.play();
            if (playback?.then) {
                playback
                    .then(() => this.setUnlocked(true))
                    .catch(cleanup);
            } else {
                this.setUnlocked(true);
            }
        } catch {
            cleanup();
        }
    }

    destroy() {
        this.removeActivationListeners();
        this.listeners.clear();
        this.template?.pause();
        this.pitchedTemplate?.pause();
        this.template = null;
        this.pitchedTemplate = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
