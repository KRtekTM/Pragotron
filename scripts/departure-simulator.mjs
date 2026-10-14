import brnoHlavniNadrazi from '../stanice/brno-hlavni-nadrazi.json' with { type: 'json' };
import { formatStationName } from '../src/platform/data.js';

export const DEPARTURE_SIMULATOR_PATH = '/api/departure-simulator';

const DESTINATIONS = Object.freeze([
    'Praha',
    'Břeclav',
    'Přerov',
    'Olomouc',
    'Česká Třebová',
    'Bratislava',
    'Vídeň',
    'Havlíčkův Brod',
    'Jihlava',
    'Znojmo',
    'Šumperk',
    'Letovice',
    'Vyškov na Moravě',
    'Blansko',
    'Tišnov',
    'Pardubice',
    'Hradec Králové',
    'České Budějovice'
]);

const VIAS = Object.freeze([
    'Pardubice',
    'Česká Třebová',
    'Kolín',
    'Brno-Židenice',
    'Blansko',
    'Vyškov na Moravě',
    'Český Brod'
]);

const TRAINS = Object.freeze([
    { train: 'Os', operator: 'ČD' },
    { train: 'R', operator: 'ČD' },
    { train: 'Sp', operator: 'ČD' },
    { train: 'Ex', operator: 'ČD' },
    { train: 'rj', operator: 'ČD' },
    { train: 'Intercity', operator: 'ČD' },
    { train: 'Eurocity', operator: 'ČD' },
    { train: 'EuroNight', operator: 'ČD' },
    { train: 'nj', operator: 'ČD' },
    { train: 'SuperCity', operator: 'ČD' },
    { train: 'RJ', operator: 'RJET' }
]);

const STEADY_DELAYS = Object.freeze([0, 5, 10, 15, 20]);

const clampInt = (value, min, max, fallback) => {
    const number = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(number)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, number));
};

const oneOf = (value, allowed, fallback) => (
    allowed.includes(value) ? value : fallback
);

