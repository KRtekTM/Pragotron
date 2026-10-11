export const STATION_CHARACTER_COUNT = 14;

export const STATION_FLAP_SEQUENCE = Object.freeze([
    ' ',
    '.', '-', '/',
    'A', 'Á', 'Ä', 'B', 'C', 'Č', 'D', 'Ď', 'E', 'É', 'Ě', 'Ë',
    'F', 'G', 'H', 'I', 'Í', 'Ï', 'J', 'K', 'L', 'Ľ', 'M', 'N', 'Ň',
    'O', 'Ó', 'Ö', 'P', 'Q', 'R', 'Ř', 'Ŕ', 'S', 'Š', 'T', 'Ť',
    'U', 'Ú', 'Ů', 'Ü', 'V', 'W', 'X', 'Y', 'Ý', 'Ÿ', 'Z', 'Ž',
    ',', ':', ';', '+', '(', ')', '[', ']',
    '!', '?', '%', '&', '#', "'",
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
]);

const STATION_NAME_VOWELS = Object.freeze(new Set([
    'A', 'Á', 'Ä', 'E', 'É', 'Ě', 'Ë', 'I', 'Í', 'Ï',
    'O', 'Ó', 'Ö', 'U', 'Ú', 'Ů', 'Ü', 'Y', 'Ý', 'Ÿ'
]));

const stationNameChars = (value) => Array.from(String(value ?? ''));

const stationNameLength = (value) => stationNameChars(value).length;

const sliceStationName = (value, start, end) =>
    stationNameChars(value).slice(start, end).join('');

const abbreviateStationConnectors = (value) => {
    const words = String(value).split(' ').filter(Boolean);
    const result = [];

    for (let index = 0; index < words.length; index += 1) {
        if (words[index] === 'NAD' && words[index + 1]) {
            result.push(`N/${words[index + 1]}`);
            index += 1;
            continue;
        }
        result.push(words[index]);
    }

    return result.join(' ');
};

const fillStationName = (value, width) => {
    const words = String(value).split(' ').filter(Boolean);
    let result = '';

    for (const word of words) {
        if (!result) {
            result = stationNameLength(word) <= width
                ? word
                : sliceStationName(word, 0, width);
            continue;
        }

        const remaining = width - stationNameLength(result);
        const next = ` ${word}`;
        if (stationNameLength(next) <= remaining) {
            result += next;
            continue;
        }
        if (remaining <= 1) {
            break;
        }

        result += ` ${sliceStationName(word, 0, remaining - 1)}`;
        break;
    }

    return result.replace(/ +$/g, '');
};

const stripTrailingVowels = (value) => {
    const chars = stationNameChars(value);
    while (chars.length > 1 && STATION_NAME_VOWELS.has(chars[chars.length - 1])) {
        chars.pop();
    }
    return chars.join('');
};

const nextKeptLetter = (value) => {
    for (const character of stationNameChars(value)) {
        if (character !== ' ' && character !== '.') {
            return character;
        }
    }
    return '';
};

export const formatStationName = (
    value,
    {
        maxLength = STATION_CHARACTER_COUNT,
        sequence = STATION_FLAP_SEQUENCE
    } = {}
) => {
    const cleaned = stationNameChars(
        String(value ?? '')
            .replace(/[–—−]/g, '-')
            .toLocaleUpperCase('cs-CZ')
    )
        .map((character) => (sequence.includes(character) ? character : ' '))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned || maxLength <= 0) {
        return '';
    }

    const abbreviated = abbreviateStationConnectors(cleaned);
    if (stationNameLength(abbreviated) <= maxLength) {
        return abbreviated;
    }

    if (maxLength === 1) {
        return '.';
    }

    const filled = fillStationName(abbreviated, maxLength - 1);
    const remaining = sliceStationName(abbreviated, stationNameLength(filled));

    if (filled.endsWith('.')) {
        const extra = nextKeptLetter(remaining);
        const combined = `${filled}${extra}`;
        return stationNameLength(combined) <= maxLength
            ? combined
            : sliceStationName(combined, 0, maxLength);
    }

    return `${stripTrailingVowels(filled)}.`;
};

