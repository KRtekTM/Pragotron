import {
    NIGHT_CLOCK_DEFAULTS,
    AnalogClock,
    BoardTransport,
    getBoardIdentityKey,
    identitiesMatch,
    loadBoardIdentity,
    LocalStorageAdapter,
    NightLighting,
    saveBoardIdentity,
    SplitFlapAudio,
    SunSchedule,
    createBoard,
    createDefaultLensState,
    createDefaultRegistry,
    createEmptyBoardState,
    getDisplayedDelay,
    parseDelayMinutes,
    TRAIN_TYPES
} from '../platform/index.js';
import { PLATFORM_TABLE_TEMPLATE } from '../templates/platformTable.js';

const STORAGE_KEY = 'pragotron.platformTable.state.v2';
const LEGACY_STORAGE_KEY = 'pragotron.platformTable.state.v1';
const documentRef = document;
const storage = new LocalStorageAdapter(STORAGE_KEY);
const legacyStorage = new LocalStorageAdapter(LEGACY_STORAGE_KEY);
const currentState = storage.load();
const legacyState = currentState ? null : legacyStorage.load();
const savedState = currentState || legacyState || {};
if (!currentState && legacyState) {
    storage.save({
        ...legacyState,
        version: 2
    });
}
const savedSettings = savedState.settings || savedState;
let boardIdentity = loadBoardIdentity();
const transport = new BoardTransport({
    boardId: getBoardIdentityKey(boardIdentity)
});
let appliedRevision = 0;
let automaticNightMode = savedSettings?.autoNightMode === true;
let heartbeatTimer = null;
let commandQueue = Promise.resolve();

const createEmptyDisplayState = () => ({
    ...createEmptyBoardState(),
    lenses: createDefaultLensState()
});

const normalizeIncomingBoardState = (state) => {
    const source = state && typeof state === 'object' ? state : {};
    const stations = Array.isArray(source.stations)
        ? source.stations
        : [source.stationOne, source.stationTwo];

    return {
        ...source,
        stations: [stations[0] || '', stations[1] || '']
    };
};

const isValidBoardState = (state) => {
    const departureTime = state?.departureTime;
    const validTime = departureTime === null
        || (
            Number.isInteger(Number(departureTime?.hours))
            && Number(departureTime.hours) >= 0
            && Number(departureTime.hours) <= 23
            && Number.isInteger(Number(departureTime?.minutes))
            && Number(departureTime.minutes) >= 0
            && Number(departureTime.minutes) <= 59
        );
    const validStations = Array.isArray(state?.stations)
        && state.stations.length >= 2
        && state.stations.slice(0, 2).every(
            (station) => typeof station === 'string' && station.length <= 14
        );
    return validStations
        && TRAIN_TYPES.some((type) => type.name === state.train)
        && parseDelayMinutes(state.delay) !== null
        && validTime;
};

const audio = new SplitFlapAudio();
const board = createBoard({
    root: documentRef.querySelector(PLATFORM_TABLE_TEMPLATE.rootSelector),
    slots: PLATFORM_TABLE_TEMPLATE.slots,
    registry: createDefaultRegistry({ audio }),
    initialState: createEmptyDisplayState()
});

const lensDisplay = board.getComponent('lenses');
let lensActivationTimer = null;
let lensActivationToken = 0;
let lensAnimationStartedAt = Date.now();
let currentDisplayState = createEmptyDisplayState();
let identificationActive = false;
let normalLensState = null;
let operationalPreDepartureActive = true;

const cancelLensActivation = () => {
    lensActivationToken += 1;

    if (lensActivationTimer !== null) {
        window.clearTimeout(lensActivationTimer);
        lensActivationTimer = null;
    }
};

const setLensPreDepartureActive = (isActive) => {
    operationalPreDepartureActive = Boolean(isActive);
    lensDisplay.setPreDepartureActive(isActive);
    lensAnimationStartedAt = Date.now();
};

