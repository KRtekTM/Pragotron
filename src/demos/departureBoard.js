import {
    BoardTransport,
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
    DepartureBoardDisplay,
    LocalStorageAdapter,
    SplitFlapAudio,
    getBoardIdentityKey,
    getEffectiveDepartureDate,
    DELAY_OFFSET_DEFAULT,
    DEPARTURE_BOARD_LOGO_DEFAULT,
    DepartureTimeDisplay,
    getDepartureBoardLogoLabel,
    getDepartureBoardLogoSrc,
    normalizeDelayOffset,
    normalizeDepartureBoardLogoId,
    normalizeDepartureBoardRowCount,
    normalizeFlapTiming,
    resolveDepartureStations,
    DEPARTURE_FLAP_TIMING_DEFAULTS,
    resolveBoardFlapTiming,
    DEPARTURE_BOARD_ROW_COUNT_MAX,
    DEPARTURE_BOARD_ROW_COUNT_MIN,
    parseLensColors,
    readInitialLensColors,
    readStoredStationProfile,
    setActiveStationProfile
} from '../platform/index.js';

const STORAGE_KEY = 'pragotron.platformTable.state.v2';
const documentRef = document;
const storage = new LocalStorageAdapter(STORAGE_KEY);
const savedState = storage.load() || {};
const savedSettings = savedState.settings || savedState;
const savedDesiredStates = savedState.desired
    && typeof savedState.desired === 'object'
    ? savedState.desired
    : {};
const root = documentRef.querySelector('#tabule.departure-board');
const screen = documentRef.querySelector('#skrin');

if (!root) {
    throw new Error('Kořen odjezdové tabule nebyl nalezen.');
}

const audio = new SplitFlapAudio();
audio.bindUserActivation(screen || documentRef);

const forgetSessionKey = (key) => {
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // A missing store still starts from the default for this page view.
    }
};

forgetSessionKey('pragotron.board.flapTiming.v1');
let boardFlapTimingCustom = false;
const initialTiming = resolveBoardFlapTiming(
    null,
    DEPARTURE_FLAP_TIMING_DEFAULTS
);
forgetSessionKey('pragotron.board.rowCount.v1');

const readRowCountParam = () => {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('rows')) {
            return null;
        }

        const raw = String(params.get('rows') ?? '').trim();
        if (!/^\d{1,2}$/.test(raw)) {
            return null;
        }

        const numeric = Number(raw);
        if (numeric < DEPARTURE_BOARD_ROW_COUNT_MIN
            || numeric > DEPARTURE_BOARD_ROW_COUNT_MAX) {
            return null;
        }

        return numeric;
    } catch {
        return null;
    }
};

const urlRowCount = readRowCountParam();
const initialRowCount = urlRowCount ?? DEPARTURE_BOARD_ROW_COUNT_DEFAULT;

const lensTemplate = (colors) => ({
    lenses: colors.map((color) => ({ color }))
});
let boardLensColors = readInitialLensColors();
forgetSessionKey('pragotron.board.synchronizeRows.v1');
let boardSynchronizeRows = true;
let delayOffset = normalizeDelayOffset(
    savedSettings.delayOffset ?? DELAY_OFFSET_DEFAULT
);
const boardLogoImage = documentRef.querySelector('#departureBoardLogo');
const BOARD_LOGO_MEMORY_KEY = 'pragotron.departureBoard.logo.v1';