export const STATION_FLIP_DURATION = 190;
export const FLAP_TIMING_VARIATION_MS = 0;

export const FLAP_TIMING_DURATION_MIN = 50;
export const FLAP_TIMING_DURATION_MAX = 500;
export const FLAP_TIMING_VARIATION_MIN = 0;
export const FLAP_TIMING_VARIATION_MAX = 10;
export const FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: STATION_FLIP_DURATION,
    variation: FLAP_TIMING_VARIATION_MS
});

export const DEPARTURE_FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: 100,
    variation: FLAP_TIMING_VARIATION_MS
});

export const PLATFORM_FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: 130,
    variation: FLAP_TIMING_VARIATION_MS
});

export const DEPARTURE_BOARD_ROW_COUNT_DEFAULT = 12;
export const DEPARTURE_BOARD_ROW_COUNT_MIN = 1;
export const DEPARTURE_BOARD_ROW_COUNT_MAX = 24;

export const normalizeDepartureBoardRowCount = (value) => clampInteger(
    value,
    DEPARTURE_BOARD_ROW_COUNT_MIN,
    DEPARTURE_BOARD_ROW_COUNT_MAX,
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT
);

export const DEPARTURE_BOARD_LOGO_CUSTOM_ID = 'custom';
export const DEPARTURE_BOARD_LOGO_DEFAULT = 'sprzel';
export const DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH = 80_000;
export const DEPARTURE_BOARD_LOGO_PRESETS = Object.freeze([
    {
        id: 'cd',
        src: 'images/tabule/CD_logo.svg',
        label: 'ČD'
    },
    {
        id: 'sprzel',
        src: 'images/tabule/sprzel.svg',
        label: 'Správa železnic'
    },
    {
        id: 'sprzel-white',
        src: 'images/tabule/sprzel_bile.svg',
        label: 'Správa železnic bílé'
    },
    {
        id: 'pragotron',
        src: 'images/tabule/pragotron_bile.svg',
        label: 'Pragotron'
    }
]);

export const normalizeDepartureBoardLogoId = (value) => {
    if (value === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
        return DEPARTURE_BOARD_LOGO_CUSTOM_ID;
    }

    return DEPARTURE_BOARD_LOGO_PRESETS.some((item) => item.id === value)
        ? value
        : DEPARTURE_BOARD_LOGO_DEFAULT;
};

export const normalizeCustomBoardLogoSvg = (value) => {
    const text = String(value ?? '').trim();
    if (!text
        || text.length > DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH
        || !/<svg[\s>]/i.test(text)
        || /<script/i.test(text)
        || /\bon\w+\s*=/i.test(text)) {
        return '';
    }

    return text;
};

export const getDepartureBoardLogoLabel = (
    value,
    fallback = DEPARTURE_BOARD_LOGO_DEFAULT
) => {
    const logoId = normalizeDepartureBoardLogoId(value ?? fallback);
    if (logoId === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
        return 'Vlastní logo';
    }

    return DEPARTURE_BOARD_LOGO_PRESETS.find((item) => item.id === logoId)?.label
        || 'Logo';
};

export const getDepartureBoardLogoSrc = (
    value,
    customSvg = '',
    fallback = DEPARTURE_BOARD_LOGO_DEFAULT
) => {
    const logoId = normalizeDepartureBoardLogoId(value ?? fallback);
    if (logoId === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
        const svg = normalizeCustomBoardLogoSvg(customSvg);
        return svg
            ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
            : '';
    }

    return DEPARTURE_BOARD_LOGO_PRESETS.find((item) => item.id === logoId)?.src
        || '';
};

const TRAIN_TYPE_IMAGE_FILE_NAMES = [
    'EuroCity_Logo.svg',
    'InterCity_Austria.svg',
    'intercity.svg',
    'Nightjet_logo.svg',
    'nightjet.svg',
    'Railjet_logo.svg',
    'railjet.svg',
    'Regiojet_logo.svg',
    'regiojet.svg',
    'Správa_železnic_logo.svg',
    'supercity.svg'
];

