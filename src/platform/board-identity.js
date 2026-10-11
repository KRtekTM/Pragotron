import { getActiveStationProfile, sectorsOverlap } from './station-profile.js';

export const BOARD_IDENTITY_STORAGE_KEY =
    'pragotron.platformTable.boardIdentity.v1';

const IDENTITY_FIELDS = Object.freeze([
    'platform',
    'track',
    'sector'
]);

const getSessionStorage = (storage) => {
    if (storage !== undefined) {
        return storage;
    }

    try {
        return globalThis.window?.sessionStorage || null;
    } catch {
        return null;
    }
};

const cleanValue = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

export const normalizeBoardIdentity = (value = {}) => ({
    platform: cleanValue(value.platform),
    track: cleanValue(value.track),
    sector: cleanValue(value.sector)
});

export const isBoardIdentityConfigured = (identity) => {
    const normalized = normalizeBoardIdentity(identity);
    return Boolean(normalized.platform && normalized.track);
};

export const getBoardIdentityKey = (identity) => {
    const normalized = normalizeBoardIdentity(identity);
    return JSON.stringify([
        normalized.platform,
        normalized.track,
        normalized.sector
    ]);
};

export const formatBoardIdentity = (identity) => {
    const normalized = normalizeBoardIdentity(identity);
    const sector = normalized.sector || 'celá kolej';
    return `nástupiště ${normalized.platform || '—'}, kolej ${
        normalized.track || '—'
    }, sektor ${sector}`;
};

export const identitiesMatch = (
    boardIdentity,
    targetIdentity,
    profile = getActiveStationProfile()
) => {
    const board = normalizeBoardIdentity(boardIdentity);
    const target = normalizeBoardIdentity(targetIdentity);

    if (!target.platform || !target.track) {
        return false;
    }
    if (board.platform !== target.platform || board.track !== target.track) {
        return false;
    }
    if (!target.sector || !board.sector) {
        return true;
    }

    return sectorsOverlap(board.sector, target.sector, profile);
};

export const loadBoardIdentity = ({
    location = globalThis.window?.location,
    storage: storageOption,
    fallback = {}
} = {}) => {
    const storage = getSessionStorage(storageOption);
    let saved = {};

    try {
        const raw = storage?.getItem(BOARD_IDENTITY_STORAGE_KEY);
        saved = raw ? JSON.parse(raw) : {};
    } catch {
        saved = {};
    }

    const params = new URLSearchParams(location?.search || '');
    const hasPlatformOrTrackParam =
        params.has('platform') || params.has('track');
    const hasAnyParam = IDENTITY_FIELDS.some((field) => params.has(field));
    const urlIdentity = hasAnyParam
        ? {
            platform: params.has('platform')
                ? params.get('platform')
                : hasPlatformOrTrackParam
                    ? ''
                    : saved.platform,
            track: params.has('track')
                ? params.get('track')
                : hasPlatformOrTrackParam
                    ? ''
                    : saved.track,
            sector: params.has('sector')
                ? params.get('sector')
                : hasPlatformOrTrackParam
                    ? ''
                    : saved.sector
        }
        : null;
    const identity = normalizeBoardIdentity(
        urlIdentity || saved || fallback
    );

    if (urlIdentity) {
        saveBoardIdentity(identity, storage);
    }

    return identity;
};

export const saveBoardIdentity = (identity, storageOption) => {
    const storage = getSessionStorage(storageOption);
    const normalized = normalizeBoardIdentity(identity);

    try {
        storage?.setItem(
            BOARD_IDENTITY_STORAGE_KEY,
            JSON.stringify(normalized)
        );
    } catch {
        // sessionStorage can be unavailable in restricted documents.
    }

    return normalized;
};
