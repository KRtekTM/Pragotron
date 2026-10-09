import {
    DEPARTURE_PLATFORM_VALUES,
    DEPARTURE_SECTOR_VALUES,
    DEPARTURE_TRACK_VALUES,
    formatStationName,
    resolveCanonicalTrainType
} from './data.js';

export const LIVE_SOURCE_ORIGIN = 'https://provoz.spravazeleznic.cz';
export const LIVE_SOURCE_PATH = '/tabule/Pages/StationTable.aspx';
export const LIVE_STATION_DEFAULTS = Object.freeze({
    name: 'Brno hlavní nádraží',
    key: '455',
    sourceUrl:
        `${LIVE_SOURCE_ORIGIN}${LIVE_SOURCE_PATH}?Key=455`
});

export const LIVE_POLL_INTERVAL_MIN_MS = 30_000;
export const LIVE_POLL_INTERVAL_MAX_MS = 300_000;
export const LIVE_POLL_INTERVAL_STEP_MS = 30_000;
export const LIVE_POLL_INTERVAL_MS = 60_000;

export const normalizeLivePollIntervalMs = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return LIVE_POLL_INTERVAL_MS;
    }

    const clamped = Math.min(
        LIVE_POLL_INTERVAL_MAX_MS,
        Math.max(LIVE_POLL_INTERVAL_MIN_MS, number)
    );
    const steps = Math.round(
        (clamped - LIVE_POLL_INTERVAL_MIN_MS) / LIVE_POLL_INTERVAL_STEP_MS
    );
    return LIVE_POLL_INTERVAL_MIN_MS + (steps * LIVE_POLL_INTERVAL_STEP_MS);
};

export const liveCacheTtlMs = (intervalMs = LIVE_POLL_INTERVAL_MS) => (
    Math.max(5_000, normalizeLivePollIntervalMs(intervalMs) - 10_000)
);
export const LIVE_SERVER_HOST = '127.0.0.1';
export const LIVE_SERVER_DEFAULT_PORT = 4787;
export const LIVE_SERVER_FALLBACK_PORTS = Object.freeze([
    LIVE_SERVER_DEFAULT_PORT,
    5174,
    3847,
    18787
]);

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SOURCE_TRAIN_TYPES = Object.freeze([
    'Mim. Os',
    'Mim. R',
    'ČEDOK',
    'Eurocity',
    'Intercity',
    'SuperCity',
    'NightJet',
    'Nightjet',
    'Ex lôžk.',
    'Ex miest.',
    'EuroNight',
    'railjet',
    'Railjet',
    'regiojet',
    'RegioJet',
    'Ex',
    'rj',
    'RJ',
    'EC',
    'IC',
    'EN',
    'NJ',
    'nj',
    'SC',
    'sc',
    'Os',
    'Sp',
    'R miest.',
    'ROH',
    'R'
]);

const HTML_ENTITIES = Object.freeze({
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
});

const decodeHtml = (value) => String(value ?? '')
    .replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (entity, reference) => {
            const normalized = reference.toLowerCase();
            if (normalized.startsWith('#x')) {
                return String.fromCodePoint(
                    Number.parseInt(normalized.slice(2), 16)
                );
            }
            if (normalized.startsWith('#')) {
                return String.fromCodePoint(
                    Number.parseInt(normalized.slice(1), 10)
                );
            }
            return HTML_ENTITIES[normalized] || entity;
        }
    );

const cleanText = (value) => decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:div|p|li|span|td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractCells = (rowHtml) => [
    ...String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)
].map((match) => match[1]);

const extractDivTexts = (cellHtml) => [
    ...String(cellHtml).matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi)
]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);

const parseClock = (value) => {
    const text = cleanText(value);
    const match = text.match(CLOCK_PATTERN);
    return match
        ? {
            hours: Number(match[1]),
            minutes: Number(match[2])
        }
        : null;
};

const clockToMinutes = (time) =>
    time.hours * 60 + time.minutes;

const calculateDelay = (scheduled, actual) => {
    if (!actual) {
        return 0;
    }

    let delay = clockToMinutes(actual) - clockToMinutes(scheduled);
    if (delay < 0) {
        delay += 24 * 60;
    }

    // A value close to a full day is almost certainly a malformed or stale
    // source value, not a 23-hour delay.
    return delay > 12 * 60 ? 0 : delay;
};

const isTrainTypeBoundary = (value, index) =>
    index >= value.length
    || /\s/.test(value[index])
    || /\d/.test(value[index]);