const readRememberedLogo = () => {
    try {
        const raw = window.sessionStorage.getItem(BOARD_LOGO_MEMORY_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const logoChoice = (source) => ({
    departureBoardLogo: source?.departureBoardLogo,
    departureBoardLogoSvg: source?.departureBoardLogoSvg || '',
    settingsUpdatedAt: Number(source?.settingsUpdatedAt) || 0
});

const storedLogo = logoChoice(
    savedSettings?.departureBoardLogo != null
        || savedSettings?.settingsUpdatedAt
        ? savedSettings
        : savedState
);
const rememberedLogo = readRememberedLogo();
let currentLogo = (rememberedLogo?.settingsUpdatedAt || 0)
    > storedLogo.settingsUpdatedAt
    ? logoChoice(rememberedLogo)
    : storedLogo;
let appliedSettingsAt = currentLogo.settingsUpdatedAt;

const rememberLogo = (settings) => {
    currentLogo = logoChoice(settings);
    appliedSettingsAt = Math.max(
        appliedSettingsAt,
        currentLogo.settingsUpdatedAt
    );
    currentLogo.settingsUpdatedAt = appliedSettingsAt;
    try {
        window.sessionStorage.setItem(
            BOARD_LOGO_MEMORY_KEY,
            JSON.stringify(currentLogo)
        );
    } catch {
        // The board can still keep the logo for this page view.
    }
};

const applyBoardLogo = (settings = currentLogo) => {
    if (!boardLogoImage) {
        return;
    }

    const logoId = normalizeDepartureBoardLogoId(
        settings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
    );
    const src = getDepartureBoardLogoSrc(
        logoId,
        settings?.departureBoardLogoSvg || ''
    );
    const label = getDepartureBoardLogoLabel(logoId);
    if (!src) {
        boardLogoImage.hidden = true;
        boardLogoImage.removeAttribute('src');
        boardLogoImage.alt = '';
        return;
    }

    boardLogoImage.hidden = false;
    boardLogoImage.src = src;
    boardLogoImage.alt = label;
};

applyBoardLogo(currentLogo);
rememberLogo(currentLogo);
window.addEventListener('pageshow', () => {
    applyBoardLogo(currentLogo);
});
const clockRoot = documentRef.querySelector('#departureBoardClock');
const boardClock = clockRoot
    ? new DepartureTimeDisplay(clockRoot, {
        audio,
        timing: initialTiming,
        label: 'Aktuální čas',
        includeBlank: false
    })
    : null;
let boardClockTimer = null;
let lastBoardClockStamp = '';

const tickBoardClock = (immediate = false) => {
    if (!boardClock) {
        return;
    }

    const now = new Date();
    const stamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    if (stamp === lastBoardClockStamp) {
        return;
    }

    lastBoardClockStamp = stamp;
    if (immediate) {
        boardClock.setImmediate(now.getHours(), now.getMinutes(), now.getSeconds());
        return;
    }

    boardClock.set(now.getHours(), now.getMinutes(), now.getSeconds());
};

const scheduleBoardClock = (immediate = false) => {
    tickBoardClock(immediate);
    const now = new Date();
    const delay = 1000 - now.getMilliseconds();
    boardClockTimer = window.setTimeout(
        () => scheduleBoardClock(false),
        Math.max(20, delay)
    );
};

scheduleBoardClock(true);
documentRef.addEventListener('visibilitychange', () => {
    if (!documentRef.hidden) {
        lastBoardClockStamp = '';
        tickBoardClock(true);
    }
});

const storedStationProfile = readStoredStationProfile();
if (storedStationProfile) {
    setActiveStationProfile(storedStationProfile, { persist: false });
}

const display = new DepartureBoardDisplay(root, {
    audio,
    timing: initialTiming,
    rowCount: initialRowCount,
    applyDelayOffset: delayOffset,
    lensSettings: boardLensColors
        ? lensTemplate(boardLensColors)
        : savedSettings.lenses,
    synchronizeRows: boardSynchronizeRows
});
const transport = new BoardTransport();

const recoverDepartures = (
    values,
    desiredStates = savedDesiredStates,
    { includeMissing = true } = {}
) => {
    const candidates = desiredStates
        && typeof desiredStates === 'object'
        ? Object.values(desiredStates)
        : [];
    const rawDepartures = Array.isArray(values) ? values : [];

    const recoverDeparture = (departure, desired = null) => {
        const desiredState = desired?.state || {};
        const target = {
            ...(desired?.target || {}),
            ...(departure?.target || {}),
            platform: departure?.target?.platform
                || departure?.platform
                || desired?.target?.platform
                || '',
            track: departure?.target?.track
                || departure?.track
                || desired?.target?.track
                || '',
            sector: departure?.target?.sector
                || departure?.sector
                || desired?.target?.sector
                || ''
        };

        return {
            ...desiredState,
            ...departure,
            id: departure?.id
                || desired?.target && getBoardIdentityKey(desired.target),
            stations: resolveDepartureStations(departure, desiredState),
            target,
            departureTime: departure?.departureTime
                || desiredState.departureTime,
            train: departure?.train || desiredState.train || '',
            trainNumber: departure?.trainNumber
                || desiredState.trainNumber
                || '',
            delay: departure?.delay ?? desiredState.delay ?? '',
            lenses: departure?.lenses || desiredState.lenses
        };
    };

    const recovered = rawDepartures.map((departure) => {
        const desired = candidates.find((candidate) =>
            candidate?.target
            && (
                String(departure?.id || '')
                    === getBoardIdentityKey(candidate.target)
                || getBoardIdentityKey(departure?.target)
                    === getBoardIdentityKey(candidate.target)
            )
        );
        return recoverDeparture(departure, desired);
    });

    const recoveredIdentities = new Set();
    recovered.forEach((departure) => {
        if (departure?.id) {
            recoveredIdentities.add(String(departure.id));
        }
        if (departure?.target) {
            recoveredIdentities.add(
                getBoardIdentityKey(departure.target)
            );
        }
    });

    if (includeMissing) {
        candidates
            .filter((desired) =>
                desired?.action === 'apply-board'
                && desired.target
                && desired.state?.departureTime
            )
            .forEach((desired) => {
                const identity = getBoardIdentityKey(desired.target);
                if (recoveredIdentities.has(identity)) {
                    return;
                }

                const recoveredDeparture = recoverDeparture(
                    {
                        id: identity,
                        target: desired.target
                    },
                    desired
                );
                recovered.push(recoveredDeparture);
                recoveredIdentities.add(identity);
            });
    }

    return recovered;
};

const getCurrentDesiredStates = () => {
    const currentState = storage.load();
    return currentState?.desired
        && typeof currentState.desired === 'object'
        ? currentState.desired
        : savedDesiredStates;
};

const persistedDepartures = recoverDepartures(savedState.departures);
const persistedRevision = Number(savedState.revision) || 0;
let departures = [];
let boardTiming = initialTiming;
let revision = 0;
let lensActivationTimer = null;
let heartbeatTimer = null;
let destroyed = false;
let removeStorageListener = null;
let unsubscribeAudio = null;
let persistencePollTimer = null;
let helloRetryTimer = null;
let liveSnapshotReceived = false;
let manageSnapshotReceived = false;
let identificationActive = false;

const getSnapshotSignature = (values, timing) =>
    JSON.stringify([values, timing]);

let snapshotSignature = getSnapshotSignature(departures, boardTiming);

const scheduleInitialSnapshot = (callback) => {
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(callback);
    } else {
        window.setTimeout(callback, 0);
    }
};

const clearLensActivationTimer = () => {
    if (lensActivationTimer !== null) {
        window.clearTimeout(lensActivationTimer);
        lensActivationTimer = null;
    }
};

const getPreDepartureActivationTime = (departure) => {
    const preDeparture = departure?.lenses?.preDeparture;
    const lenses = Array.isArray(departure?.lenses?.lenses)
        ? departure.lenses.lenses
        : [];

    if (!preDeparture?.enabled
        || !lenses.some((lens) => lens.enabled && lens.blinking)) {
        return null;
    }

    const departureDate = getEffectiveDepartureDate(
        departure?.departureTime,
        departure?.delay,
        new Date(),
        delayOffset
    );
    if (!departureDate) {
        return null;
    }

    return departureDate.getTime()
        - Number(preDeparture.seconds || 0) * 1000;
};

const getPreDepartureActive = (departure, now = Date.now()) => {
    const activationTime = getPreDepartureActivationTime(departure);
    return activationTime === null || now >= activationTime;
};

const getDisplayDepartures = () => {
    const now = Date.now();
    return departures.map((departure) => ({
        ...departure,
        preDepartureActive: getPreDepartureActive(departure, now)
    }));
};

const scheduleLensActivation = () => {
    clearLensActivationTimer();

    if (destroyed) {
        return;
    }

    const now = Date.now();
    const nextActivation = departures
        .map(getPreDepartureActivationTime)
        .filter((value) => value !== null && value > now)
        .sort((first, second) => first - second)[0];

    if (nextActivation === undefined) {
        return;
    }

    lensActivationTimer = window.setTimeout(() => {
        lensActivationTimer = null;
        display.update(getDisplayDepartures());
        scheduleLensActivation();
    }, Math.max(0, nextActivation - now) + 10);
};

const updateDisplay = ({ immediate = false } = {}) => {
    display.update(getDisplayDepartures(), { immediate });
    scheduleLensActivation();
};

const applyRowCount = (value) => {
    const previous = display.rows.length;
    const nextCount = display.setRowCount(value);
    if (nextCount === previous) {
        return nextCount;
    }
    updateDisplay();
    publishHeartbeat();
    return nextCount;
};

const applyStationProfile = (value) => {
    const profile = setActiveStationProfile(value);
    if (profile) {
        display.applyStationProfile(profile);
        updateDisplay({ immediate: true });
    }
    return profile;
};

const applyBoardSettings = (settings = {}) => {
    const source = settings && typeof settings === 'object' ? settings : {};
    const stamp = Number(source.settingsUpdatedAt) || 0;
    if (appliedSettingsAt && stamp < appliedSettingsAt) {
        return;
    }
    if (source.stationProfile) {
        applyStationProfile(source.stationProfile);
    }
    if (typeof source.delayOffset === 'boolean') {
        const nextOffset = normalizeDelayOffset(source.delayOffset);
        if (nextOffset !== delayOffset) {
            delayOffset = nextOffset;
            display.setDelayOffset(delayOffset);
            updateDisplay();
        }
    }
    if (source.departureBoardLogo != null
        || source.departureBoardLogoSvg != null) {
        rememberLogo({
            ...currentLogo,
            ...source,
            settingsUpdatedAt: stamp || appliedSettingsAt
        });
        applyBoardLogo(currentLogo);
    } else if (stamp) {
        appliedSettingsAt = Math.max(appliedSettingsAt, stamp);
    }
    if (source.lenses && !boardLensColors) {
        display.setLensSettings(source.lenses);
    }
};

const applyDepartureSnapshot = (
    nextDepartures,
    nextRevision,
    { immediate = false, timing = null } = {}
) => {
    const numericRevision = Number(nextRevision) || 0;
    if (numericRevision < revision) {
        return false;
    }

    const nextValues = Array.isArray(nextDepartures) ? nextDepartures : [];
    const nextTiming = timing && !boardFlapTimingCustom
        ? resolveBoardFlapTiming(timing, DEPARTURE_FLAP_TIMING_DEFAULTS)
        : boardTiming;
    const nextSignature = getSnapshotSignature(nextValues, nextTiming);
    if (numericRevision === revision
        && nextSignature === snapshotSignature) {
        return false;
    }

    departures = nextValues;
    revision = numericRevision;
    if (timing && !boardFlapTimingCustom) {
        boardTiming = nextTiming;
        display.setTiming(boardTiming);
        boardClock?.setTiming(boardTiming);
    }
    snapshotSignature = nextSignature;
    updateDisplay({ immediate });
    publishHeartbeat();
    return true;
};

const publishHello = () => {
    transport.publish('departure-board:hello', {
        page: 'departureBoard',
        revision
    });
};

const stopHelloRetry = () => {
    if (helloRetryTimer !== null) {
        window.clearInterval(helloRetryTimer);
        helloRetryTimer = null;
    }
};

const getPresencePayload = () => ({
    page: 'departureBoard',
    boardId: 'departure-board',
    instanceId: transport.id,
    configured: true,
    capabilities: [
        'departure-board',
        'departure-snapshot',
        'identify-lenses'
    ],
    appliedRevision: revision,
    rowCount: display.rows.length,
    lensColors: boardLensColors
        || (display.lensSettings?.lenses || []).slice(0, 2).map((lens) => lens.color),
    synchronizeRows: boardSynchronizeRows,
    flapTiming: boardTiming,
    audio: audio.getState(),
    identificationActive,
    userAgent: String(globalThis.navigator?.userAgent || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 400)
});

const acknowledge = (message, payload = {}) => {
    transport.publish('command:ack', {
        boardId: 'departure-board',
        instanceId: transport.id,
        revision,
        identificationActive,
        ...payload
    }, {
        requestId: message.requestId,
        target: {
            source: message.source
        }
    });
};

const setIdentificationActive = (forceOn) => {
    identificationActive = display.setIdentificationActive(forceOn);
    return identificationActive;
};

const applyBoardLensColors = (colors) => {
    const parsed = parseLensColors(colors);
    if (!parsed) {
        return null;
    }

    boardLensColors = parsed;
    display.setLensSettings(lensTemplate(parsed));
    return parsed;
};

const handleCommand = (message) => {
    const {
        action,
        forceOn,
        muted,
        volume,
        rowCount,
        colors,
        synchronizeRows,
        flapTiming
    } = message.payload || {};
    if (message.target?.source !== transport.id) {
        return;
    }

    if (action === 'set-row-count') {
        const numeric = Number(rowCount);
        if (!Number.isInteger(numeric)
            || numeric < DEPARTURE_BOARD_ROW_COUNT_MIN
            || numeric > DEPARTURE_BOARD_ROW_COUNT_MAX) {
            acknowledge(message, {
                ok: false,
                error: 'Počet řádků musí být celé číslo od 1 do 24.'
            });
            return;
        }

        applyRowCount(numeric);
        acknowledge(message, {
            ok: true,
            rowCount: display.rows.length
        });
        publishHeartbeat();
        return;
    }

    if (action === 'set-flap-timing') {
        const nextTiming = normalizeFlapTiming(flapTiming);
        boardFlapTimingCustom = true;
        boardTiming = nextTiming;
        display.setTiming(boardTiming);
        boardClock?.setTiming(boardTiming);
        snapshotSignature = getSnapshotSignature(departures, boardTiming);
        acknowledge(message, {
            ok: true,
            flapTiming: nextTiming
        });
        publishHeartbeat();
        return;
    }

    if (action === 'set-synchronize-rows') {
        boardSynchronizeRows = synchronizeRows !== false;
        display.setSynchronizeRows(boardSynchronizeRows);
        acknowledge(message, {
            ok: true,
            synchronizeRows: boardSynchronizeRows
        });
        publishHeartbeat();
        return;
    }

    if (action === 'set-lens-colors') {
        const parsed = applyBoardLensColors(colors);
        if (!parsed) {
            acknowledge(message, {
                ok: false,
                error: 'Neplatná barva čoček.'
            });
            return;
        }

        acknowledge(message, {
            ok: true,
            lensColors: parsed
        });
        publishHeartbeat();
        return;
    }

    if (action === 'set-audio-muted') {
        audio.setMuted(muted === true);
        acknowledge(message, {
            ok: true,
            audio: audio.getState()
        });
        publishHeartbeat();
        return;
    }

    if (action === 'set-audio-volume') {
        audio.setVolume(volume);
        acknowledge(message, {
            ok: true,
            audio: audio.getState()
        });
        publishHeartbeat();
        return;
    }

    if (action !== 'identify-lenses') {
        return;
    }

    try {
        setIdentificationActive(forceOn);
        acknowledge(message, {
            ok: true,
            identificationActive
        });
        publishHeartbeat();
    } catch (error) {
        acknowledge(message, {
            ok: false,
            error: error instanceof Error
                ? error.message
                : 'Čočky se nepodařilo přepnout do identifikačního režimu.'
        });
    }
};

const publishReady = () => {
    transport.publish('board:ready', getPresencePayload());
};

const publishHeartbeat = () => {
    transport.publish('board:heartbeat', getPresencePayload());
};

transport.subscribe((message) => {
    if (message.type === 'station-profile') {
        applyStationProfile(
            message.payload?.stationProfile || message.payload
        );
        return;
    }

    if (message.type === 'manage:departures') {
        liveSnapshotReceived = true;
        manageSnapshotReceived = true;
        stopHelloRetry();
        applyDepartureSnapshot(
            recoverDepartures(
                message.payload?.departures,
                getCurrentDesiredStates(),
                { includeMissing: false }
            ),
            message.payload?.revision
        );
        return;
    }

    if (message.type === 'board:settings') {
        applyBoardSettings(message.payload);
        publishHeartbeat();
        return;
    }

    if (message.type === 'manage:discover') {
        publishReady();
        if (!manageSnapshotReceived) {
            publishHello();
        }
        return;
    }

    if (message.type === 'board:command') {
        handleCommand(message);
    }
});

const storageHandler = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
    }

    try {
        const nextState = JSON.parse(event.newValue);
        liveSnapshotReceived = true;
        applyBoardSettings(nextState.settings || nextState);
        applyDepartureSnapshot(
            recoverDepartures(
                nextState.departures,
                nextState.desired || savedDesiredStates
            ),
            nextState.revision
        );
    } catch {
        // Ignore malformed persistence updates.
    }
};

