import {
    AnalogClock,
    createSlaveClock,
    hasSourceClock,
    setSourceClock,
    sourceDelay,
    sourceNow,
    sourcePace,
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
    createEmptyLensState,
    createDefaultRegistry,
    createEmptyBoardState,
    getEffectiveDepartureDate,
    DELAY_OFFSET_DEFAULT,
    normalizeSunScheduleSettings,
    normalizeDelayOffset,
    PLATFORM_FLAP_TIMING_DEFAULTS,
    resolveBoardFlapTiming,
    parseDelayMinutes,
    parseLensColors,
    readInitialLensColors,
    getActiveStationProfile,
    readStoredStationProfile,
    setActiveStationProfile
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
let sunScheduleSettings = normalizeSunScheduleSettings(
    savedSettings?.sunSchedule
);
let delayOffset = normalizeDelayOffset(
    savedSettings?.delayOffset ?? DELAY_OFFSET_DEFAULT
);
let heartbeatTimer = null;
let commandQueue = Promise.resolve();
let boardLensColors = readInitialLensColors();

const forgetSessionKey = (key) => {
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // A missing store still starts from the default for this page view.
    }
};

forgetSessionKey('pragotron.board.lighting.v1');
let boardLightingCustom = false;

const withBoardLensColors = (state) => {
    if (!boardLensColors || !state?.lenses?.lenses) {
        return state;
    }

    return {
        ...state,
        lenses: {
            ...state.lenses,
            lenses: state.lenses.lenses.map((lens, index) => ({
                ...lens,
                color: boardLensColors[index] || boardLensColors[0]
            }))
        }
    };
};

const paintBoardLensColors = () => {
    if (!boardLensColors) {
        return;
    }

    currentDisplayState = withBoardLensColors(
        currentDisplayState || createEmptyDisplayState()
    );
    if (identificationActive) {
        normalLensState = cloneLensState(currentDisplayState.lenses);
        applyIdentificationLensState();
        return;
    }

    lensDisplay.set(currentDisplayState.lenses || createEmptyLensState());
};

const createEmptyDisplayState = () => ({
    ...createEmptyBoardState(),
    lenses: createEmptyLensState()
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
        && getActiveStationProfile().trainTypes.some((type) =>
            type.name === state.train
        )
        && parseDelayMinutes(state.delay) !== null
        && validTime;
};

const audio = new SplitFlapAudio();
forgetSessionKey('pragotron.board.flapTiming.v1');
let boardFlapTimingCustom = false;
const storedStationProfile = readStoredStationProfile();
if (storedStationProfile) {
    setActiveStationProfile(storedStationProfile, { persist: false });
}

const board = createBoard({
    root: documentRef.querySelector(PLATFORM_TABLE_TEMPLATE.rootSelector),
    slots: PLATFORM_TABLE_TEMPLATE.slots,
    registry: createDefaultRegistry({ audio }),
    initialState: createEmptyDisplayState(),
    flapTiming: resolveBoardFlapTiming(
        null,
        PLATFORM_FLAP_TIMING_DEFAULTS
    )
});
if (storedStationProfile) {
    board.getComponent('train')?.setTypes?.(storedStationProfile.trainTypes);
}

const lensDisplay = board.getComponent('lenses');
let lensActivationTimer = null;
let lensActivationToken = 0;
let lensAnimationStartedAt = Date.now();
let currentDisplayState = createEmptyDisplayState();
let identificationActive = false;
let normalLensState = null;
paintBoardLensColors();
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

const getEffectiveDeparture = (state) => getEffectiveDepartureDate(
    state?.departureTime,
    state?.delay,
    sourceNow(),
    delayOffset
);

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
    const delay = sourceDelay(activationTime);
    if (delay === null) {
        setLensPreDepartureActive(false);
        return;
    }
    if (delay === 0) {
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
    }, delay);
};

const cloneLensState = (value) => {
    const fallback = createDefaultLensState();
    return {
        lenses: Array.isArray(value?.lenses)
            ? value.lenses.map((lens, index) => {
                const fallbackLens =
                    fallback.lenses[index] || fallback.lenses[0];
                return {
                    ...fallbackLens,
                    ...lens,
                    blinkInterval: fallbackLens.blinkInterval,
                    blinkDelay: index * fallbackLens.blinkInterval
                };
            })
            : fallback.lenses.map((lens) => ({ ...lens })),
        preDeparture: {
            ...fallback.preDeparture,
            ...(value?.preDeparture || {})
        },
        synchronizeRows: value?.synchronizeRows !== false
    };
};