export const TRAIN_TYPE_IMAGE_CUSTOM = 'custom';

export const trainTypeImageLabel = (file) =>
    String(file || '').replace(/\.svg$/i, '').replaceAll('_', ' ');

export const TRAIN_TYPE_IMAGE_FILES = Object.freeze(
    [...TRAIN_TYPE_IMAGE_FILE_NAMES].sort((left, right) =>
        trainTypeImageLabel(left).localeCompare(
            trainTypeImageLabel(right),
            'cs',
            { sensitivity: 'base' }
        )
    )
);

const TRAIN_TYPE_IMAGE_FILE_SET = new Set(TRAIN_TYPE_IMAGE_FILES);

export const trainTypeImageSrc = (file) => `images/typy-vlaku/${file}`;

export const normalizeTrainTypeSource = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return '';
    }

    if (/<svg[\s>]/i.test(raw)) {
        return normalizeCustomBoardLogoSvg(raw);
    }

    const file = raw.split(/[/\\]/).pop();
    if (TRAIN_TYPE_IMAGE_FILE_SET.has(file) && (
        raw === trainTypeImageSrc(file)
        || raw === `images/${file}`
        || raw === file
    )) {
        return trainTypeImageSrc(file);
    }

    return '';
};

export const trainTypeImageUrl = (value) => {
    const source = normalizeTrainTypeSource(value);
    if (!source) {
        return '';
    }

    if (source.startsWith('<')) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    }

    return source;
};

export const trainTypeImageChoice = (value) => {
    const source = normalizeTrainTypeSource(value);
    if (!source) {
        return { choice: '', svg: '' };
    }

    if (source.startsWith('<')) {
        return { choice: TRAIN_TYPE_IMAGE_CUSTOM, svg: source };
    }

    return { choice: source, svg: '' };
};

const clampInteger = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(maximum, Math.max(minimum, Math.round(number)))
        : fallback;
};

export const normalizeFlapTiming = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {};

    return {
        duration: clampInteger(
            source.duration,
            FLAP_TIMING_DURATION_MIN,
            FLAP_TIMING_DURATION_MAX,
            FLAP_TIMING_DEFAULTS.duration
        ),
        variation: clampInteger(
            source.variation,
            FLAP_TIMING_VARIATION_MIN,
            FLAP_TIMING_VARIATION_MAX,
            FLAP_TIMING_DEFAULTS.variation
        )
    };
};

export const isLegacySharedFlapTiming = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return Number(value.duration) === STATION_FLIP_DURATION
        && Number(value.variation ?? FLAP_TIMING_VARIATION_MS)
            === FLAP_TIMING_VARIATION_MS;
};

export const resolveBoardFlapTiming = (
    value,
    boardDefault = FLAP_TIMING_DEFAULTS
) => {
    const source = value && typeof value === 'object' ? value : null;
    const hasDuration = Number.isFinite(Number(source?.duration));
    if (!source || !hasDuration || isLegacySharedFlapTiming(source)) {
        return normalizeFlapTiming(boardDefault);
    }

    return normalizeFlapTiming(source);
};

export const getFlapDuration = (timing = FLAP_TIMING_DEFAULTS) => {
    const normalized = normalizeFlapTiming(timing);
    return normalized.duration
        + Math.floor(Math.random() * (normalized.variation * 2 + 1))
        - normalized.variation;
};

export const DELAY_VALUES = Object.freeze([
    '',
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    70, 80, 90, 100, 110, 120,
    150, 180, 210, 240, 270, 300, 330, 360, 390
]);

export const DELAY_DISPLAY_THRESHOLD = 5;
export const DELAY_OFFSET_DEFAULT = false;
const RECENT_DEPARTURE_GRACE_MS = 10 * 60 * 1000;
// The 10th minute still counts. The hold releases at the start of the next one.
const DEPARTURE_HOLD_RELEASE_MS = RECENT_DEPARTURE_GRACE_MS + 60 * 1000;