window.addEventListener('storage', storageHandler);
removeStorageListener = () =>
    window.removeEventListener('storage', storageHandler);

const pollPersistedState = () => {
    const nextState = storage.load();
    if (!nextState || typeof nextState !== 'object') {
        return;
    }

    liveSnapshotReceived = true;
    applyBoardSettings(nextState.settings || nextState);
    applyDepartureSnapshot(
        recoverDepartures(
            nextState.departures,
            nextState.desired || savedDesiredStates
        ),
        nextState.revision
    );
};

// Some browsers expose BroadcastChannel on file:// but still do not deliver
// its messages reliably. Persistence polling is the required fallback for
// that protocol; HTTP pages can rely on BroadcastChannel.
if (!transport.channel || window.location.protocol === 'file:') {
    persistencePollTimer = window.setInterval(pollPersistedState, 1000);
}

unsubscribeAudio = audio.subscribe(() => {
    publishHeartbeat();
});

// The board always starts physically empty after a refresh. Stored/live
// departures are then applied through the normal row-by-row animation queue.
updateDisplay();
publishReady();
publishHello();
let helloAttempts = 0;
helloRetryTimer = window.setInterval(() => {
    if (liveSnapshotReceived || helloAttempts >= 10) {
        stopHelloRetry();
        return;
    }
    helloAttempts += 1;
    publishHello();
}, 1000);
scheduleInitialSnapshot(() => {
    if (liveSnapshotReceived) {
        return;
    }

    applyDepartureSnapshot(
        persistedDepartures,
        persistedRevision,
        { timing: initialTiming }
    );
    liveSnapshotReceived = true;
    stopHelloRetry();
});
heartbeatTimer = window.setInterval(publishHeartbeat, 4000);

window.pragotronDepartureBoard = {
    display,
    audio,
    transport,
    getDepartures: () => departures.map((departure) => ({
        ...departure,
        target: { ...departure.target },
        stations: [...departure.stations]
    })),
    getRowCount: () => display.rows.length,
    setRowCount: (value) => applyRowCount(value),
    refresh: updateDisplay,
    destroy: () => {
        destroyed = true;
        window.clearTimeout(boardClockTimer);
        boardClockTimer = null;
        clearLensActivationTimer();
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        window.clearInterval(persistencePollTimer);
        persistencePollTimer = null;
        stopHelloRetry();
        removeStorageListener?.();
        removeStorageListener = null;
        unsubscribeAudio?.();
        unsubscribeAudio = null;
        display.destroy();
        audio.destroy();
        transport.close();
    }
};