const getEffectiveDeparture = (state) => {
    const departureTime = state?.departureTime;
    const hours = Number(departureTime?.hours);
    const minutes = Number(departureTime?.minutes);

    if (!Number.isInteger(hours) || hours < 0 || hours > 23
        || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    const departure = new Date();
    departure.setHours(hours, minutes, 0, 0);

    const displayedDelay = getDisplayedDelay(state.delay);
    if (displayedDelay !== '') {
        departure.setMinutes(departure.getMinutes() + displayedDelay);
    }

    return departure;
};

const scheduleLensActivation = (state) => {
    cancelLensActivation();

    const lensState = lensDisplay.getValue();
    const preDeparture = lensState.preDeparture;
    const hasBlinkingLens = lensState.lenses.some(
        (lens) => lens.enabled && lens.blinking
    );

    if (!preDeparture.enabled || !hasBlinkingLens) {
        setLensPreDepartureActive(true);
        return;
    }

    const departure = getEffectiveDeparture(state);
    if (!departure) {
        setLensPreDepartureActive(true);
        return;
    }

    const activationTime = departure.getTime() - preDeparture.seconds * 1000;
    if (activationTime <= Date.now()) {
        setLensPreDepartureActive(true);
        return;
    }

    setLensPreDepartureActive(false);
    const token = lensActivationToken;
    lensActivationTimer = window.setTimeout(() => {
        if (token !== lensActivationToken) {
            return;
        }

        lensActivationTimer = null;
        setLensPreDepartureActive(true);
        publishHeartbeat();
    }, activationTime - Date.now());
};

const cloneLensState = (value) => ({
    lenses: Array.isArray(value?.lenses)
        ? value.lenses.map((lens) => ({ ...lens }))
        : createDefaultLensState().lenses,
    preDeparture: {
        ...(value?.preDeparture || {})
    }
});

const applyIdentificationLensState = () => {
    const source = normalLensState
        || currentDisplayState.lenses
        || createDefaultLensState();
    lensDisplay.set({
        lenses: source.lenses.map((lens) => ({
            ...lens,
            enabled: true,
            blinking: false
        })),
        preDeparture: {
            ...source.preDeparture,
            enabled: false
        }
    });
    // Identification must not alter the operational/pre-departure state
    // reported to manage or used by the departure row indicators.
    lensDisplay.setPreDepartureActive(true);
};

const setIdentificationActive = (forceOn) => {
    const nextValue = Boolean(forceOn);
    if (nextValue === identificationActive) {
        if (nextValue) {
            applyIdentificationLensState();
        }
        return identificationActive;
    }

    if (nextValue) {
        normalLensState = cloneLensState(
            currentDisplayState.lenses || lensDisplay.getValue()
        );
        identificationActive = true;
        cancelLensActivation();
        applyIdentificationLensState();
        return identificationActive;
    }

    identificationActive = false;
    lensDisplay.set(
        normalLensState
            || currentDisplayState.lenses
            || createDefaultLensState()
    );
    normalLensState = null;
    scheduleLensActivation(currentDisplayState);
    return identificationActive;
};

const setBoardState = (state, options = {}) => {
    cancelLensActivation();
    const nextState = state || createEmptyDisplayState();
    currentDisplayState = nextState;
    if (identificationActive) {
        normalLensState = nextState.lenses || createDefaultLensState();
    }
    const result = board.setState(nextState, options);
    scheduleLensActivation(nextState);
    if (identificationActive) {
        applyIdentificationLensState();
    }
    return result;
};

const screenElement = documentRef.querySelector('#skrin');
audio.bindUserActivation(screenElement || documentRef);
const nightLighting = new NightLighting({
    root: screenElement,
    clockBlock: documentRef.querySelector('#clockBlock'),
    initialLamps: savedSettings?.lamps || {},
    initialClock: savedSettings?.clockLight || NIGHT_CLOCK_DEFAULTS
}).mount();

const analogClock = new AnalogClock(
    documentRef.querySelector('#pragotronAnalogClock')
);

try {
    analogClock.mount();
} catch (error) {
    console.warn('Analogové hodiny se nepodařilo inicializovat.', error);
}

const setNightMode = (isNight) => {
    nightLighting.setNightMode(isNight);
    analogClock.transitionNightMode();
};

const persistNightModeState = () => {
    const currentState = storage.load() || {};
    const modeState = {
        nightMode: nightLighting.isNightMode(),
        autoNightMode: automaticNightMode
    };
    storage.save({
        ...currentState,
        ...modeState,
        settings: {
            ...(currentState.settings || {}),
            ...modeState
        }
    });
};

const publishBoardMode = () => {
    transport.publish('board:mode', {
        nightMode: nightLighting.isNightMode(),
        autoNightMode: automaticNightMode
    });
};

const sunSchedule = new SunSchedule({
    onChange: (isNight) => {
        if (!automaticNightMode) {
            return;
        }

        setNightMode(isNight);
        persistNightModeState();
        publishBoardMode();
    }
});

const applySettings = ({
    lamps,
    clockLight,
    nightMode,
    autoNightMode
} = {}) => {
    if (lamps) {
        nightLighting.setLampSettings(lamps);
    }
    if (clockLight) {
        nightLighting.setClockLight(clockLight);
    }
    if (typeof autoNightMode === 'boolean') {
        automaticNightMode = autoNightMode;
        if (!automaticNightMode) {
            sunSchedule.stop();
        }
    }
    if (typeof nightMode === 'boolean' && !automaticNightMode) {
        setNightMode(nightMode);
    }
    if (automaticNightMode) {
        sunSchedule.start();
    }
};

const waitForBoardToSettle = () => new Promise((resolve) => {
    const check = () => {
        if (board.isSettled()) {
            resolve();
            return;
        }

        window.setTimeout(check, 50);
    };
    check();
});

const getLensPresenceState = () => ({
    ...(normalLensState || lensDisplay.getValue()),
    preDepartureActive: normalLensState
        ? operationalPreDepartureActive
        : lensDisplay.preDepartureActive,
    animationStartedAt: lensAnimationStartedAt
});

const acknowledge = (message, payload = {}) => {
    transport.publish('command:ack', {
        boardId: getBoardIdentityKey(boardIdentity),
        identity: boardIdentity,
        instanceId: transport.id,
        revision: appliedRevision,
        lensState: getLensPresenceState(),
        identificationActive,
        ...payload
    }, {
        requestId: message.requestId,
        target: {
            source: message.source
        }
    });
};

const publishReady = () => {
    transport.publish('board:ready', {
        page: 'platformTable',
        boardId: getBoardIdentityKey(boardIdentity),
        identity: boardIdentity,
        instanceId: transport.id,
        configured: Boolean(boardIdentity.platform && boardIdentity.track),
        capabilities: [
            'apply-board',
            'reset-board',
            'reset-all',
            'identify-lenses'
        ],
        nightMode: nightLighting.isNightMode(),
        autoNightMode: automaticNightMode,
        appliedRevision,
        lensState: getLensPresenceState(),
        audio: audio.getState(),
        identificationActive
    });
};

const publishHeartbeat = () => {
    transport.publish('board:heartbeat', {
        page: 'platformTable',
        boardId: getBoardIdentityKey(boardIdentity),
        identity: boardIdentity,
        instanceId: transport.id,
        configured: Boolean(boardIdentity.platform && boardIdentity.track),
        appliedRevision,
        lensState: getLensPresenceState(),
        audio: audio.getState(),
        identificationActive
    });
};

audio.subscribe(() => {
    publishHeartbeat();
});

const handleCommand = async (message) => {
    const {
        action,
        state,
        settings,
        revision,
        forceOn,
        immediate = false
    } = message.payload || {};

    try {
        const isTargetedAction = action === 'apply-board'
            || action === 'reset-board';
        const isIdentificationAction = action === 'identify-lenses';
        if (isTargetedAction) {
            if (!message.payload?.target
                || !identitiesMatch(boardIdentity, message.payload.target)) {
                return;
            }
        }
        if (isIdentificationAction
            && message.target?.source !== transport.id) {
            return;
        }

        if (![
            'apply-board',
            'reset-board',
            'reset-all',
            'identify-lenses'
        ].includes(action)) {
            throw new Error('Neznámá akce tabule.');
        }

        if (isIdentificationAction) {
            setIdentificationActive(forceOn);
            acknowledge(message, {
                ok: true,
                identificationActive
            });
            publishHeartbeat();
            return;
        }

        if (Number.isFinite(Number(revision))
            && Number(revision) <= appliedRevision) {
            acknowledge(message, { ok: true });
            return;
        }

        if (settings) {
            applySettings(settings);
        }

        if (action === 'apply-board' || action === 'reset-board') {
            const nextState = normalizeIncomingBoardState(
                state || createEmptyDisplayState()
            );
            if (!isValidBoardState(nextState)) {
                throw new Error('Neplatná data odjezdové tabule.');
            }
            setBoardState(nextState, { immediate });
            if (!immediate) {
                await waitForBoardToSettle();
            }
        } else if (action === 'reset-all') {
            setBoardState(createEmptyDisplayState(), { immediate: true });
        }

        if (Number.isFinite(Number(revision))) {
            appliedRevision = Number(revision);
        }
        acknowledge(message, { ok: true });
    } catch (error) {
        acknowledge(message, {
            ok: false,
            error: error instanceof Error
                ? error.message
                : 'Tabuli se nepodařilo aktualizovat.'
        });
    }
};

transport.subscribe((message) => {
    if (message.type === 'manage:hello'
        || message.type === 'manage:discover') {
        publishReady();
        return;
    }

    if (message.type === 'board:command') {
        if (message.payload?.action === 'identify-lenses') {
            // Lens identification is an administrative instance-level action.
            // It must remain responsive while a long flap animation is queued.
            void handleCommand(message);
        } else {
            commandQueue = commandQueue.then(() => handleCommand(message));
        }
        return;
    }

    if (message.type === 'board:settings') {
        applySettings(message.payload);
    }
});

applySettings({
    nightMode: savedSettings?.nightMode === true,
    autoNightMode: automaticNightMode
});
publishReady();
heartbeatTimer = window.setInterval(publishHeartbeat, 4000);

window.pragotron = {
    board,
    lighting: nightLighting,
    clock: analogClock,
    audio,
    identity: boardIdentity,
    transport,
    getState: () => board.getState(),
    getIdentity: () => ({ ...boardIdentity }),
    setState: (state, options) => setBoardState(state, options),
    setNightMode,
    configureIdentity: (value) => {
        const previousBoardId = getBoardIdentityKey(boardIdentity);
        boardIdentity = saveBoardIdentity(value);
        transport.boardId = getBoardIdentityKey(boardIdentity);
        if (transport.boardId !== previousBoardId) {
            appliedRevision = 0;
        }
        window.pragotron.identity = boardIdentity;
        const message = `Identita tabule nastavena: nástupiště ${
            boardIdentity.platform || '—'
        }, kolej ${boardIdentity.track || '—'}, sektor ${
            boardIdentity.sector || 'celá kolej'
        }.`;
        console.info(message);
        publishReady();
        return {
            ...boardIdentity,
            message
        };
    },
    destroy: () => {
        cancelLensActivation();
        sunSchedule.destroy();
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        transport.close();
        board.destroy();
        nightLighting.destroy();
        analogClock.destroy();
        audio.destroy();
    }
};