const minutesSinceClock = (clockDate, reference) => {
    const referenceMinute = new Date(reference.getTime());
    referenceMinute.setSeconds(0, 0);
    return referenceMinute.getTime() - clockDate.getTime();
};

export const normalizeDelayOffset = (value) => value === true;

export const parseDelayMinutes = (value) => {
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    const text = String(value).trim();
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*min\.?$/i);
    const numericValue = Number(match ? match[1].replace(',', '.') : value);

    return Number.isFinite(numericValue) && numericValue >= 0
        ? Math.floor(numericValue)
        : null;
};

export const getDisplayedDelay = (
    value,
    values = DELAY_VALUES,
    applyOffset = DELAY_OFFSET_DEFAULT
) => {
    const minutes = parseDelayMinutes(value);

    if (minutes === '' || minutes === null) {
        return '';
    }

    const offsetEnabled = normalizeDelayOffset(applyOffset);
    if (offsetEnabled && minutes <= DELAY_DISPLAY_THRESHOLD) {
        return '';
    }

    const availableValues = values.filter(
        (candidate) => Number.isFinite(Number(candidate))
            && Number(candidate) > 0
            && (
                offsetEnabled
                    ? Number(candidate) < minutes
                    : Number(candidate) <= minutes
            )
    );

    return availableValues.length
        ? availableValues[availableValues.length - 1]
        : '';
};

export const getEffectiveDepartureDate = (
    departureTime,
    delay,
    now = new Date(),
    applyOffset = DELAY_OFFSET_DEFAULT
) => {
    const hours = Number(departureTime?.hours);
    const minutes = Number(departureTime?.minutes);

    if (!Number.isInteger(hours) || hours < 0 || hours > 23
        || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    const reference = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(reference.getTime())) {
        return null;
    }

    const clock = new Date(reference.getTime());
    clock.setSeconds(0, 0);
    clock.setHours(hours, minutes, 0, 0);

    const date = new Date(clock.getTime());
    const displayedDelay = getDisplayedDelay(delay, DELAY_VALUES, applyOffset);
    if (displayedDelay !== '') {
        date.setMinutes(date.getMinutes() + Number(displayedDelay));
    }

    // A clock time that already passed today belongs to the next calendar
    // day, so an overnight service does not light its lenses in the evening.
    // Up to 10 minutes after the effective departure (scheduled time plus the
    // displayed delay) the service is still this one, with or without delay.
    const recentDeparture = minutesSinceClock(date, reference)
        <= RECENT_DEPARTURE_GRACE_MS;
    if (date.getTime() < reference.getTime() && !recentDeparture) {
        date.setDate(date.getDate() + 1);
    }

    return date;
};

export const getNextLensBoundary = (
    departureDate,
    preDepartureSeconds,
    now = Date.now()
) => {
    if (!(departureDate instanceof Date) || Number.isNaN(departureDate.getTime())) {
        return null;
    }

    const nowMs = now instanceof Date ? now.getTime() : Number(now);
    if (!Number.isFinite(nowMs)) {
        return null;
    }

    const seconds = Number(preDepartureSeconds);
    const activation = departureDate.getTime()
        - (Number.isFinite(seconds) ? seconds : 0) * 1000;
    if (activation > nowMs) {
        return activation;
    }

    const release = departureDate.getTime() + DEPARTURE_HOLD_RELEASE_MS;
    return release > nowMs ? release : null;
};