const findSourceTrainType = (value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
        return '';
    }

    const lower = normalized.toLocaleLowerCase('cs-CZ');
    let matchedLength = 0;
    SOURCE_TRAIN_TYPES.forEach((candidate) => {
        const candidateLower = candidate.toLocaleLowerCase('cs-CZ');
        if (
            lower.startsWith(candidateLower)
            && isTrainTypeBoundary(normalized, candidateLower.length)
            && candidateLower.length > matchedLength
        ) {
            matchedLength = candidateLower.length;
        }
    });

    return matchedLength ? normalized.slice(0, matchedLength) : '';
};

const splitTrainPrimary = (value) => {
    const text = String(value ?? '').trim();
    const match = text.match(/^(.*?)(?:\s*)(\d+)([\s\S]*)$/);
    if (!match) {
        return { prefix: text, remainder: '' };
    }

    return {
        prefix: match[1].trim(),
        remainder: `${match[2]}${match[3]}`.trim()
    };
};

const parseTrainCell = (cellHtml) => {
    const divTexts = extractDivTexts(cellHtml);
    const primary = divTexts[0] || cleanText(cellHtml);
    const split = splitTrainPrimary(primary);
    const listedType = findSourceTrainType(primary)
        || findSourceTrainType(split.prefix);
    const sourceType = listedType || split.prefix;
    const remainder = listedType
        ? primary.slice(listedType.length).trim()
        : split.remainder || primary.slice(sourceType.length).trim();
    const numberMatch = remainder.match(/\d+/);
    const sourceTrainNumber = numberMatch ? numberMatch[0] : '';
    const trainNumber = sourceTrainNumber.slice(-4);
    const operatorFromRemainder = numberMatch
        ? remainder.slice(
            remainder.indexOf(numberMatch[0]) + numberMatch[0].length
        ).trim()
        : remainder.trim();
    const operator = divTexts.slice(1).join(' ').trim()
        || operatorFromRemainder;

    return {
        train: resolveCanonicalTrainType(sourceType, operator),
        trainNumber,
        sourceTrainNumber,
        operator
    };
};

const normalizeCatalogValue = (value, values) => {
    const normalized = cleanText(value)
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized || normalized === '-') {
        return '';
    }

    return values.find((candidate) =>
        candidate.toLocaleLowerCase('cs-CZ')
            === normalized.toLocaleLowerCase('cs-CZ')
    ) || '';
};

const parsePlatformTarget = (cellHtml) => {
    const raw = cleanText(cellHtml).replace(/[–—−]/g, '-');
    const match = raw.match(
        /^([^/]+?)\s*\/\s*([^\s]+)(?:\s+(.+))?$/
    );

    if (!match) {
        return {
            platform: '',
            track: '',
            sector: ''
        };
    }

    return {
        platform: normalizeCatalogValue(match[1], DEPARTURE_PLATFORM_VALUES),
        track: normalizeCatalogValue(match[2], DEPARTURE_TRACK_VALUES),
        sector: normalizeCatalogValue(match[3] || '', DEPARTURE_SECTOR_VALUES)
    };
};

const normalizeStationName = (value) => formatStationName(cleanText(value));

const parseViaStation = (value) => cleanText(value)
    .split(/\s*[—–]\s*/)
    .map((station) => normalizeStationName(station))
    .find(Boolean)
    || '';

const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildLiveKey = ({
    dateKey,
    stationKey,
    sourceTrainNumber,
    trainNumber,
    departureTime,
    stations,
    train,
    operator
}) => [
    dateKey,
    `station-${stationKey || LIVE_STATION_DEFAULTS.key}`,
    sourceTrainNumber || trainNumber
        ? `train-${sourceTrainNumber || trainNumber}`
        : [
            'fallback',
            departureTime.hours,
            departureTime.minutes,
            train,
            operator,
            stations[0],
            stations[1]
        ].join('|')
].join(':');

