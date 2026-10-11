import { STATION_FLIP_DURATION } from './data.js';

const soundUrl = (fileName) => (
    typeof document === 'undefined'
        ? fileName
        : new URL(fileName, document.baseURI).href
);

const DEFAULT_SOUND_URL = soundUrl('split-flap.wav');
const PITCHED_SOUND_URL = soundUrl('split-flap_pitched_down.wav');
const FLAP_SOUND_DURATION_MS = 170;
const FLAP_SOUND_POOL_SIZE = 48;
const DEFAULT_PLAYBACK_RATE = Math.min(
    16,
    Math.max(0.0625, FLAP_SOUND_DURATION_MS / STATION_FLIP_DURATION)
);

const playbackRateFor = (durationMs) => {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration <= 0) {
        return DEFAULT_PLAYBACK_RATE;
    }

    return Math.min(16, Math.max(0.0625, FLAP_SOUND_DURATION_MS / duration));
};

// Gecko's media engine time-stretches with SoundTouch. Many identical copies
// then start on one sample and clip into a buzz. MozAppearance is an engine
// capability, not the customizable user-agent string. mozPreservesPitch was
// removed, so it can no longer be used for this.
const usesGeckoMix = () => {
    if (typeof document === 'undefined') {
        return false;
    }

    const style = document.documentElement?.style;
    return Boolean(style)
        && ('MozAppearance' in style || 'MozBoxSizing' in style);
};

const hannWindow = (length) => {
    const window = new Float32Array(length);
    const last = Math.max(1, length - 1);
    for (let index = 0; index < length; index += 1) {
        window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / last));
    }
    return window;
};

// Time-stretch that keeps pitch. The opening click is copied unchanged and
// both channels share one offset, so the flap does not get a second attack
// or a hollow stereo image. playbackRate uses the HTMLAudioElement meaning:
// values below 1 make the same sample longer.
export const stretchPreservePitch = (channels, sampleRate, playbackRate) => {
    const rate = Number(playbackRate);
    if (!Number.isFinite(rate) || rate <= 0) {
        return channels.map((channel) => Float32Array.from(channel));
    }

    const stretch = 1 / rate;
    if (Math.abs(stretch - 1) < 0.004) {
        return channels.map((channel) => Float32Array.from(channel));
    }

    const inputLength = channels[0].length;
    const outputLength = Math.max(1, Math.round(inputLength * stretch));
    const windowSize = Math.max(16, Math.round(sampleRate * 0.02));
    if (inputLength < windowSize * 2) {
        return channels.map((channel) => Float32Array.from(channel));
    }

    const hopOut = Math.max(8, Math.floor(windowSize / 2));
    const hopIn = hopOut / stretch;
    const search = Math.max(1, Math.round(sampleRate * 0.004));
    const hann = hannWindow(windowSize);
    const outputs = channels.map(() => new Float32Array(outputLength + windowSize));
    const weight = new Float32Array(outputLength + windowSize);
    const clampPos = (pos) => Math.max(
        0,
        Math.min(inputLength - windowSize, Math.round(pos))
    );
    const correlate = (origin, candidate) => {
        let dot = 0;
        let energy = 1e-12;
        for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
            const channel = channels[channelIndex];
            for (let index = 0; index < windowSize; index += 4) {
                const left = channel[origin + index];
                const right = channel[candidate + index];
                dot += left * right;
                energy += right * right;
            }
        }
        return dot / Math.sqrt(energy);
    };
    const addFrame = (inputIndex, outputIndex) => {
        for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
            const input = channels[channelIndex];
            const output = outputs[channelIndex];
            for (let index = 0; index < windowSize; index += 1) {
                output[outputIndex + index] += input[inputIndex + index] * hann[index];
            }
        }
        for (let index = 0; index < windowSize; index += 1) {
            weight[outputIndex + index] += hann[index];
        }
    };

    let inPos = 0;
    let outPos = 0;
    addFrame(0, 0);
    while (outPos + hopOut < outputLength) {
        const nominal = inPos + hopIn;
        if (nominal + windowSize >= inputLength) {
            break;
        }

        const origin = clampPos(inPos + hopOut);
        let best = clampPos(nominal);
        let bestScore = -Infinity;
        const start = clampPos(nominal - search);
        const end = clampPos(nominal + search);
        for (let candidate = start; candidate <= end; candidate += 2) {
            const score = correlate(origin, candidate);
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        outPos += hopOut;
        addFrame(best, outPos);
        inPos = best;
    }

    const mixed = outputs.map((output) => {
        const trimmed = new Float32Array(outputLength);
        for (let index = 0; index < outputLength; index += 1) {
            const scale = weight[index];
            trimmed[index] = scale > 1e-5 ? output[index] / scale : 0;
        }
        return trimmed;
    });

    const attack = Math.min(
        inputLength,
        outputLength,
        Math.round(sampleRate * 0.025)
    );
    const fade = Math.min(
        Math.round(sampleRate * 0.008),
        Math.max(0, Math.min(inputLength, outputLength) - attack)
    );
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
        const input = channels[channelIndex];
        const output = mixed[channelIndex];
        for (let index = 0; index < attack; index += 1) {
            output[index] = input[index];
        }
        for (let index = 0; index < fade; index += 1) {
            const at = attack + index;
            const blend = index / fade;
            output[at] = (input[at] * (1 - blend)) + (output[at] * blend);
        }
    }

    return mixed;
};

