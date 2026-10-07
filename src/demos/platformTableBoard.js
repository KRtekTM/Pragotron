import {
    NIGHT_CLOCK_DEFAULTS,
    AnalogClock,
    BoardTransport,
    LocalStorageAdapter,
    NightLighting,
    SplitFlapAudio,
    SunSchedule,
    createBoard,
    createDefaultLensState,
    createDefaultRegistry,
    createEmptyBoardState,
    getDisplayedDelay
} from '../platform/index.js';
import { PLATFORM_TABLE_TEMPLATE } from '../templates/platformTable.js';

const STORAGE_KEY = 'pragotron.platformTable.state.v1';
const documentRef = document;
const storage = new LocalStorageAdapter(STORAGE_KEY);
const savedState = storage.load();
const transport = new BoardTransport();
let automaticNightMode = savedState?.autoNightMode === true;

const createEmptyDisplayState = () => ({
    ...createEmptyBoardState(),
    lenses: createDefaultLensState()
});

const board = createBoard({
    root: documentRef.querySelector(PLATFORM_TABLE_TEMPLATE.rootSelector),
    slots: PLATFORM_TABLE_TEMPLATE.slots,
    registry: createDefaultRegistry({ audio: new SplitFlapAudio() }),
    initialState: createEmptyDisplayState()
});

const lensDisplay = board.getComponent('lenses');
let lensActivationTimer = null;
let lensActivationToken = 0;

const cancelLensActivation = () => {
    lensActivationToken += 1;

    if (lensActivationTimer !== null) {
        window.clearTimeout(lensActivationTimer);
        lensActivationTimer = null;
    }
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
        lensDisplay.setPreDepartureActive(true);
        return;
    }

    const departure = getEffectiveDeparture(state);
    if (!departure) {
        lensDisplay.setPreDepartureActive(true);
        return;
    }

    const activationTime = departure.getTime() - preDeparture.seconds * 1000;
    if (activationTime <= Date.now()) {
        lensDisplay.setPreDepartureActive(true);
        return;
    }

    lensDisplay.setPreDepartureActive(false);
    const token = lensActivationToken;
    lensActivationTimer = window.setTimeout(() => {
        if (token !== lensActivationToken) {
            return;
        }

        lensActivationTimer = null;
        lensDisplay.setPreDepartureActive(true);
    }, activationTime - Date.now());
};

const setBoardState = (state, options = {}) => {
    cancelLensActivation();
    const nextState = state || createEmptyDisplayState();
    const result = board.setState(nextState, options);
    scheduleLensActivation(nextState);
    return result;
};

const screenElement = documentRef.querySelector('#skrin');
const nightLighting = new NightLighting({
    root: screenElement,
    clockBlock: documentRef.querySelector('#clockBlock'),
    initialLamps: savedState?.lamps || {},
    initialClock: savedState?.clockLight || NIGHT_CLOCK_DEFAULTS
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
    storage.save({
        ...currentState,
        nightMode: nightLighting.isNightMode(),
        autoNightMode: automaticNightMode
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

const acknowledge = (requestId, payload = {}) => {
    transport.publish('command:ack', {
        requestId,
        ...payload
    });
};

const publishReady = () => {
    transport.publish('board:ready', {
        page: 'platformTable',
        capabilities: ['apply-board', 'reset-board', 'reset-all'],
        nightMode: nightLighting.isNightMode(),
        autoNightMode: automaticNightMode
    });
};

const handleCommand = async (message) => {
    const {
        action,
        state,
        settings,
        immediate = false
    } = message.payload || {};

    try {
        if (settings) {
            applySettings(settings);
        }

        if (action === 'apply-board' || action === 'reset-board') {
            setBoardState(state || createEmptyDisplayState(), { immediate });
            if (!immediate) {
                await waitForBoardToSettle();
            }
        } else if (action === 'reset-all') {
            setBoardState(createEmptyDisplayState(), { immediate: true });
        }

        acknowledge(message.requestId, { ok: true });
    } catch (error) {
        acknowledge(message.requestId, {
            ok: false,
            error: error instanceof Error
                ? error.message
                : 'Tabuli se nepodařilo aktualizovat.'
        });
    }
};

transport.subscribe((message) => {
    if (message.type === 'manage:hello') {
        publishReady();
        return;
    }

    if (message.type === 'board:command') {
        handleCommand(message);
        return;
    }

    if (message.type === 'board:settings') {
        applySettings(message.payload);
    }
});

applySettings({
    nightMode: savedState?.nightMode === true,
    autoNightMode: automaticNightMode
});
publishReady();

window.pragotron = {
    board,
    lighting: nightLighting,
    clock: analogClock,
    transport,
    getState: () => board.getState(),
    setState: (state, options) => setBoardState(state, options),
    setNightMode,
    destroy: () => {
        cancelLensActivation();
        sunSchedule.destroy();
        transport.close();
        board.destroy();
        nightLighting.destroy();
        analogClock.destroy();
    }
};