const applyIdentificationLensState = () => {
    const source = normalLensState
        || currentDisplayState.lenses
        || createEmptyLensState();
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
            || createEmptyLensState()
    );
    normalLensState = null;
    scheduleLensActivation(currentDisplayState);
    return identificationActive;
};

const setBoardState = (state, options = {}) => {
    cancelLensActivation();
    const nextState = withBoardLensColors(state || createEmptyDisplayState());
    currentDisplayState = nextState;
    if (identificationActive) {
        normalLensState = nextState.lenses || createEmptyLensState();
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
    clockBlock: documentRef.querySelector('#clockBlock')
}).mount();

const platformSlaveClock = createSlaveClock({
    hasSourceClock,
    sourceNow,
    sourcePace
});
const analogClock = new AnalogClock(
    documentRef.querySelector('#pragotronAnalogClock'),
    { now: () => platformSlaveClock.now() }
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
        autoNightMode: automaticNightMode,
        sunSchedule: sunScheduleSettings
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
        autoNightMode: automaticNightMode,
        sunSchedule: sunScheduleSettings
    });
};

const sunSchedule = new SunSchedule({
        settings: sunScheduleSettings,
        now: sourceNow,
        clockRate: () => hasSourceClock() ? sourcePace() : 1,
        onChange: (isNight) => {
        if (!automaticNightMode) {
            return;
        }

        setNightMode(isNight);
        persistNightModeState();
        publishBoardMode();
    }
});

const syncAutomaticNightMode = () => {
    if (!automaticNightMode) {
        sunSchedule.stop();
        return;
    }

    if (sunSchedule.running) {
        sunSchedule.update();
        return;
    }

    sunSchedule.start();
};

const handleVisibilityChange = () => {
    if (!documentRef.hidden) {
        syncAutomaticNightMode();
    }
};
documentRef.addEventListener('visibilitychange', handleVisibilityChange);

const applyStationProfile = (value) => {
    const profile = setActiveStationProfile(value);
    if (profile) {
        board.getComponent('train')?.setTypes?.(profile.trainTypes);
    }
    return profile;
};

