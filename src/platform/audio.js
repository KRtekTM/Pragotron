const DEFAULT_SOUND_URL = typeof document === 'undefined'
    ? 'split-flap.wav'
    : new URL('split-flap.wav', document.baseURI).href;

const AUDIO_VOICE_LIMIT = 2;

const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;

export class SplitFlapAudio {
    constructor(source = DEFAULT_SOUND_URL) {
        this.sourceUrl = source;
        this.template = typeof Audio === 'function' ? new Audio(source) : null;
        this.voices = [];
        this.nextVoice = 0;
        this.framePlays = 0;
        this.frameReset = 0;
        this.unlocked = false;
        this.activationTarget = null;
        this.activationHandler = null;
        this.listeners = new Set();
        this.context = null;
        this.buffer = null;
        this.output = null;
        this.decodePromise = null;

        if (this.template) {
            this.template.preload = 'auto';
        }
    }

    getState() {
        return {
            available: Boolean(this.template || this.buffer),
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
        if ((!this.template && !AudioContextCtor) || !target?.addEventListener) {
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

    ensureContext() {
        if (this.context || !AudioContextCtor) {
            return this.context;
        }

        this.context = new AudioContextCtor();
        this.output = this.context.createGain();
        this.output.gain.value = 1;
        this.output.connect(this.context.destination);
        return this.context;
    }

    decodeBuffer() {
        if (this.buffer || this.decodePromise || !this.context) {
            return this.decodePromise;
        }

        this.decodePromise = fetch(this.sourceUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Zvuk flapu vrátil HTTP ${response.status}.`);
                }

                return response.arrayBuffer();
            })
            .then((data) => this.context.decodeAudioData(data))
            .then((buffer) => {
                this.buffer = buffer;
                return buffer;
            })
            .catch(() => {
                this.decodePromise = null;
                return null;
            });

        return this.decodePromise;
    }

    unlock() {
        if (this.unlocked && this.context?.state === 'running') {
            return this.unlocked;
        }

        const context = this.ensureContext();
        if (context?.state === 'suspended') {
            context.resume().then(() => {
                this.setUnlocked(true);
                this.removeActivationListeners();
            }).catch(() => {});
        }

        this.decodeBuffer();

        if (!this.template) {
            return this.unlocked;
        }

        const sound = this.getVoice();
        if (!sound) {
            return this.unlocked;
        }

        sound.muted = true;
        sound.volume = 0;
        try {
            const playback = sound.play();
            const finish = () => {
                sound.pause();
                sound.muted = false;
                sound.volume = 1;
                sound.currentTime = 0;
                this.setUnlocked(true);
                this.removeActivationListeners();
            };
            if (playback?.then) {
                playback.then(finish).catch(() => {
                    sound.muted = false;
                    sound.volume = 1;
                });
            } else {
                finish();
            }
        } catch {
            sound.muted = false;
            sound.volume = 1;
        }

        return this.unlocked;
    }

    noteFramePlay() {
        this.framePlays += 1;
        if (this.frameReset) {
            return;
        }

        const reset = () => {
            this.framePlays = 0;
            this.frameReset = 0;
        };

        if (typeof window.requestAnimationFrame === 'function') {
            this.frameReset = window.requestAnimationFrame(reset);
            return;
        }

        this.frameReset = window.setTimeout(reset, 16);
    }

    getVoice() {
        if (!this.template) {
            return null;
        }

        if (this.voices.length < AUDIO_VOICE_LIMIT) {
            const voice = this.template.cloneNode();
            voice.preload = 'auto';
            this.voices.push(voice);
            return voice;
        }

        const voice = this.voices[this.nextVoice];
        this.nextVoice = (this.nextVoice + 1) % this.voices.length;
        return voice;
    }

    play() {
        if (this.framePlays >= AUDIO_VOICE_LIMIT) {
            return;
        }

        this.noteFramePlay();

        if (this.buffer && this.context?.state === 'running') {
            const source = this.context.createBufferSource();
            source.buffer = this.buffer;
            source.connect(this.output);
            source.onended = () => {
                source.disconnect();
            };
            source.start();
            this.setUnlocked(true);
            return;
        }

        if (this.context && !this.buffer) {
            this.decodeBuffer();
        }

        const sound = this.getVoice();
        if (!sound) {
            return;
        }

        try {
            sound.muted = false;
            sound.volume = 1;
            sound.currentTime = 0;
            const playback = sound.play();
            if (playback?.then) {
                playback
                    .then(() => this.setUnlocked(true))
                    .catch(() => {});
            } else {
                this.setUnlocked(true);
            }
        } catch {
            // Ignore autoplay or missing media errors.
        }
    }

    destroy() {
        this.removeActivationListeners();
        this.listeners.clear();
        if (this.frameReset) {
            if (typeof window.cancelAnimationFrame === 'function') {
                window.cancelAnimationFrame(this.frameReset);
            } else {
                window.clearTimeout(this.frameReset);
            }
            this.frameReset = 0;
        }
        this.voices.forEach((voice) => {
            voice.pause();
            voice.removeAttribute('src');
            voice.load();
        });
        this.voices = [];
        this.template?.pause();
        this.template = null;
        if (this.context) {
            this.context.close?.();
            this.context = null;
        }
        this.buffer = null;
        this.output = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