export const getDepartureSortTimestamp = (
    departureTime,
    delay,
    now = new Date(),
    applyOffset = DELAY_OFFSET_DEFAULT
) => {
    const hours = Number(departureTime?.hours);
    const minutes = Number(departureTime?.minutes);

    if (!Number.isInteger(hours) || hours < 0 || hours > 23
        || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        return Number.POSITIVE_INFINITY;
    }

    const reference = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(reference.getTime())) {
        return Number.POSITIVE_INFINITY;
    }

    const date = new Date(reference.getTime());
    date.setSeconds(0, 0);
    date.setHours(hours, minutes, 0, 0);

    const actualDelay = parseDelayMinutes(delay);
    const delayMinutes = Number.isFinite(actualDelay) ? actualDelay : 0;
    const effective = new Date(date.getTime());
    if (delayMinutes > 0) {
        effective.setMinutes(effective.getMinutes() + delayMinutes);
    }

    // A clock time already more than 10 minutes past is the next calendar
    // day, so an overnight train sorts after this evening. Real delay keeps
    // today's slot only while scheduled time plus that delay is still inside
    // the same window. Display offset must not hide this delay.
    if (minutesSinceClock(effective, reference) > RECENT_DEPARTURE_GRACE_MS) {
        date.setDate(date.getDate() + 1);
    }

    return date.getTime();
};

export const compareDeparturesByTime = (
    first,
    second,
    now = new Date(),
    applyOffset = DELAY_OFFSET_DEFAULT
) => {
    const firstTime = getDepartureSortTimestamp(
        first?.departureTime,
        first?.delay,
        now,
        applyOffset
    );
    const secondTime = getDepartureSortTimestamp(
        second?.departureTime,
        second?.delay,
        now,
        applyOffset
    );

    return firstTime - secondTime
        || String(first?.id || '').localeCompare(String(second?.id || ''));
};

export const TRAIN_TYPES = Object.freeze([
    {
        name: '',
        text: '',
        background: 'var(--flap-background)',
        foreground: 'var(--flap-foreground)'
    },
    { name: 'ČEDOK', text: 'ČEDOK', background: '#D80300', foreground: '#fff' },
    { name: 'Ex', text: 'Ex', background: '#D80300', foreground: '#fff' },
    {
        name: 'Ex lôžk.',
        text: 'Ex',
        suffix: 'lôžk.',
        background: '#D80300',
        foreground: '#fff'
    },
    {
        name: 'Ex miest.',
        text: 'Ex',
        suffix: 'miest.',
        background: '#D80300',
        foreground: '#fff'
    },
    {
        name: 'Mim. Os',
        text: 'Mim. Os',
        background: 'var(--flap-background)',
        foreground: '#fff'
    },
    { name: 'Mim. R', text: 'Mim. R', background: '#D80300', foreground: '#fff' },
    { name: 'ODKLON', text: 'ODKLON', background: '#FFD800', foreground: '#000' },
    { name: 'Os', text: 'Os', background: 'var(--flap-background)', foreground: '#fff' },
    { name: 'R', text: 'R', background: '#D80300', foreground: '#fff' },
    {
        name: 'R miest.',
        text: 'R',
        suffix: 'miest.',
        background: '#D80300',
        foreground: '#fff'
    },
    { name: 'ROH', text: 'ROH', background: '#D80300', foreground: '#fff' },
    { name: 'Sp', text: 'Sp', background: '#1e3c69', foreground: '#fff' },
    {
        name: 'ZÁJAZD',
        text: 'ZÁJAZD',
        background: 'var(--flap-background)',
        foreground: '#fff'
    },
    {
        name: 'Intercity',
        source: 'images/typy-vlaku/intercity.svg',
        label: 'Intercity (IC)',
        background: '#fff',
        foreground: '#CC3333'
    },
    {
        name: 'Eurocity',
        source: 'images/typy-vlaku/EuroCity_Logo.svg',
        label: 'Eurocity (EC)',
        background: '#fff',
        foreground: '#000'
    },
    {
        name: 'rj',
        source: 'images/typy-vlaku/railjet.svg',
        label: 'Railjet (rj)',
        background: '#D80300',
        foreground: '#fff'
    },
    {
        name: 'RJ',
        source: 'images/typy-vlaku/regiojet.svg',
        label: 'RegioJet (RJ)',
        background: '#F1B504',
        foreground: '#000'
    },
    {
        name: 'EuroNight',
        text: 'EN',
        label: 'EuroNight (EN)',
        background: 'var(--flap-background)',
        foreground: '#fff'
    },
    {
        name: 'nj',
        source: 'images/typy-vlaku/nightjet.svg',
        label: 'NightJet (nj)',
        background: '#1e3c69',
        foreground: '#fff'
    },
    {
        name: 'SuperCity',
        source: 'images/typy-vlaku/supercity.svg',
        label: 'SuperCity (SC)',
        background: '#fff',
        foreground: '#F1B504'
    }
]);

