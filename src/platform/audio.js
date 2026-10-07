const DEFAULT_SOUND_URL = typeof document === 'undefined'
    ? 'split-flap.wav'
    : new URL('split-flap.wav', document.baseURI).href;

export class SplitFlapAudio {
    constructor(source = DEFAULT_SOUND_URL) {
        this.template = typeof Audio === 'function' ? new Audio(source) : null;

        if (this.template) {
            this.template.preload = 'auto';
        }
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
            if (playback) {
                playback.catch(cleanup);
            }
        } catch {
            cleanup();
        }
    }

    destroy() {
        this.template?.pause();
        this.template = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
