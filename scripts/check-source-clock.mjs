import {
    hasSourceClock,
    setSourceClock,
    sourceDelay,
    sourceNow,
    sourcePace
} from '../src/platform/source-clock.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const wait = (milliseconds) => new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
});

setSourceClock(null);
assert(!hasSourceClock(), 'bez času ze zdroje jedou hodiny počítače');
assert(Math.abs(sourceNow().getTime() - Date.now()) < 50, 'výchozí čas je teď');
assert(sourcePace() === 1, 'výchozí rychlost je skutečná');

const frozenAt = '2026-10-14T06:00:00.000Z';
assert(setSourceClock({ time: frozenAt, pace: 0 }), 'nastavení času se oznámí');
assert(hasSourceClock(), 'čas ze zdroje je zapnutý');
assert(sourcePace() === 0, 'nulová rychlost se podrží');
const frozen = sourceNow().getTime();
await wait(40);
assert(sourceNow().getTime() === frozen, 'zastavený čas se nehne');
assert(
    sourceDelay(frozen + 60_000) === null,
    'zastavené hodiny budoucí okamžik nedoženou'
);
assert(sourceDelay(frozen - 1000) === 0, 'minulý okamžik čekání nemá');

const started = Date.now() - 120_000;
assert(
    setSourceClock({ time: new Date(started).toISOString(), pace: 60 }),
    'změna rychlosti se oznámí'
);
const before = sourceNow().getTime();
await wait(50);
const advanced = sourceNow().getTime() - before;
assert(
    advanced > 1500 && advanced < 9000,
    'zrychlení 60 posune minutu za sekundu'
);
const ahead = sourceNow().getTime() + 60_000;
const waitMs = sourceDelay(ahead);
assert(
    waitMs > 800 && waitMs < 1200,
    'čekání se přepočte na skutečné milisekundy'
);

const quiet = sourceNow().toISOString();
assert(
    setSourceClock({ time: quiet, pace: 60 }) === false,
    'stejný snímek hodiny nepřeklápí'
);

assert(setSourceClock(null), 'vypnutí času ze zdroje se oznámí');
assert(!hasSourceClock(), 'po vypnutí zase běží čas počítače');
assert(setSourceClock(null) === false, 'druhé vypnutí už nic nemění');

console.log('ok');