export const DEPARTURE_TRACK_VALUES = Object.freeze([
    '',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
    '12', '13', '6a', '11a', '701'
]);

export const DEPARTURE_PLATFORM_VALUES = Object.freeze([
    '',
    '1', '2', '3', '4', '5', '6'
]);

export const DEPARTURE_SECTOR_VALUES = Object.freeze([
    '',
    'A',
    'A-B',
    'A-C',
    'A-D',
    'B',
    'B-C',
    'B-D',
    'B-E',
    'C',
    'C-D',
    'C-E',
    'D',
    'D-E',
    'E',
    'Sever',
    'Jih'
]);

export const TRAIN_NUMBER_CARD_STYLES = Object.freeze({
    default: Object.freeze({
        background: 'var(--flap-background)',
        foreground: 'var(--flap-foreground)'
    }),
    intercity: Object.freeze({
        background: '#fff',
        foreground: '#000'
    }),
    sp: Object.freeze({
        background: '#1e3c69',
        foreground: '#fff'
    }),
    red: Object.freeze({
        background: '#D80300',
        foreground: '#fff'
    })
});

const createTrainNumberCard = (key, value, style) => Object.freeze({
    key,
    value,
    ...TRAIN_NUMBER_CARD_STYLES[style],
    style
});

const createTrainNumberDigitCards = (style) =>
    Array.from({ length: 10 }, (_, digit) =>
        createTrainNumberCard(`${style}-${digit}`, String(digit), style)
    );

export const TRAIN_NUMBER_FLAP_CARDS = Object.freeze([
    createTrainNumberCard('blank', '', 'default'),
    ...createTrainNumberDigitCards('default'),
    ...createTrainNumberDigitCards('intercity'),
    ...createTrainNumberDigitCards('sp'),
    ...createTrainNumberDigitCards('red')
]);

const normalizeOperatorKey = (value) => String(value ?? '')
    .toLocaleLowerCase('cs-CZ')
    .replace(/[^a-z0-9áäčďéěíľĺňóôŕřšťúůýž]+/gi, '');

const isRegioJetOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized.includes('regiojet')
        || normalized === 'rjet'
        || normalized === 'rj';
};

const isCDOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized === 'čd'
        || normalized === 'cd'
        || normalized.includes('českédráhy')
        || normalized.includes('ceskedrahy');
};

const findKnownTrainTypeName = (value) => {
    const sourceType = String(value ?? '').trim();
    if (!sourceType) {
        return '';
    }

    const lower = sourceType.toLocaleLowerCase('cs-CZ');
    return TRAIN_TYPES.find((candidate) => candidate.name === sourceType)?.name
        || TRAIN_TYPES.find((candidate) =>
            candidate.name.toLocaleLowerCase('cs-CZ') === lower
        )?.name
        || TRAIN_TYPES.find((candidate) =>
            candidate.text
            && candidate.text.toLocaleLowerCase('cs-CZ') === lower
        )?.name
        || '';
};

export const resolveCanonicalTrainType = (sourceType, operator = '') => {
    const original = String(sourceType ?? '').trim();
    const lower = original.toLocaleLowerCase('cs-CZ');

    if (lower === 'ic' || lower === 'intercity') {
        return 'Intercity';
    }
    if (lower === 'ec' || lower === 'eurocity') {
        return 'Eurocity';
    }
    if (lower === 'sc' || lower === 'supercity') {
        return 'SuperCity';
    }
    if (lower === 'en' || lower === 'euronight') {
        return 'EuroNight';
    }
    if (lower === 'nj' || lower === 'nightjet') {
        return 'nj';
    }
    if (lower === 'railjet') {
        return 'rj';
    }
    if (lower === 'regiojet') {
        return 'RJ';
    }
    if (lower === 'rj') {
        if (isRegioJetOperator(operator)) {
            return 'RJ';
        }
        if (isCDOperator(operator)) {
            return 'rj';
        }
        return original === 'RJ' ? 'RJ' : 'rj';
    }

    return findKnownTrainTypeName(original);
};