const AUDIO_MUTE_STORAGE_KEY = 'pragotron.board.audioMuted.v1';
const AUDIO_VOLUME_STORAGE_KEY = 'pragotron.board.audioVolume.v1';

const normalizeVolume = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 100;
    }

    return Math.min(100, Math.max(0, Math.round(numeric)));
};

// A previous visit must not keep playing after reload while manage shows
// the default. Drop both keys even when this document cannot write them.
const forgetStoredAudioLevel = () => {
    try {
        globalThis.sessionStorage?.removeItem(AUDIO_MUTE_STORAGE_KEY);
        globalThis.sessionStorage?.removeItem(AUDIO_VOLUME_STORAGE_KEY);
    } catch {
        // The in-memory level is still the default or the URL value.
    }
};

// `?volume=0`–`100` on a board page forces the level for that load.
// Anything else, including an empty or invalid query, uses 100.
const readVolumeOverride = () => {
    try {
        const params = new URLSearchParams(globalThis.location?.search || '');
        if (!params.has('volume')) {
            return null;
        }

        const raw = String(params.get('volume') ?? '').trim();
        if (!/^\d{1,3}$/.test(raw)) {
            return null;
        }

        const numeric = Number(raw);
        if (!Number.isInteger(numeric) || numeric > 100) {
            return null;
        }

        return numeric;
    } catch {
        return null;
    }
};

export class SplitFlapAudio {
    constructor(source = DEFAULT_SOUND_URL) {
        this.template = typeof Audio === 'function' ? new Audio(source) : null;
        this.pitchedTemplate = typeof Audio === 'function'
            ? new Audio(PITCHED_SOUND_URL)
            : null;
        this.unlocked = false;
        this.muted = false;
        const volumeOverride = readVolumeOverride();
        this.volume = volumeOverride === null ? 100 : volumeOverride;
        forgetStoredAudioLevel();
        this.activationTarget = null;
        this.activationHandler = null;
        this.listeners = new Set();

        this.voices = [];
        this.pitchedVoices = [];
        this.pendingPlays = [];
        this.flushingPlays = false;
        this.bufferMix = usesGeckoMix()
            && typeof AudioContext === 'function'
            && Boolean(this.template);
        this.context = null;
        this.master = null;
        this.normalDecoded = null;
        this.pitchedDecoded = null;
        this.normalCache = new Map();
        this.pitchedCache = new Map();
        this.pendingAfterDecode = [];
        this.liveSources = new Set();
        [this.template, this.pitchedTemplate].forEach((template) => {
            if (template) {
                template.preload = 'auto';
            }
        });
        if (this.bufferMix) {
            this.startBufferMix();
        } else {
            this.fillPool(this.voices, this.template);
            this.fillPool(this.pitchedVoices, this.pitchedTemplate);
        }
        this.applyVolume();
    }

    applyVolume() {
        const level = this.volume / 100;
        const apply = (sound) => {
            if (sound) {
                sound.volume = level;
            }
        };
        apply(this.template);
        apply(this.pitchedTemplate);
        this.voices.forEach((voice) => apply(voice.sound));
        this.pitchedVoices.forEach((voice) => apply(voice.sound));
        if (this.master) {
            this.master.gain.value = level;
        }
    }

    holdPitch(sound) {
        if (!sound) {
            return;
        }

        // Chromium clears this flag when src or playbackRate is assigned and
        // then resamples. Rate 170/190 is about one whole tone down.
        if (sound.preservesPitch !== true) {
            sound.preservesPitch = true;
        }
        if ('webkitPreservesPitch' in sound && sound.webkitPreservesPitch !== true) {
            sound.webkitPreservesPitch = true;
        }
    }