export const parseLiveSourceUrl = (value) => {
    const text = String(value ?? '').trim();
    if (!text) {
        return {
            sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
            key: LIVE_STATION_DEFAULTS.key,
            valid: true
        };
    }

    try {
        const url = new URL(text);
        const hostMatches = url.hostname.toLowerCase()
            === 'provoz.spravazeleznic.cz';
        const pathMatches = url.pathname.replace(/\/+$/, '').toLowerCase()
            === LIVE_SOURCE_PATH.toLowerCase();
        const key = (
            url.searchParams.get('Key')
            || url.searchParams.get('key')
            || ''
        ).trim();
        if (!hostMatches || !pathMatches || !/^[A-Za-z0-9]+$/.test(key)) {
            return {
                sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
                key: LIVE_STATION_DEFAULTS.key,
                valid: false
            };
        }

        const normalized = new URL(`${LIVE_SOURCE_ORIGIN}${LIVE_SOURCE_PATH}`);
        normalized.searchParams.set('Key', key);
        return {
            sourceUrl: normalized.toString(),
            key,
            valid: true
        };
    } catch {
        return {
            sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
            key: LIVE_STATION_DEFAULTS.key,
            valid: false
        };
    }
};

export const normalizeLiveSourceUrl = (value) =>
    parseLiveSourceUrl(value).sourceUrl;

export const isAllowedLiveSourceUrl = (value) =>
    parseLiveSourceUrl(value).valid;

export const extractStationName = (html) => {
    const match = String(html ?? '').match(
        /id="[^"]*LStationName[^"]*"[^>]*>([^<]*)/i
    );
    return cleanText(match?.[1] || '');
};

export const parseStationTable = (
    html,
    {
        now = new Date(),
        stationKey = LIVE_STATION_DEFAULTS.key
    } = {}
) => {
    const source = String(html ?? '');
    const table = source.match(
        /<table\b[^>]*DXMainTable[^>]*>([\s\S]*?)<\/table>/i
    )?.[1] || source;
    const dateKey = getLocalDateKey(now);
    const departures = [];
    const seenKeys = new Set();

    for (const rowMatch of table.matchAll(
        /<tr\b[^>]*DXDataRow\d+[^>]*>([\s\S]*?)<\/tr>/gi
    )) {
        const rowHtml = rowMatch[0];
        if (/\btableTextRow\b/i.test(rowHtml)) {
            continue;
        }

        const cells = extractCells(rowMatch[1]);
        if (cells.length < 10) {
            continue;
        }

        const departureTime = parseClock(cells[0]);
        if (!departureTime) {
            continue;
        }

        const actualTime = parseClock(cells[1]);
        const trainData = parseTrainCell(cells[3]);
        const stations = [
            normalizeStationName(cells[6]),
            parseViaStation(cells[7])
        ];
        const target = parsePlatformTarget(cells[9]);
        const liveKey = buildLiveKey({
            dateKey,
            stationKey,
            sourceTrainNumber: trainData.sourceTrainNumber,
            trainNumber: trainData.trainNumber,
            departureTime,
            stations,
            train: trainData.train,
            operator: trainData.operator
        });

        if (seenKeys.has(liveKey)) {
            continue;
        }
        seenKeys.add(liveKey);

        departures.push({
            id: `live:${liveKey}`,
            liveKey,
            source: 'live',
            liveStationKey: stationKey,
            dateKey,
            stations,
            train: trainData.train,
            trainNumber: trainData.trainNumber,
            sourceTrainNumber: trainData.sourceTrainNumber,
            operator: trainData.operator,
            delay: calculateDelay(departureTime, actualTime),
            departureTime,
            target
        });
    }

    return departures;
};

const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const getErrorText = (error) => {
    if (!error) {
        return '';
    }
    const cause = error.cause ? getErrorText(error.cause) : '';
    return `${error.code || ''} ${error.message || error} ${cause}`.trim();
};

export const describeLiveNetworkError = (error) => {
    const text = getErrorText(error).toLowerCase();
    if (
        text.includes('enobufs')
        || text.includes('no_buffer_space')
        || text.includes('no buffer space')
        || text.includes('err_no_buffer_space')
    ) {
        return 'Windows nemá volné síťové buffery (ERR_NO_BUFFER_SPACE). '
            + 'Otevřete manage přes http://127.0.0.1:4787/platformTableManage.html, '
            + 'ne přes localhost. Když to přetrvá, vypněte VPN/WSL a zkuste to znovu.';
    }
    if (text.includes('eacces')) {
        return 'Port scraperu je na Windows zakázaný. Spusťte server znovu, '
            + 'případně nastavte PORT na volný port.';
    }
    if (text.includes('failed to fetch') || text.includes('networkerror')) {
        return 'Nepodařilo se spojit se scraperem na 127.0.0.1. '
            + 'Ověřte, že běží npm run serve a že v adrese není localhost, ale 127.0.0.1.';
    }
    return error instanceof Error
        ? error.message
        : 'Live odjezdy se nepodařilo načíst.';
};

