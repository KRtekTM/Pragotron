export const STATION_CHARACTER_COUNT = 14;

export const STATION_FLAP_SEQUENCE = Object.freeze([
    ' ',
    'A', 'Á', 'Ä', 'B', 'C', 'Č', 'D', 'Ď', 'E', 'É', 'Ě', 'Ë',
    'F', 'G', 'H', 'I', 'Í', 'Ï', 'J', 'K', 'L', 'Ľ', 'M', 'N', 'Ň',
    'O', 'Ó', 'Ö', 'P', 'Q', 'R', 'Ř', 'Ŕ', 'S', 'Š', 'T', 'Ť',
    'U', 'Ú', 'Ů', 'Ü', 'V', 'W', 'X', 'Y', 'Ý', 'Ÿ', 'Z', 'Ž',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '.', ',', ':', ';', '-', '/', '+', '(', ')', '[', ']',
    '!', '?', '%', '&', '#', "'"
]);

export const STATION_FLIP_DURATION = 190;
export const FLAP_TIMING_VARIATION_MS = 10;

export const getFlapDuration = () =>
    STATION_FLIP_DURATION
    + Math.floor(Math.random() * (FLAP_TIMING_VARIATION_MS * 2 + 1))
    - FLAP_TIMING_VARIATION_MS;

export const DELAY_VALUES = Object.freeze([
    '',
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    70, 80, 90, 100, 110, 120,
    150, 180, 210, 240, 270, 300, 330, 360, 390
]);

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
        source: 'images/InterCity_Austria.svg',
        background: '#fff',
        foreground: '#D80300'
    },
    {
        name: 'Eurocity',
        source: 'images/EuroCity_Logo.svg',
        background: '#fff',
        foreground: '#000'
    }
]);

export const NIGHT_FADE_MODES = Object.freeze([
    { value: 'none', label: 'Bez pohasínání (stálý svit)' },
    { value: 'soft', label: 'Jemné kolísání' },
    { value: 'slow', label: 'Pomalé pohasínání' },
    { value: 'flicker', label: 'Nepravidelné poblikávání' }
]);

export const NIGHT_LIGHT_DEFAULTS = Object.freeze([
    {
        id: 'top-left',
        label: 'Horní levá',
        enabled: true,
        variation: true,
        intensity: 100,
        speed: 45,
        fade: 'soft'
    },
    {
        id: 'top-center',
        label: 'Horní střed',
        enabled: true,
        variation: true,
        intensity: 85,
        speed: 60,
        fade: 'slow'
    },
    {
        id: 'top-right',
        label: 'Horní pravá',
        enabled: true,
        variation: true,
        intensity: 55,
        speed: 45,
        fade: 'flicker'
    },
    {
        id: 'bottom-left',
        label: 'Dolní levá',
        enabled: false,
        variation: false,
        intensity: 0,
        speed: 60,
        fade: 'soft'
    },
    {
        id: 'bottom-right',
        label: 'Dolní pravá',
        enabled: true,
        variation: true,
        intensity: 75,
        speed: 55,
        fade: 'slow'
    }
]);

export const NIGHT_CLOCK_DEFAULTS = Object.freeze({
    enabled: true,
    intensity: 50
});

export const createEmptyBoardState = () => ({
    stations: ['', ''],
    train: '',
    delay: '',
    departureTime: null
});

export const cloneBoardState = (state) => {
    const source = state && typeof state === 'object' ? state : {};

    return {
        ...source,
        stations: Array.isArray(source.stations)
            ? [source.stations[0] || '', source.stations[1] || '']
            : ['', ''],
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
