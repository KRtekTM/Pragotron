import { createSlaveClock } from '../src/platform/slave-clock.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

let real = 1_700_000_000_000;
let master = new Date(2026, 9, 14, 8, 15, 10, 0);
let pace = 1;
let enabled = true;

const slave = createSlaveClock({
    hasSourceClock: () => enabled,
    sourceNow: () => new Date(master.getTime()),
    sourcePace: () => pace,
    realNow: () => real
});

const shown = () => slave.now();
let face = shown();
assert(face.getHours() === 8 && face.getMinutes() === 15, 'první impuls nastaví minutu');
assert(face.getSeconds() === 10, 'vteřiny na začátku navážou na čas zdroje');

real += 5_000;
face = shown();
assert(face.getMinutes() === 15 && face.getSeconds() === 15, 'vteřiny si hodiny posouvají samy');

real += 44_000;
face = shown();
assert(face.getMinutes() === 15 && face.getSeconds() === 59, 'na 59. vteřině se čeká');
real += 5_000;
face = shown();
assert(
    face.getMinutes() === 15 && face.getSeconds() === 59,
    'bez impulsu se minuta nepřesmekne'
);

master = new Date(2026, 9, 14, 8, 16, 3, 0);
face = shown();
assert(face.getMinutes() === 16 && face.getSeconds() === 0, 'impuls po čekání spustí další minutu');

real += 20_000;
face = shown();
assert(face.getSeconds() === 20, 'po impulsu zase běží vlastní vteřiny');
master = new Date(2026, 9, 14, 8, 17, 0, 0);
face = shown();
assert(
    face.getMinutes() === 17 && face.getSeconds() === 20,
    'dřívější impuls přesmykne minutu hned'
);

pace = 60;
face = shown();
assert(face.getSeconds() === 20, 'změna rychlosti neskáče vteřinami');
real += 500;
face = shown();
assert(face.getMinutes() === 17 && face.getSeconds() === 50, 'zrychlení 60 zrychlí i vlastní vteřiny');

master = new Date(2026, 9, 14, 12, 0, 5, 0);
face = shown();
assert(
    face.getHours() === 12
        && face.getMinutes() === 0
        && face.getSeconds() === 5,
    'skok času nastaví novou minutu'
);

pace = 0;
const frozen = shown().getSeconds();
real += 10_000;
face = shown();
assert(face.getSeconds() === frozen && face.getMinutes() === 0, 'zastavený čas drží vteřiny');

enabled = false;
face = shown();
assert(Math.abs(face.getTime() - Date.now()) < 1000, 'bez zdroje jedou hodiny počítače');

console.log('ok');
