const soundUrl = (fileName) => (
    typeof document === 'undefined'
        ? fileName
        : new URL(fileName, document.baseURI).href
);

const DEFAULT_SOUND_URL = soundUrl('split-flap.wav');
const PITCHED_SOUND_URL = soundUrl('split-flap_pitched_down.wav');
const FLAP_SOUND_DURATION_MS = 170;
const FLAP_SOUND_POOL_SIZE = 48;

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

        this.voices = [];
        this.pitchedVoices = [];
        this.pendingPlays = [];
        this.flushingPlays = false;
        [this.template, this.pitchedTemplate].forEach((template) => {
            if (template) {
                template.preload = 'auto';
            }
        });
        this.fillPool(this.voices, this.template);
        this.fillPool(this.pitchedVoices, this.pitchedTemplate);
    }

    fillPool(pool, template) {
        if (!template) {
            return;
        }

        while (pool.length < FLAP_SOUND_POOL_SIZE) {
            const sound = template.cloneNode();
            sound.preload = 'auto';
            sound.preservesPitch = true;
            const voice = { sound, busy: false };
            const release = () => {
                voice.busy = false;
            };
            sound.addEventListener('ended', release);
            sound.addEventListener('error', release);
            pool.push(voice);
        }
    }

    claimVoice(pool) {
        for (let index = 0; index < pool.length; index += 1) {
            if (!pool[index].busy) {
                return pool[index];
            }
        }

        return null;
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
        if (this.muted) {
            return;
        }

        this.pendingPlays.push({ variant, durationMs });
        if (this.flushingPlays) {
            return;
        }

        this.flushingPlays = true;
        const flush = () => {
            this.flushingPlays = false;
            const queued = this.pendingPlays.splice(0);
            queued.forEach((item) => this.playNow(item.variant, item.durationMs));
        };
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(flush);
        } else {
            setTimeout(flush, 0);
        }
    }

    playNow(variant, durationMs) {
        const pool = variant === 'pitched' ? this.pitchedVoices : this.voices;
        if (this.muted || pool.length === 0) {
            return;
        }

        const voice = this.claimVoice(pool);
        if (!voice) {
            return;
        }

        const sound = voice.sound;
        voice.busy = true;
        const duration = Number(durationMs);
        if (Number.isFinite(duration) && duration > 0) {
            sound.playbackRate = Math.min(
                16,
                Math.max(0.0625, FLAP_SOUND_DURATION_MS / duration)
            );
        }

        const release = () => {
            voice.busy = false;
        };

        try {
            if (sound.ended || sound.paused) {
                if (sound.currentTime !== 0) {
                    sound.currentTime = 0;
                }
            }
        } catch {
            // The clip can still start from the beginning once playback begins.
        }

        try {
            const playback = sound.play();
            if (playback?.then) {
                playback
                    .then(() => this.setUnlocked(true))
                    .catch(release);
            } else {
                this.setUnlocked(true);
            }
        } catch {
            release();
        }
    }

    destroy() {
        this.removeActivationListeners();
        this.listeners.clear();
        this.pendingPlays = [];
        this.flushingPlays = false;
        this.voices.splice(0).forEach((voice) => voice.sound.pause());
        this.pitchedVoices.splice(0).forEach((voice) => voice.sound.pause());
        this.template?.pause();
        this.pitchedTemplate?.pause();
        this.template = null;
        this.pitchedTemplate = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