    configureSound(sound) {
        sound.preload = 'auto';
        sound.playbackRate = DEFAULT_PLAYBACK_RATE;
        this.holdPitch(sound);
        sound.volume = this.volume / 100;
    }

    makeVoice(template) {
        const sound = template.cloneNode();
        this.configureSound(sound);
        if (!sound.getAttribute('src') && template.src) {
            sound.src = template.src;
            this.holdPitch(sound);
        }
        const voice = {
            sound,
            busy: false,
            ready: true
        };
        this.bindVoice(voice);
        return voice;
    }

    bindVoice(voice) {
        const sound = voice.sound;
        const keepPitch = () => {
            if (voice.sound !== sound) {
                return;
            }
            this.holdPitch(sound);
        };
        sound.addEventListener('loadedmetadata', () => {
            keepPitch();
            if (voice.sound !== sound) {
                return;
            }
            sound.volume = this.volume / 100;
        });
        sound.addEventListener('ended', () => {
            if (voice.sound !== sound) {
                return;
            }
            if (voice.busyTimer) {
                clearTimeout(voice.busyTimer);
                voice.busyTimer = null;
            }
            // play() restarts an ended element. Seeking here keeps the voice
            // busy and the next flap is skipped.
            voice.busy = false;
            voice.ready = true;
        });
        sound.addEventListener('error', () => {
            if (voice.sound !== sound) {
                return;
            }
            voice.busy = false;
            voice.ready = true;
        });
    }

    fillPool(pool, template) {
        if (!template) {
            return;
        }

        while (pool.length < FLAP_SOUND_POOL_SIZE) {
            pool.push(this.makeVoice(template));
        }
    }

    claimVoice(pool) {
        for (let index = 0; index < pool.length; index += 1) {
            const voice = pool[index];
            if (!voice.busy && !voice.sound.seeking) {
                return voice;
            }
        }

        return null;
    }

    getState() {
        return {
            available: Boolean(this.template),
            unlocked: this.unlocked,
            muted: this.muted,
            volume: this.volume
        };
    }

    setMuted(value) {
        const nextValue = Boolean(value);
        if (nextValue === this.muted) {
            return this.muted;
        }

        this.muted = nextValue;
        this.listeners.forEach((listener) => listener(this.getState()));
        return this.muted;
    }