const hashString = (value) => {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

let clockAnchor = null;

const parseTimeSetting = (value, realNow) => {
    const text = String(value ?? '').trim();
    const clock = text.match(/^(\d{1,2}):(\d{2})$/);
    if (clock) {
        const hours = Number(clock[1]);
        const minutes = Number(clock[2]);
        if (hours > 23 || minutes > 59) {
            return null;
        }
        const date = new Date(realNow.getTime());
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
    }

    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
};

export const resetSimulatorClock = () => {
    clockAnchor = null;
};

const resolveSimulatorClock = (options, realNow) => {
    const realMs = realNow.getTime();
    const setMs = options.time ? parseTimeSetting(options.time, realNow) : null;
    const controlled = setMs !== null || options.pace !== 1;
    if (!controlled) {
        clockAnchor = null;
        return {
            now: realNow,
            pace: 1,
            controlled: false
        };
    }

    const timeKey = setMs === null ? '' : options.time;
    if (!clockAnchor || clockAnchor.timeKey !== timeKey) {
        clockAnchor = {
            timeKey,
            simulatedMs: setMs === null ? realMs : setMs,
            realMs,
            pace: options.pace
        };
    } else if (clockAnchor.pace !== options.pace) {
        const current = clockAnchor.simulatedMs
            + ((realMs - clockAnchor.realMs) * clockAnchor.pace);
        clockAnchor = {
            timeKey,
            simulatedMs: current,
            realMs,
            pace: options.pace
        };
    }

    return {
        now: new Date(
            clockAnchor.simulatedMs
            + ((realMs - clockAnchor.realMs) * clockAnchor.pace)
        ),
        pace: options.pace,
        controlled: true
    };
};

const localDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const readOptions = (query = {}) => ({
    count: clampInt(query.count, 1, 24, 12),
    spacing: clampInt(query.spacing, 1, 20, 5),
    pace: clampInt(query.pace, 0, 60, 1),
    keep: clampInt(query.keep, 0, 10, 8),
    time: String(query.time ?? '').trim().slice(0, 40),
    seed: String(query.seed ?? 'brno').trim().slice(0, 40) || 'brno',
    delay: oneOf(query.delay, ['none', 'steady', 'growing', 'mixed'], 'mixed'),
    via: oneOf(query.via, ['none', 'some', 'all'], 'some'),
    place: oneOf(query.place, ['full', 'open', 'mixed', 'blank'], 'full')
});

const delayFor = (mode, index, nowMs) => {
    if (mode === 'none') {
        return 0;
    }
    const steady = STEADY_DELAYS[index % STEADY_DELAYS.length];
    const growing = Math.min(
        30,
        (index % 3) * 5 + (Math.floor(nowMs / 60_000) % 5) * 5
    );
    if (mode === 'steady') {
        return steady;
    }
    if (mode === 'growing') {
        return growing;
    }
    const kind = index % 4;
    if (kind === 0) {
        return 0;
    }
    if (kind === 1) {
        return growing;
    }
    return steady;
};

const targetFor = (place, index) => {
    const platforms = brnoHlavniNadrazi.platforms;
    const empty = { platform: '', track: '', sector: '' };
    if (place === 'blank' || (place === 'mixed' && index % 4 === 0)) {
        return empty;
    }

    const platform = platforms[Math.abs(index) % platforms.length];
    const sector = place === 'open'
        ? ''
        : index % 3 === 0
            ? brnoHlavniNadrazi.sectorRanges[
                Math.abs(index) % brnoHlavniNadrazi.sectorRanges.length
            ]
            : brnoHlavniNadrazi.sectors[
                Math.abs(index) % brnoHlavniNadrazi.sectors.length
            ];
    return {
        platform,
        track: platform,
        sector
    };
};

const stationPair = (seed, index, viaMode) => {
    const destination = DESTINATIONS[
        hashString(`${seed}:dest:${index}`) % DESTINATIONS.length
    ];
    const showVia = viaMode === 'all'
        || (viaMode === 'some' && index % 2 === 0);
    if (!showVia) {
        return [formatStationName(destination), ''];
    }

    let via = VIAS[hashString(`${seed}:via:${index}`) % VIAS.length];
    if (via === destination) {
        via = VIAS[(VIAS.indexOf(via) + 1) % VIAS.length];
    }
    return [formatStationName(destination), formatStationName(via)];
};

export const departureSimulatorSchema = () => ({
    id: 'departure-simulator',
    name: 'Simulátor odjezdů',
    description: 'Stabilní zkušební jízdní řád kolem aktuálního času. '
        + 'Nečte tabuli Správy železnic.',
    controls: {
        watch: false,
        stop: false
    },
    parameters: [
        {
            id: 'count',
            label: 'Počet odjezdů',
            type: 'number',
            min: 1,
            max: 24,
            step: 1,
            default: '12',
            help: 'Kolik odjezdů se vrátí, od 1 do 24.'
        },
        {
            id: 'spacing',
            label: 'Rozestup',
            type: 'number',
            min: 1,
            max: 20,
            step: 1,
            default: '5',
            help: 'Minuty simulovaného času mezi pravidelnými odjezdy.'
        },
        {
            id: 'time',
            label: 'Čas',
            type: 'text',
            default: '',
            placeholder: 'HH:MM',
            help: 'Prázdné pole nechá čas počítače. HH:MM hodiny nastaví '
                + 'a stejná hodnota je pak nechá běžet dál.'
        },
        {
            id: 'pace',
            label: 'Zrychlení',
            type: 'number',
            min: 0,
            max: 60,
            step: 1,
            default: '1',
            help: 'Jak rychle běží čas. 1 je skutečná rychlost, 0 čas zastaví, '
                + '60 je jedna simulovaná minuta za sekundu.'
        },
        {
            id: 'keep',
            label: 'Držet po odjezdu',
            type: 'number',
            min: 0,
            max: 10,
            step: 1,
            default: '8',
            help: 'Minuty, po které vlak po pravidelném odjezdu zůstane. '
                + 'Nejvýše 10, pak by ho tabule řadila na další den.'
        },
        {
            id: 'seed',
            label: 'Semeno',
            type: 'text',
            default: 'brno',
            help: 'Stejné semeno drží čísla, cíle a typy. Jiná hodnota '
                + 'sestavu přestaví.'
        },
        {
            id: 'delay',
            label: 'Zpoždění',
            type: 'select',
            default: 'mixed',
            options: [
                { value: 'none', label: 'Žádné' },
                { value: 'steady', label: 'Stálé' },
                { value: 'growing', label: 'Rostoucí' },
                { value: 'mixed', label: 'Smíšené' }
            ],
            help: 'Rostoucí se mění každou minutu, aby bylo na flapu vidět pohyb.'
        },
        {
            id: 'via',
            label: 'Přes',
            type: 'select',
            default: 'some',
            options: [
                { value: 'some', label: 'Občas' },
                { value: 'all', label: 'Vždy' },
                { value: 'none', label: 'Nikdy' }
            ],
            help: 'Nikdy nechá sloupec Přes prázdný.'
        },
        {
            id: 'place',
            label: 'Umístění',
            type: 'select',
            default: 'full',
            options: [
                { value: 'full', label: 'Nástupiště, kolej i sektor' },
                { value: 'open', label: 'Celá kolej' },
                { value: 'mixed', label: 'Část bez nástupiště' },
                { value: 'blank', label: 'Bez umístění' }
            ],
            help: 'Nástupiště 1–6 a stejné číslo koleje. Bez nástupiště '
                + 'odjezd zůstane jen na odjezdové tabuli.'
        }
    ]
});

export const simulateDepartures = (query = {}, now = new Date()) => {
    const options = readOptions(query);
    const clock = resolveSimulatorClock(options, now);
    const spacingMs = options.spacing * 60_000;
    const keepMs = options.keep * 60_000;
    const nowMs = clock.now.getTime();
    const firstIndex = Math.ceil((nowMs - keepMs) / spacingMs);
    const usedNumbers = new Set();
    const departures = [];

    for (let offset = 0; offset < options.count; offset += 1) {
        const index = firstIndex + offset;
        const scheduledMs = index * spacingMs;
        const scheduled = new Date(scheduledMs);
        const train = TRAINS[
            hashString(`${options.seed}:train:${index}`) % TRAINS.length
        ];
        let number = 1000 + (
            hashString(`${options.seed}:num:${index}`) % 9000
        );
        while (usedNumbers.has(number)) {
            number = 1000 + ((number - 999) % 9000);
        }
        usedNumbers.add(number);
        const trainNumber = String(number);
        const liveKey = `sim:${options.seed}:${index}`;
        departures.push({
            id: `live:${liveKey}`,
            liveKey,
            source: 'live',
            liveStationKey: 'sim',
            dateKey: localDateKey(scheduled),
            stations: stationPair(options.seed, index, options.via),
            train: train.train,
            trainNumber,
            sourceTrainNumber: trainNumber,
            operator: train.operator,
            delay: delayFor(options.delay, index, nowMs),
            departureTime: {
                hours: scheduled.getHours(),
                minutes: scheduled.getMinutes()
            },
            target: targetFor(options.place, index)
        });
    }

    const payload = {
        station: 'Simulátor',
        fetchedAt: now.toISOString(),
        simulator: options,
        departures
    };
    if (clock.controlled) {
        payload.clock = {
            time: clock.now.toISOString(),
            pace: clock.pace
        };
    }
    return payload;
};