const applySettings = ({
    lamps,
    clockLight,
    nightMode,
    autoNightMode,
    sunSchedule: nextSunSchedule,
    flapTiming,
    delayOffset: nextDelayOffset,
    stationProfile
} = {}) => {
    if (stationProfile) {
        applyStationProfile(stationProfile);
    }
    if (flapTiming && !boardFlapTimingCustom) {
        board.setFlapTiming(resolveBoardFlapTiming(
            flapTiming,
            PLATFORM_FLAP_TIMING_DEFAULTS
        ));
    }
    if (typeof nextDelayOffset === 'boolean') {
        delayOffset = normalizeDelayOffset(nextDelayOffset);
        board.setDelayOffset(delayOffset);
        scheduleLensActivation(currentDisplayState);
    }
    if (lamps && !boardLightingCustom) {
        nightLighting.setLampSettings(lamps);
    }
    if (clockLight && !boardLightingCustom) {
        nightLighting.setClockLight(clockLight);
    }
    if (typeof autoNightMode === 'boolean') {
        automaticNightMode = autoNightMode;
    }
    if (nextSunSchedule) {
        sunScheduleSettings = normalizeSunScheduleSettings(nextSunSchedule);
        sunSchedule.setSettings(sunScheduleSettings);
    }
    if (typeof nightMode === 'boolean' && !automaticNightMode) {
        setNightMode(nightMode);
    }
    syncAutomaticNightMode();
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

const getBoardLensColors = () => {
    const lenses = (normalLensState || lensDisplay.getValue())?.lenses || [];
    return [
        boardLensColors?.[0] || lenses[0]?.color || 'green',
        boardLensColors?.[1] || lenses[1]?.color || lenses[0]?.color || 'green'
    ];
};

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
        lensColors: getBoardLensColors(),
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
        lensColors: getBoardLensColors(),
        lamps: nightLighting.getLampSettings(),
        clockLight: nightLighting.getClockSettings(),
        flapTiming: board.getFlapTiming(),
        audio: audio.getState(),
        identificationActive,
        userAgent: String(globalThis.navigator?.userAgent || '')
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .trim()
            .slice(0, 400)
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
        lensColors: getBoardLensColors(),
        lamps: nightLighting.getLampSettings(),
        clockLight: nightLighting.getClockSettings(),
        flapTiming: board.getFlapTiming(),
        audio: audio.getState(),
        identificationActive,
        userAgent: String(globalThis.navigator?.userAgent || '')
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .trim()
            .slice(0, 400)
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
        muted,
        volume,
        colors,
        lamps,
        clockLight,
        flapTiming,
        immediate = false
    } = message.payload || {};

    try {
        const isTargetedAction = action === 'apply-board'
            || action === 'reset-board';
        const isIdentificationAction = action === 'identify-lenses';
        const isAudioMuteAction = action === 'set-audio-muted';
        const isAudioVolumeAction = action === 'set-audio-volume';
        const isLensColorAction = action === 'set-lens-colors';
        const isLightingAction = action === 'set-lighting';
        const isFlapTimingAction = action === 'set-flap-timing';
        if (isTargetedAction) {
            if (!message.payload?.target
                || !identitiesMatch(boardIdentity, message.payload.target)) {
                return;
            }
        }
        if ((isIdentificationAction
            || isAudioMuteAction
            || isAudioVolumeAction
            || isLensColorAction
            || isLightingAction
            || isFlapTimingAction)
            && message.target?.source !== transport.id) {
            return;
        }

        if (![
            'apply-board',
            'reset-board',
            'reset-all',
            'identify-lenses',
            'set-audio-muted',
            'set-audio-volume',
            'set-lens-colors',
            'set-lighting',
            'set-flap-timing'
        ].includes(action)) {
            throw new Error('Neznámá akce tabule.');
        }

        if (isAudioMuteAction) {
            audio.setMuted(muted === true);
            acknowledge(message, {
                ok: true,
                audio: audio.getState()
            });
            publishHeartbeat();
            return;
        }

        if (isAudioVolumeAction) {
            audio.setVolume(volume);
            acknowledge(message, {
                ok: true,
                audio: audio.getState()
            });
            publishHeartbeat();
            return;
        }

        if (isFlapTimingAction) {
            const nextTiming = board.setFlapTiming(flapTiming);
            boardFlapTimingCustom = true;
            acknowledge(message, {
                ok: true,
                flapTiming: nextTiming
            });
            publishHeartbeat();
            return;
        }

        if (isLightingAction) {
            if (lamps && typeof lamps === 'object') {
                nightLighting.setLampSettings(lamps);
            }
            if (clockLight && typeof clockLight === 'object') {
                nightLighting.setClockLight(clockLight);
            }
            boardLightingCustom = true;
            acknowledge(message, {
                ok: true,
                lamps: nightLighting.getLampSettings(),
                clockLight: nightLighting.getClockSettings()
            });
            publishHeartbeat();
            return;
        }

        if (isLensColorAction) {
            const parsed = parseLensColors(colors);
            if (!parsed) {
                throw new Error('Neplatná barva čoček.');
            }

            boardLensColors = parsed;
            paintBoardLensColors();
            acknowledge(message, {
                ok: true,
                lensColors: parsed
            });
            publishHeartbeat();
            return;
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
    if (message.type === 'manage:departures'
        && Object.prototype.hasOwnProperty.call(message.payload || {}, 'clock')) {
        setSourceClock(message.payload.clock);
        syncAutomaticNightMode();
        scheduleLensActivation(currentDisplayState);
        return;
    }

    if (message.type === 'station-profile') {
        applyStationProfile(
            message.payload?.stationProfile || message.payload
        );
        return;
    }

    if (message.type === 'manage:hello'
        || message.type === 'manage:discover') {
        publishReady();
        return;
    }

    if (message.type === 'board:command') {
        if (message.payload?.action === 'identify-lenses'
            || message.payload?.action === 'set-audio-muted'
            || message.payload?.action === 'set-audio-volume'
            || message.payload?.action === 'set-lens-colors'
            || message.payload?.action === 'set-lighting'
            || message.payload?.action === 'set-flap-timing') {
            // Instance actions must stay responsive during a long flap animation.
            void handleCommand(message);
        } else {
            commandQueue = commandQueue.then(() => handleCommand(message));
        }
        return;
    }

    if (message.type === 'board:settings') {
        applySettings(message.payload);
        publishHeartbeat();
    }
});

applySettings({
    nightMode: savedSettings?.nightMode === true,
    autoNightMode: automaticNightMode,
    delayOffset
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
        documentRef.removeEventListener('visibilitychange', handleVisibilityChange);
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
