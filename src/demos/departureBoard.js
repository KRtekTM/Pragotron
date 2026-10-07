import {
    BoardTransport,
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
    DepartureBoardDisplay,
    LocalStorageAdapter,
    SplitFlapAudio,
    getBoardIdentityKey,
    getEffectiveDepartureDate,
    DELAY_OFFSET_DEFAULT,
    normalizeDelayOffset,
    normalizeDepartureBoardRowCount,
    normalizeFlapTiming
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
const initialTiming = normalizeFlapTiming(savedSettings.flapTiming);
const requestedRowCount = new URLSearchParams(window.location.search).get('rows');
const urlLocksRowCount = requestedRowCount != null && requestedRowCount !== '';
const initialRowCount = urlLocksRowCount
    ? normalizeDepartureBoardRowCount(requestedRowCount)
    : normalizeDepartureBoardRowCount(
        savedSettings.departureBoardRows ?? DEPARTURE_BOARD_ROW_COUNT_DEFAULT
    );
let delayOffset = normalizeDelayOffset(
    savedSettings.delayOffset ?? DELAY_OFFSET_DEFAULT
);
const display = new DepartureBoardDisplay(root, {
    audio,
    timing: initialTiming,
    rowCount: initialRowCount,
    applyDelayOffset: delayOffset
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
            stations: [
                departure?.stations?.[0]
                    || departure?.stationOne
                    || desiredState.stations?.[0]
                    || desiredState.stationOne
                    || '',
                departure?.stations?.[1]
                    || departure?.stationTwo
                    || desiredState.stations?.[1]
                    || desiredState.stationTwo
                    || ''
            ],
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

const applyBoardSettings = (settings = {}) => {
    const source = settings && typeof settings === 'object' ? settings : {};
    if (source.flapTiming) {
        boardTiming = normalizeFlapTiming(source.flapTiming);
        display.setTiming(boardTiming);
        snapshotSignature = getSnapshotSignature(departures, boardTiming);
    }
    if (source.departureBoardRows != null && !urlLocksRowCount) {
        applyRowCount(source.departureBoardRows);
    }
    if (typeof source.delayOffset === 'boolean') {
        const nextOffset = normalizeDelayOffset(source.delayOffset);
        if (nextOffset !== delayOffset) {
            delayOffset = nextOffset;
            display.setDelayOffset(delayOffset);
            updateDisplay();
        }
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
    const nextTiming = timing ? normalizeFlapTiming(timing) : boardTiming;
    const nextSignature = getSnapshotSignature(nextValues, nextTiming);
    if (numericRevision === revision
        && nextSignature === snapshotSignature) {
        return false;
    }

    departures = nextValues;
    revision = numericRevision;
    if (timing) {
        boardTiming = nextTiming;
        display.setTiming(boardTiming);
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
    audio: audio.getState(),
    identificationActive
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

const handleCommand = (message) => {
    const { action, forceOn } = message.payload || {};
    if (action !== 'identify-lenses'
        || message.target?.source !== transport.id) {
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
    if (message.type === 'manage:departures') {
        liveSnapshotReceived = true;
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
        return;
    }

    if (message.type === 'manage:discover') {
        publishReady();
        publishHello();
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
            nextState.revision,
            {
                timing: (nextState.settings || nextState).flapTiming
            }
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
        nextState.revision,
        {
            timing: (nextState.settings || nextState).flapTiming
        }
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
