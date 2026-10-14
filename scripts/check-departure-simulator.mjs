import { normalizeScraperSchema } from '../src/platform/live-departures.js';
import {
    departureSimulatorSchema,
    resetSimulatorClock,
    simulateDepartures
} from './departure-simulator.mjs';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const at = (iso) => new Date(iso);
const now = at('2026-10-14T02:56:00+02:00');
const base = {
    count: '12',
    spacing: '5',
    pace: '1',
    keep: '8',
    seed: 'brno',
    delay: 'mixed',
    via: 'some',
    place: 'full'
};

const schema = normalizeScraperSchema(departureSimulatorSchema());
assert(schema?.id === 'departure-simulator', 'schéma simulátoru se má načíst');
assert(schema.controls.watch === false, 'simulátor nemá vyžadovat sledování');
assert(schema.parameters.length === 9, 'simulátor má devět parametrů');
assert(
    schema.parameters.every((parameter) => parameter.id !== 'interval'),
    'interval zůstává správci'
);

const first = simulateDepartures(base, now);
const again = simulateDepartures(base, now);
assert(first.departures.length === 12, 'počet odjezdů');
assert(first.station === 'Simulátor', 'název zdroje');
assert(
    JSON.stringify(first.departures) === JSON.stringify(again.departures),
    'stejný čas a semeno drží stejné odjezdy'
);

const keys = new Set(first.departures.map((departure) => departure.liveKey));
assert(keys.size === first.departures.length, 'každý odjezd má vlastní klíč');
assert(
    first.departures.every((departure) =>
        departure.target.platform
        && departure.target.track === departure.target.platform
        && departure.stations[0]
    ),
    'plné umístění má nástupiště, stejnou kolej a cíl'
);
assert(
    first.departures.some((departure) => departure.stations[1] === '')
        && first.departures.some((departure) => departure.stations[1] !== ''),
    'občasné Přes je někdy prázdné'
);

const emptyVia = simulateDepartures({ ...base, via: 'none' }, now);
assert(
    emptyVia.departures.every((departure) => departure.stations[1] === ''),
    'režim nikdy nenechá Přes vyplněné'
);

const blank = simulateDepartures({ ...base, place: 'blank' }, now);
assert(
    blank.departures.every((departure) =>
        !departure.target.platform && !departure.target.track
    ),
    'bez umístění není nástupiště ani kolej'
);

const noDelay = simulateDepartures({ ...base, delay: 'none' }, now);
assert(
    noDelay.departures.every((departure) => departure.delay === 0),
    'režim bez zpoždění'
);

const later = simulateDepartures(base, at('2026-10-14T03:02:00+02:00'));
const firstKeys = first.departures.map((departure) => departure.liveKey);
const laterKeys = later.departures.map((departure) => departure.liveKey);
assert(
    firstKeys[0] !== laterKeys[0] && laterKeys.includes(firstKeys[1]),
    'po rozestupu nejstarší odjezd odpadne a další zůstanou'
);

const slow = simulateDepartures(
    { ...base, delay: 'growing', pace: '1', spacing: '5' },
    now
);
const grown = simulateDepartures(
    { ...base, delay: 'growing', pace: '1', spacing: '5' },
    at('2026-10-14T02:57:00+02:00')
);
const shared = slow.departures.filter((departure) =>
    grown.departures.some((item) => item.liveKey === departure.liveKey)
);
assert(shared.length > 0, 'za minutu část vlaků zůstane');
assert(
    shared.some((departure) => {
        const next = grown.departures.find((item) =>
            item.liveKey === departure.liveKey
        );
        return next.delay !== departure.delay;
    }),
    'rostoucí zpoždění se za minutu změní'
);

resetSimulatorClock();
const fast = simulateDepartures({ ...base, pace: '6', count: '4' }, now);
assert(fast.departures.length === 4, 'zrychlený režim drží počet');
const fastLater = simulateDepartures(
    { ...base, pace: '6', count: '4' },
    at('2026-10-14T02:57:00+02:00')
);
assert(
    fast.departures[0].liveKey !== fastLater.departures[0].liveKey,
    'zrychlení vymění odjezd dřív než skutečný rozestup'
);
assert(fast.clock?.pace === 6, 'zrychlený režim posílá čas');

resetSimulatorClock();
const setClock = simulateDepartures(
    { ...base, time: '08:00', pace: '0', count: '3' },
    now
);
const heldClock = simulateDepartures(
    { ...base, time: '08:00', pace: '0', count: '3' },
    at('2026-10-14T04:00:00+02:00')
);
assert(setClock.clock, 'nastavený čas je v odpovědi');
assert(
    new Date(setClock.clock.time).getHours() === 8
        && new Date(setClock.clock.time).getMinutes() === 0,
    'čas 08:00 nastaví hodiny'
);
assert(
    setClock.clock.time === heldClock.clock.time,
    'zastavený čas se mezi dotazy nehne'
);
assert(
    setClock.departures[0].departureTime.hours >= 7,
    'odjezdy se staví kolem nastaveného času'
);

resetSimulatorClock();
const started = simulateDepartures(
    { ...base, time: '08:00', pace: '60', count: '2' },
    now
);
const moved = simulateDepartures(
    { ...base, time: '08:00', pace: '60', count: '2' },
    new Date(now.getTime() + 1000)
);
assert(
    Date.parse(moved.clock.time) - Date.parse(started.clock.time) === 60_000,
    'zrychlení 60 posune minutu za jednu sekundu'
);

console.log('ok');