export const normalizeLiveApiUrl = (value) => {
    const fallback = `http://127.0.0.1:${LIVE_SERVER_DEFAULT_PORT}/api/live-departures`;
    const text = String(value ?? '').trim();
    if (!text) {
        return fallback;
    }

    try {
        const url = new URL(text, 'http://127.0.0.1');
        if (url.hostname === 'localhost' || url.hostname === '[::1]') {
            url.hostname = '127.0.0.1';
        }
        if (!url.pathname || url.pathname === '/') {
            url.pathname = '/api/live-departures';
        }
        return url.toString().replace(/\/$/, '');
    } catch {
        return fallback;
    }
};

export const fetchStationTable = async ({
    url = LIVE_STATION_DEFAULTS.sourceUrl,
    fetchImpl = globalThis.fetch,
    now = new Date(),
    attempts = 3
} = {}) => {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Pro live scraper není dostupná funkce fetch.');
    }

    let lastError = null;
    for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
        try {
            const response = await fetchImpl(url, {
                cache: 'no-store',
                headers: {
                    Accept: 'text/html,application/xhtml+xml',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PragotronLiveDepartures/1.0'
                }
            });
            if (!response.ok) {
                throw new Error(`Zdrojová tabule vrátila HTTP ${response.status}.`);
            }

            const html = await response.text();
            const source = parseLiveSourceUrl(url);
            const station = extractStationName(html);
            return {
                station: station
                    || (
                        source.key === LIVE_STATION_DEFAULTS.key
                            ? LIVE_STATION_DEFAULTS.name
                            : ''
                    ),
                stationKey: source.key,
                sourceUrl: source.sourceUrl,
                fetchedAt: new Date().toISOString(),
                departures: parseStationTable(html, {
                    now,
                    stationKey: source.key
                })
            };
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                await wait(400 * attempt);
            }
        }
    }

    throw new Error(describeLiveNetworkError(lastError));
};

export const getDefaultLiveApiUrl = (
    location = globalThis.location
) => {
    const fallback = `http://127.0.0.1:${LIVE_SERVER_DEFAULT_PORT}/api/live-departures`;
    if (!location || location.protocol === 'file:') {
        return fallback;
    }

    if (location.protocol === 'http:' || location.protocol === 'https:') {
        const hostname = location.hostname;
        const isLoopback = hostname === '127.0.0.1'
            || hostname === 'localhost'
            || hostname === '[::1]'
            || hostname === '::1';
        const port = Number(location.port)
            || (location.protocol === 'https:' ? 443 : 80);
        if (isLoopback) {
            if (!new Set(LIVE_SERVER_FALLBACK_PORTS).has(port)) {
                return fallback;
            }
            return `http://127.0.0.1:${port}/api/live-departures`;
        }

        return `${location.origin}/api/live-departures`;
    }

    return fallback;
};

export const fetchLiveDepartures = async ({
    apiUrl = getDefaultLiveApiUrl(),
    sourceUrl = normalizeLiveSourceUrl(LIVE_STATION_DEFAULTS.sourceUrl),
    pollIntervalMs = LIVE_POLL_INTERVAL_MS,
    fetchImpl = globalThis.fetch,
    attempts = 3
} = {}) => {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Pro live odjezdy není dostupná funkce fetch.');
    }

    const endpoint = new URL(
        normalizeLiveApiUrl(apiUrl),
        globalThis.location?.href
    );
    endpoint.searchParams.set(
        'source',
        normalizeLiveSourceUrl(sourceUrl)
    );
    endpoint.searchParams.set(
        'interval',
        String(normalizeLivePollIntervalMs(pollIntervalMs))
    );

    let lastError = null;
    for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
        try {
            const response = await fetchImpl(endpoint, {
                cache: 'no-store',
                headers: {
                    Accept: 'application/json'
                }
            });
            if (!response.ok) {
                let details = `Live scraper vrátil HTTP ${response.status}.`;
                try {
                    const failed = await response.json();
                    if (failed?.error) {
                        details = String(failed.error);
                    }
                } catch {
                    // The error body is optional; keep the HTTP status.
                }
                throw new Error(details);
            }

            const payload = await response.json();
            if (!Array.isArray(payload.departures)) {
                throw new Error('Live scraper vrátil neplatná data odjezdů.');
            }

            return payload;
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                await wait(400 * attempt);
            }
        }
    }

    throw new Error(describeLiveNetworkError(lastError));
};