    setVolume(value) {
        const nextValue = normalizeVolume(value);
        const changed = nextValue !== this.volume;
        this.volume = nextValue;
        this.applyVolume();
        if (changed) {
            this.listeners.forEach((listener) => listener(this.getState()));
        }
        return this.volume;
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
            this.context?.resume?.();
            this.applyVolume();
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

        this.applyVolume();
        this.pendingPlays.push({ variant, durationMs });
        if (this.flushingPlays) {
            return;
        }

        this.flushingPlays = true;
        const flush = () => {
            this.flushingPlays = false;
            const queued = this.pendingPlays.splice(0);
            if (this.bufferMix) {
                this.playBuffered(queued);
                return;
            }
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
        voice.ready = false;
        sound.volume = this.volume / 100;
        const rate = playbackRateFor(durationMs);
        if (Math.abs(sound.playbackRate - rate) > 0.001) {
            sound.playbackRate = rate;
        }
        this.holdPitch(sound);

        const release = () => {
            if (voice.busyTimer) {
                clearTimeout(voice.busyTimer);
                voice.busyTimer = null;
            }
            voice.busy = false;
            voice.ready = !sound.seeking;
        };
        const armRelease = () => {
            const expectedMs = Number.isFinite(sound.duration) && sound.playbackRate > 0
                ? (sound.duration / sound.playbackRate) * 1000
                : 200;
            voice.busyTimer = setTimeout(() => {
                voice.busyTimer = null;
                if (voice.sound !== sound || !voice.busy) {
                    return;
                }
                if (sound.paused || sound.ended) {
                    voice.busy = false;
                    voice.ready = true;
                }
            }, expectedMs + 80);
        };

        try {
            const playback = sound.play();
            if (playback?.then) {
                playback
                    .then(() => {
                        this.setUnlocked(true);
                        armRelease();
                    })
                    .catch(release);
            } else {
                this.setUnlocked(true);
                armRelease();
            }
        } catch {
            release();
        }
    }

    startBufferMix() {
        const context = new AudioContext();
        const master = context.createGain();
        const limiter = context.createDynamicsCompressor();
        // A single flap peaks around -12 dB, under this threshold. Overlapping
        // copies would otherwise hard-clip into a sawtooth; the knee only
        // catches that sum.
        limiter.threshold.value = -1.5;
        limiter.knee.value = 3;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.04;
        master.gain.value = this.volume / 100;
        master.connect(limiter);
        limiter.connect(context.destination);
        this.context = context;
        this.master = master;
        this.limiter = limiter;
        this.prepareDecoded('normal', this.template.src);
        this.prepareDecoded('pitched', this.pitchedTemplate?.src);
    }

    prepareDecoded(kind, url) {
        if (!url || !this.context) {
            return;
        }

        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(String(response.status));
                }
                return response.arrayBuffer();
            })
            .then((encoded) => this.context.decodeAudioData(encoded.slice(0)))
            .then((decoded) => {
                if (!this.bufferMix || !this.context) {
                    return;
                }
                if (kind === 'pitched') {
                    this.pitchedDecoded = decoded;
                } else {
                    this.normalDecoded = decoded;
                }
                this.flushDecodedQueue();
            })
            .catch(() => this.failBufferMix());
    }

    failBufferMix() {
        if (!this.bufferMix) {
            return;
        }

        this.bufferMix = false;
        const queued = this.pendingAfterDecode.splice(0);
        this.fillPool(this.voices, this.template);
        this.fillPool(this.pitchedVoices, this.pitchedTemplate);
        queued.forEach((item) => this.playNow(item.variant, item.durationMs));
    }

    flushDecodedQueue() {
        if (!this.bufferMix || this.pendingAfterDecode.length === 0) {
            return;
        }
        if (!this.normalDecoded) {
            return;
        }

        const queued = this.pendingAfterDecode.splice(0);
        this.playBuffered(queued);
    }

    bufferFor(variant, durationMs) {
        const decoded = variant === 'pitched' ? this.pitchedDecoded : this.normalDecoded;
        if (!decoded || !this.context) {
            return null;
        }

        const rate = playbackRateFor(durationMs);
        const key = rate.toFixed(4);
        const cache = variant === 'pitched' ? this.pitchedCache : this.normalCache;
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }

        const channels = [];
        for (let index = 0; index < decoded.numberOfChannels; index += 1) {
            channels.push(Float32Array.from(decoded.getChannelData(index)));
        }
        const stretched = stretchPreservePitch(channels, decoded.sampleRate, rate);
        const buffer = this.context.createBuffer(
            stretched.length,
            stretched[0].length,
            decoded.sampleRate
        );
        stretched.forEach((channel, index) => {
            buffer.getChannelData(index).set(channel);
        });
        cache.set(key, buffer);
        return buffer;
    }

    playBuffered(queued) {
        if (!this.context || this.muted || queued.length === 0) {
            return;
        }

        const start = () => {
            if (!this.bufferMix || !this.context || !this.master) {
                queued.forEach((item) => this.playNow(item.variant, item.durationMs));
                return;
            }

            const when = this.context.currentTime + 0.005;
            const waiting = [];
            queued.forEach((item) => {
                const buffer = this.bufferFor(item.variant, item.durationMs);
                if (!buffer) {
                    waiting.push(item);
                    return;
                }

                const source = this.context.createBufferSource();
                source.buffer = buffer;
                source.connect(this.master);
                source.onended = () => {
                    this.liveSources.delete(source);
                    source.disconnect();
                };
                this.liveSources.add(source);
                source.start(when);
            });
            if (waiting.length > 0) {
                this.pendingAfterDecode.push(...waiting);
            }
            this.setUnlocked(true);
        };

        if (this.context.state === 'running') {
            start();
            return;
        }

        const resumed = this.context.resume();
        if (resumed?.then) {
            resumed.then(start).catch(() => this.failBufferMix());
            return;
        }
        start();
    }

    destroy() {
        this.removeActivationListeners();
        this.listeners.clear();
        this.pendingPlays = [];
        this.pendingAfterDecode = [];
        this.flushingPlays = false;
        this.bufferMix = false;
        this.liveSources.forEach((source) => {
            try {
                source.stop();
            } catch {
                // Already stopped with the context.
            }
            source.disconnect();
        });
        this.liveSources.clear();
        this.context?.close?.();
        this.context = null;
        this.master = null;
        this.limiter = null;
        const stopVoice = (voice) => {
            if (voice.busyTimer) {
                clearTimeout(voice.busyTimer);
            }
            voice.sound.pause();
        };
        this.voices.splice(0).forEach(stopVoice);
        this.pitchedVoices.splice(0).forEach(stopVoice);
        this.template?.pause();
        this.pitchedTemplate?.pause();
        this.template = null;
        this.pitchedTemplate = null;
    }
}

export const createSplitFlapAudio = (source) => new SplitFlapAudio(source);