export const findTrainType = (value, types = TRAIN_TYPES) => {
    const requested = String(value ?? '').trim();
    if (!requested) {
        return types.find((type) => type.name === '') || types[0] || null;
    }

    const exact = types.find((type) =>
        type.name === requested || type.source === requested
    );
    if (exact) {
        return exact;
    }

    const normalized = requested.toLocaleLowerCase('cs-CZ');
    const aliasName = normalized === 'railjet'
        ? 'rj'
        : normalized === 'regiojet'
            ? 'RJ'
            : '';
    if (aliasName) {
        const aliased = types.find((type) => type.name === aliasName);
        if (aliased) {
            return aliased;
        }
    }

    const insensitive = types.filter((type) =>
        type.name.toLocaleLowerCase('cs-CZ') === normalized
    );
    if (insensitive.length === 1) {
        return insensitive[0];
    }

    const canonicalName = resolveCanonicalTrainType(requested);
    return types.find((type) => type.name === canonicalName) || null;
};

export const getTrainNumberCardStyle = (train) => {
    const name = String(train ?? '');
    const normalized = name.toLocaleLowerCase('cs-CZ');

    if (
        name === 'Intercity'
        || name === 'Eurocity'
        || name === 'IC'
        || name === 'EC'
        || name === 'SuperCity'
        || normalized === 'sc'
    ) {
        return 'intercity';
    }

    if (
        name === 'Sp'
        || normalized === 'nj'
        || normalized === 'nightjet'
    ) {
        return 'sp';
    }

    if (
        name === 'R'
        || name === 'R miest.'
        || name === 'Mim. R'
        || name === 'Ex'
        || name.startsWith('Ex ')
        || name === 'ČEDOK'
        || name === 'ROH'
        || normalized === 'rj'
        || normalized === 'railjet'
        || normalized === 'regiojet'
    ) {
        return 'red';
    }

    return 'default';
};

export const NIGHT_FADE_MODES = Object.freeze([
    { value: 'none', label: 'Bez pohasínání (stálý svit)' },
    { value: 'soft', label: 'Jemné kolísání' },
    { value: 'slow', label: 'Pomalé pohasínání' },
    { value: 'flicker', label: 'Nepravidelné poblikávání' }
]);

const NIGHT_LIGHT_BASE_DEFAULTS = Object.freeze({
    enabled: true,
    variation: false,
    intensity: 40,
    speed: 120,
    fade: 'none'
});

export const NIGHT_LIGHT_DEFAULTS = Object.freeze([
    { id: 'top-left', label: 'Horní levá', ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: 'top-center', label: 'Horní střed', ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: 'top-right', label: 'Horní pravá', ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: 'bottom-left', label: 'Dolní levá', ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: 'bottom-center', label: 'Dolní střed', ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: 'bottom-right', label: 'Dolní pravá', ...NIGHT_LIGHT_BASE_DEFAULTS }
]);

export const NIGHT_CLOCK_DEFAULTS = Object.freeze({
    enabled: true,
    intensity: 60
});

export const createEmptyBoardState = () => ({
    stations: ['', ''],
    train: '',
    delay: '',
    departureTime: null
});

export const cloneBoardState = (state) => {
    const source = state && typeof state === 'object' ? state : {};
    const stations = Array.isArray(source.stations)
        ? source.stations
        : [source.stationOne, source.stationTwo];

    return {
        ...source,
        stations: [stations[0] || '', stations[1] || ''],
        train: source.train || '',
        delay: source.delay ?? '',
        departureTime: source.departureTime
            && typeof source.departureTime === 'object'
            ? {
                hours: Number(source.departureTime.hours) || 0,
                minutes: Number(source.departureTime.minutes) || 0
            }
            : null
    };
};
