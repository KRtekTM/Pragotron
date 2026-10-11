import { readFileSync } from 'node:fs';
import { SplitFlapAudio, stretchPreservePitch } from '../src/platform/audio.js';

const readWav = (fileName) => {
    const bytes = readFileSync(fileName);
    let offset = 12;
    let dataOffset = 0;
    let dataSize = 0;
    while (offset + 8 <= bytes.length) {
        const id = bytes.toString('ascii', offset, offset + 4);
        const size = bytes.readUInt32LE(offset + 4);
        if (id === 'data') {
            dataOffset = offset + 8;
            dataSize = size;
            break;
        }
        offset += 8 + size + (size % 2);
    }
    const channels = bytes.readUInt16LE(22);
    const sampleRate = bytes.readUInt32LE(24);
    const frames = dataSize / (channels * 2);
    const decoded = Array.from({ length: channels }, () => new Float32Array(frames));
    for (let frame = 0; frame < frames; frame += 1) {
        for (let channel = 0; channel < channels; channel += 1) {
            const sample = bytes.readInt16LE(
                dataOffset + ((frame * channels) + channel) * 2
            );
            decoded[channel][frame] = sample / 32768;
        }
    }
    return { channels: decoded, sampleRate, frames };
};

const peakOf = (channel) => channel.reduce(
    (peak, sample) => Math.max(peak, Math.abs(sample)),
    0
);

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const file = readWav('sounds/split-flap.wav');
const rate = 170 / 190;
const startedAt = performance.now();
const stretched = stretchPreservePitch(file.channels, file.sampleRate, rate);
const stretchMs = performance.now() - startedAt;
const expectedFrames = Math.round(file.frames / rate);
const attackLength = Math.round(file.sampleRate * 0.02);
let attackError = 0;
for (let index = 0; index < attackLength; index += 1) {
    attackError = Math.max(
        attackError,
        Math.abs(file.channels[0][index] - stretched[0][index])
    );
}

const sineLength = Math.round(file.sampleRate * 0.13);
const sine = [new Float32Array(sineLength), new Float32Array(sineLength)];
for (let index = 0; index < sineLength; index += 1) {
    const sample = Math.sin((2 * Math.PI * 440 * index) / file.sampleRate);
    sine[0][index] = sample;
    sine[1][index] = sample * 0.5;
}
const stretchedSine = stretchPreservePitch(sine, file.sampleRate, rate);
const correlationAt = (channel, frequency) => {
    const start = Math.round(file.sampleRate * 0.03);
    let dot = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = start; index < channel.length; index += 1) {
        const sample = channel[index];
        const reference = Math.sin((2 * Math.PI * frequency * index) / file.sampleRate);
        dot += sample * reference;
        energyA += sample * sample;
        energyB += reference * reference;
    }
    return dot / Math.sqrt(energyA * energyB);
};
const keptPitch = correlationAt(stretchedSine[0], 440);
const shiftedPitch = correlationAt(stretchedSine[0], 440 * rate);
let channelDrift = 0;
const compareLength = Math.min(stretched[0].length, stretched[1].length);
for (let index = 0; index < compareLength; index += 8) {
    channelDrift = Math.max(
        channelDrift,
        Math.abs(stretched[0][index] - stretched[1][index])
    );
}
const originalDrift = (() => {
    let drift = 0;
    for (let index = 0; index < file.frames; index += 8) {
        drift = Math.max(
            drift,
            Math.abs(file.channels[0][index] - file.channels[1][index])
        );
    }
    return drift;
})();

assert(Math.abs(stretched[0].length - expectedFrames) <= 2, 'duration');
assert(attackError === 0, 'attack');
assert(Math.abs(peakOf(stretched[0]) - peakOf(file.channels[0])) < 0.0001, 'peak');
assert(keptPitch > 0.9, `pitch ${keptPitch}`);
assert(shiftedPitch < 0.2, `resampled pitch ${shiftedPitch}`);
assert(stretchMs < 40, `stretch time ${stretchMs}`);
assert(channelDrift <= originalDrift + 0.02, 'stereo link');
assert(
    stretchPreservePitch(file.channels, file.sampleRate, 1)[0].length === file.frames,
    'unity rate'
);

const memoryStorage = () => {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
            store.set(key, String(value));
        },
        removeItem: (key) => {
            store.delete(key);
        }
    };
};

const assertVolume = (label, search, stored, expected) => {
    globalThis.sessionStorage = memoryStorage();
    if (stored != null) {
        globalThis.sessionStorage.setItem('pragotron.board.audioVolume.v1', stored);
        globalThis.sessionStorage.setItem('pragotron.board.audioMuted.v1', '1');
    }
    globalThis.location = { search };
    const audio = new SplitFlapAudio();
    const actual = audio.getState().volume;
    const muted = audio.getState().muted;
    const kept = globalThis.sessionStorage.getItem('pragotron.board.audioVolume.v1');
    audio.destroy();
    if (actual !== expected || muted !== false || kept !== null) {
        throw new Error(
            `${label}: expected volume ${expected}, unmuted, storage cleared; `
            + `got ${actual}, muted ${muted}, stored ${kept}`
        );
    }
};

assertVolume('url forces volume', '?volume=40', '80', 40);
assertVolume('url zero is silence', '?volume=0', '80', 0);
assertVolume('url hundred', '?platform=1&volume=100', '15', 100);
assertVolume('out of range uses default', '?volume=150', '80', 100);
assertVolume('blank uses default', '?volume=', '80', 100);
assertVolume('missing uses default', '?rows=12', '25', 100);
assertVolume('missing defaults to 100', '', null, 100);

console.log(JSON.stringify({
    outputMs: (stretched[0].length / file.sampleRate) * 1000,
    attackError,
    peak: peakOf(stretched[0]),
    keptPitch,
    shiftedPitch,
    stretchMs
}));
console.log('ok');
