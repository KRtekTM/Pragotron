const DEFAULT_SOUND_URL = typeof document === 'undefined'
    ? 'split-flap.wav'
    : new URL('split-flap.wav', document.baseURI).href;

export class SplitFlapAudio {
    constructor(source = DEFAULT_SOUND_URL) {
        this.template = typeof Audio === 'function' ? new Audio(source) : null;
        this.unlocked = false;
        this.activationTarget = null;
        this.activationHandler = null;
        this.listeners = new Set();

        if (this.template) {
            this.template.preload = 'auto';
        }
    }

    getState() {
        return {
            available: Boolean(this.template),
            unlocked: this.unlocked
        };
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

    play() {
        if (!this.template) {
            return;
        }

        const sound = this.template.cloneNode();
        sound.preload = 'auto';

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
        this.template = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
