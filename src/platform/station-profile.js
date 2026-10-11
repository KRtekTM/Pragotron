import {
    DEPARTURE_PLATFORM_VALUES,
    DEPARTURE_SECTOR_VALUES,
    DEPARTURE_TRACK_VALUES,
    TRAIN_NUMBER_CARD_STYLES,
    TRAIN_TYPES,
    getTrainNumberCardStyle,
    normalizeTrainTypeSource
} from './data.js';

export const STATION_PROFILE_STORAGE_KEY = 'pragotron.stationProfile.v1';
export const STATION_PROFILE_VERSION = 1;

const MAX_LIST = 80;
const MAX_TYPES = 40;
const MAX_STYLES = 12;
const MAX_TEXT = 32;

const DEFAULT_ALIASES = Object.freeze({
    Intercity: ['IC', 'ic', 'intercity'],
    Eurocity: ['EC', 'ec', 'eurocity'],
    SuperCity: ['SC', 'sc', 'supercity'],
    EuroNight: ['EN', 'en', 'euronight'],
    nj: ['NJ', 'NightJet', 'Nightjet', 'nightjet'],
    rj: ['railjet', 'Railjet'],
    RJ: ['regiojet', 'RegioJet']
});

const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const cleanToken = (value) => clean(value)
    .replace(/[–—−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .slice(0, MAX_TEXT);

const uniqueTokens = (values, limit = MAX_LIST) => {
    const result = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((value) => {
        const token = cleanToken(value);
        const key = token.toLocaleLowerCase('cs-CZ');
        if (!token || seen.has(key) || result.length >= limit) {
            return;
        }
        seen.add(key);
        result.push(token);
    });
    return result;
};

const linesFrom = (value) => {
    if (Array.isArray(value)) {
        return value;
    }
    return String(value ?? '').split(/\r?\n/);
};

const isCssColor = (value) => {
    const text = clean(value);
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)
        || /^var\(--[a-z0-9-]+\)$/i.test(text)
        || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(text);
};

const colorOr = (value, fallback) => (
    isCssColor(value) ? clean(value) : fallback
);

const slug = (value, fallback) => {
    const text = clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('cs-CZ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
    return text || fallback;
};

const normalizeOperatorKey = (value) => clean(value)
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

const blankTrainType = () => ({
    name: '',
    text: '',
    suffix: '',
    source: '',
    label: '',
    background: 'var(--flap-background)',
    foreground: 'var(--flap-foreground)',
    numberStyle: 'default',
    aliases: []
});

export const createDefaultStationProfile = () => {
    const numberStyles = Object.entries(TRAIN_NUMBER_CARD_STYLES).map(
        ([id, style]) => ({
            id,
            label: id,
            background: style.background,
            foreground: style.foreground
        })
    );
    const knownStyles = new Set(numberStyles.map((style) => style.id));
    const sectors = DEPARTURE_SECTOR_VALUES.filter(Boolean);
    const atomic = sectors.filter((value) => !value.includes('-'));

    return {
        version: STATION_PROFILE_VERSION,
        name: 'Brno hlavní nádraží',
        platforms: DEPARTURE_PLATFORM_VALUES.filter(Boolean),
        tracks: DEPARTURE_TRACK_VALUES.filter(Boolean),
        sectors: atomic,
        sectorRanges: sectors.filter((value) => value.includes('-')),
        numberStyles,
        trainTypes: [
            blankTrainType(),
            ...TRAIN_TYPES.filter((type) => type.name).map((type) => {
                const numberStyle = getTrainNumberCardStyle(type.name);
                return {
                    name: type.name,
                    text: type.text || '',
                    suffix: type.suffix || '',
                    source: type.source || '',
                    label: type.label || '',
                    background: type.background,
                    foreground: type.foreground,
                    numberStyle: knownStyles.has(numberStyle)
                        ? numberStyle
                        : 'default',
                    aliases: [...(DEFAULT_ALIASES[type.name] || [])]
                };
            })
        ]
    };
};

const normalizeTrainType = (value, styles) => {
    const source = value && typeof value === 'object' ? value : {};
    const name = cleanToken(source.name);
    const styleIds = new Set(styles.map((style) => style.id));
    const aliases = uniqueTokens(
        Array.isArray(source.aliases)
            ? source.aliases
            : String(source.aliases || '').split(/[,;]/),
        12
    ).filter((alias) => alias.toLocaleLowerCase('cs-CZ') !== name.toLocaleLowerCase('cs-CZ'));

    return {
        name,
        text: cleanToken(source.text).slice(0, 16),
        suffix: cleanToken(source.suffix).slice(0, 12),
        source: normalizeTrainTypeSource(source.source),
        label: clean(source.label).slice(0, 40),
        background: colorOr(source.background, 'var(--flap-background)'),
        foreground: colorOr(source.foreground, 'var(--flap-foreground)'),
        numberStyle: styleIds.has(clean(source.numberStyle))
            ? clean(source.numberStyle)
            : 'default',
        aliases
    };
};

export const normalizeStationProfile = (value) => {
    const source = value && typeof value === 'object' ? value : null;
    if (!source) {
        return null;
    }

    const fallbackStyles = createDefaultStationProfile().numberStyles;
    const numberStyles = [];
    const seenStyles = new Set();
    (Array.isArray(source.numberStyles) ? source.numberStyles : fallbackStyles)
        .forEach((style) => {
            const id = slug(style?.id, '') || slug(style?.label, '');
            if (!id || seenStyles.has(id) || numberStyles.length >= MAX_STYLES) {
                return;
            }
            seenStyles.add(id);
            numberStyles.push({
                id,
                label: id,
                background: colorOr(
                    style.background,
                    id === 'default'
                        ? 'var(--flap-background)'
                        : '#111111'
                ),
                foreground: colorOr(style.foreground, '#ffffff')
            });
        });
    if (!seenStyles.has('default')) {
        numberStyles.unshift({
            id: 'default',
            label: 'default',
            background: 'var(--flap-background)',
            foreground: 'var(--flap-foreground)'
        });
    }

    const trainTypes = [];
    const seenTypes = new Set();
    (Array.isArray(source.trainTypes) ? source.trainTypes : [])
        .forEach((type) => {
            const normalized = normalizeTrainType(type, numberStyles);
            const key = normalized.name;
            if (!normalized.name || seenTypes.has(key) || trainTypes.length >= MAX_TYPES) {
                return;
            }
            seenTypes.add(key);
            trainTypes.push(normalized);
        });

    const platforms = uniqueTokens(linesFrom(source.platforms));
    const tracks = uniqueTokens(linesFrom(source.tracks));
    const sectors = uniqueTokens(linesFrom(source.sectors), 40);
    if (platforms.length === 0 || tracks.length === 0 || trainTypes.length === 0) {
        return null;
    }

    return {
        version: STATION_PROFILE_VERSION,
        name: clean(source.name).slice(0, 80) || 'Profil stanice',
        platforms,
        tracks,
        sectors,
        sectorRanges: uniqueTokens(linesFrom(source.sectorRanges), 80)
            .filter((value) => !sectors.some((sector) =>
                sector.toLocaleLowerCase('cs-CZ') === value.toLocaleLowerCase('cs-CZ')
            )),
        numberStyles,
        trainTypes: [blankTrainType(), ...trainTypes]
    };
};

let activeProfile = null;

const storage = () => {
    try {
        return globalThis.localStorage || null;
    } catch {
        return null;
    }
};

export const readStoredStationProfile = () => {
    try {
        const raw = storage()?.getItem(STATION_PROFILE_STORAGE_KEY);
        return raw ? normalizeStationProfile(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
};

export const getActiveStationProfile = () => {
    if (!activeProfile) {
        activeProfile = readStoredStationProfile() || createDefaultStationProfile();
    }
    return activeProfile;
};

export const setActiveStationProfile = (value, { persist = true } = {}) => {
    const next = normalizeStationProfile(value);
    if (!next) {
        return null;
    }

    activeProfile = next;
    if (persist) {
        try {
            storage()?.setItem(
                STATION_PROFILE_STORAGE_KEY,
                JSON.stringify(next)
            );
        } catch {
            // The page can still use the profile for this visit.
        }
    }
    return activeProfile;
};

export const profileSectorValues = (
    profile = getActiveStationProfile()
) => [...profile.sectors, ...profile.sectorRanges];

export const matchProfileValue = (values, value) => {
    const normalized = cleanToken(value);
    if (!normalized) {
        return '';
    }

    return values.find((candidate) => candidate === normalized)
        || values.find((candidate) =>
            candidate.toLocaleLowerCase('cs-CZ')
            === normalized.toLocaleLowerCase('cs-CZ')
        )
        || '';
};

export const sectorAtoms = (label, profile = getActiveStationProfile()) => {
    const value = cleanToken(label);
    if (!value) {
        return [];
    }

    const parts = value.split('-').filter(Boolean);
    if (parts.length === 2) {
        const from = profile.sectors.findIndex((sector) =>
            sector.toLocaleLowerCase('cs-CZ') === parts[0].toLocaleLowerCase('cs-CZ')
        );
        const to = profile.sectors.findIndex((sector) =>
            sector.toLocaleLowerCase('cs-CZ') === parts[1].toLocaleLowerCase('cs-CZ')
        );
        if (from !== -1 && to !== -1) {
            const start = Math.min(from, to);
            const end = Math.max(from, to);
            return profile.sectors.slice(start, end + 1);
        }
    }

    return [value];
};

export const sectorsOverlap = (
    boardSector,
    departureSector,
    profile = getActiveStationProfile()
) => {
    const boardAtoms = sectorAtoms(boardSector, profile)
        .map((sector) => sector.toLocaleLowerCase('cs-CZ'));
    const departureAtoms = sectorAtoms(departureSector, profile)
        .map((sector) => sector.toLocaleLowerCase('cs-CZ'));
    return departureAtoms.some((sector) => boardAtoms.includes(sector));
};

const typeLabels = (type) => [
    type.name,
    type.text,
    type.label,
    ...(type.aliases || [])
].map((value) => clean(value)).filter(Boolean);

export const resolveProfileTrainType = (
    sourceType,
    operator = '',
    profile = getActiveStationProfile()
) => {
    const original = clean(sourceType);
    if (!original) {
        return '';
    }

    const types = profile.trainTypes.filter((type) => type.name);
    const lower = original.toLocaleLowerCase('cs-CZ');
    if (lower === 'rj') {
        const preferred = isRegioJetOperator(operator)
            ? 'RJ'
            : isCDOperator(operator)
                ? 'rj'
                : original === 'RJ'
                    ? 'RJ'
                    : 'rj';
        const operatorMatch = types.find((type) => type.name === preferred);
        if (operatorMatch) {
            return operatorMatch.name;
        }
    }

    const match = types.find((type) => typeLabels(type).some((label) =>
        label.toLocaleLowerCase('cs-CZ') === lower
    ));
    return match?.name || '';
};

export const profileTrainLabels = (profile = getActiveStationProfile()) => {
    const labels = [];
    profile.trainTypes.forEach((type) => {
        typeLabels(type).forEach((label) => {
            if (!labels.some((item) =>
                item.toLocaleLowerCase('cs-CZ') === label.toLocaleLowerCase('cs-CZ')
            )) {
                labels.push(label);
            }
        });
    });
    return labels;
};

export const trainNumberStyleId = (
    train,
    profile = getActiveStationProfile()
) => {
    const name = resolveProfileTrainType(train, '', profile) || clean(train);
    const type = profile.trainTypes.find((item) => item.name === name);
    const style = type?.numberStyle || 'default';
    return profile.numberStyles.some((item) => item.id === style)
        ? style
        : 'default';
};

export const createTrainNumberCards = (profile = getActiveStationProfile()) => {
    const styles = profile.numberStyles;
    const fallback = styles.find((style) => style.id === 'default') || styles[0];
    const cards = [{
        key: 'blank',
        value: '',
        background: fallback.background,
        foreground: fallback.foreground,
        style: fallback.id
    }];
    styles.forEach((style) => {
        for (let digit = 0; digit <= 9; digit += 1) {
            cards.push({
                key: `${style.id}-${digit}`,
                value: String(digit),
                background: style.background,
                foreground: style.foreground,
                style: style.id
            });
        }
    });
    return cards;
};

export const createCatalogCards = (values) => [
    {
        key: 'blank',
        value: '',
        background: 'var(--flap-background)',
        foreground: 'var(--flap-foreground)'
    },
    ...values.map((value) => ({
        key: value,
        value,
        background: 'var(--flap-background)',
        foreground: 'var(--flap-foreground)'
    }))
];
