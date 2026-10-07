import {
    LENS_BLINK_INTERVAL_MAX,
    LENS_BLINK_INTERVAL_MIN,
    LENS_COLORS,
    LENS_PREDEPARTURE_SECONDS_MAX,
    LENS_PREDEPARTURE_SECONDS_MIN,
    LENS_PREDEPARTURE_SECONDS_STEP,
    NIGHT_CLOCK_DEFAULTS,
    NIGHT_FADE_MODES,
    NIGHT_LIGHT_DEFAULTS,
    parseDelayMinutes,
    TRAIN_TYPES,
    BoardTransport,
    LensDisplay,
    LightingSettings,
    LocalStorageAdapter,
    createDefaultLensState,
    createEmptyBoardState
} from '../platform/index.js';

const STORAGE_KEY = 'pragotron.platformTable.state.v1';
const documentRef = document;
const storage = new LocalStorageAdapter(STORAGE_KEY);
const savedState = storage.load();
const transport = new BoardTransport();

const boardForm = documentRef.querySelector('#boardForm');
const stationInputs = [
    documentRef.querySelector('#stationOne'),
    documentRef.querySelector('#stationTwo')
];
const trainTypeInput = documentRef.querySelector('#trainType');
const departureTimeInput = documentRef.querySelector('#departureTime');
const delayValueInput = documentRef.querySelector('#delayValue');
const boardFormStatus = documentRef.querySelector('#boardFormStatus');
const lensControls = documentRef.querySelector('#lensControls');
const lampSettingsPanel = documentRef.querySelector('#lampSettingsPanel');
const lampControls = documentRef.querySelector('#lampControls');
const clockLightControl = documentRef.querySelector('#clockLightControl');
const clockLightEnabledInput = documentRef.querySelector('#clockLightEnabled');
const clockLightIntensityInput = documentRef.querySelector('#clockLightIntensity');
const clockLightIntensityOutput = documentRef.querySelector(
    '#clockLightIntensityOutput'
);
const resetLampSettingsButton = documentRef.querySelector('#resetLampSettings');
const nightModeButton = documentRef.querySelector('#nightModeButton');
const autoNightModeInput = documentRef.querySelector('#autoNightMode');
const startButton = documentRef.querySelector('#startButton');
const resetAllSettingsButton = documentRef.querySelector('#resetAllSettings');
const submitButton = boardForm.querySelector('button[type="submit"]');

const lighting = new LightingSettings({
    initialLamps: savedState?.lamps || {},
    initialClock: savedState?.clockLight || NIGHT_CLOCK_DEFAULTS
});
const lensDisplay = new LensDisplay(documentRef.createElement('div'), {
    count: 2,
    defaultState: savedState?.lenses || createDefaultLensState()
});

let nightMode = savedState?.nightMode === true;
let autoNightMode = savedState?.autoNightMode === true;
let exampleActive = false;
let boardActionInProgress = false;
const pendingActions = new Map();

const exampleState = {
    stations: ['PRAHA', 'BRATISLAVA'],
    train: 'Eurocity',
    delay: '12',
    departureTime: {
        hours: 16,
        minutes: 20
    }
};

const DEPARTURE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const setBoardFormStatus = (message, isError = false) => {
    boardFormStatus.textContent = message;
    boardFormStatus.classList.toggle('is-error', isError);
};

const setFormValues = (state) => {
    stationInputs.forEach((input, index) => {
        input.value = state.stations[index] || '';
    });
    trainTypeInput.value = state.train;
    departureTimeInput.value = `${String(state.departureTime.hours).padStart(2, '0')}:${
        String(state.departureTime.minutes).padStart(2, '0')
    }`;
    delayValueInput.value = state.delay === '' ? '' : String(state.delay);
};

const setSavedFormValues = (formState) => {
    const stationOne = typeof formState.stationOne === 'string'
        ? formState.stationOne.slice(0, 14)
        : exampleState.stations[0];
    const stationTwo = typeof formState.stationTwo === 'string'
        ? formState.stationTwo.slice(0, 14)
        : exampleState.stations[1];
    const train = TRAIN_TYPES.some((type) => type.name === formState.train)
        ? formState.train
        : exampleState.train;
    const departureTime = typeof formState.departureTime === 'string'
        && DEPARTURE_TIME_PATTERN.test(formState.departureTime)
        ? formState.departureTime
        : `${String(exampleState.departureTime.hours).padStart(2, '0')}:${
            String(exampleState.departureTime.minutes).padStart(2, '0')
        }`;
    const parsedDelay = parseDelayMinutes(formState.delay);
    const delay = parsedDelay === null
        ? exampleState.delay
        : parsedDelay === ''
            ? ''
            : String(parsedDelay);

    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    trainTypeInput.value = train;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
};

const getLightingSettingsState = () => ({
    lamps: lighting.getLampSettings(),
    clockLight: lighting.getClockSettings(),
    nightMode,
    autoNightMode
});

const getSettingsState = () => ({
    ...getLightingSettingsState(),
    lenses: lensDisplay.getValue()
});

const persistState = () => {
    storage.save({
        version: 1,
        form: {
            stationOne: stationInputs[0].value,
            stationTwo: stationInputs[1].value,
            train: trainTypeInput.value,
            departureTime: departureTimeInput.value,
            delay: delayValueInput.value
        },
        ...getSettingsState()
    });
};

const publishSettings = ({ persist = true } = {}) => {
    if (persist) {
        persistState();
    }
    transport.publish('board:settings', getLightingSettingsState());
};

TRAIN_TYPES.forEach((type) => {
    const option = documentRef.createElement('option');
    option.value = type.name;
    option.textContent = type.name || 'Bez typu vlaku';
    trainTypeInput.appendChild(option);
});

const lampControlElements = new Map();

const syncLampControls = (setting) => {
    const controls = lampControlElements.get(setting.id);
    if (!controls) {
        return;
    }

    controls.enabled.checked = setting.enabled;
    controls.variation.checked = setting.variation;
    controls.intensity.value = String(setting.intensity);
    controls.intensityOutput.textContent = `${setting.intensity}%`;
    controls.speed.value = String(setting.speed);
    controls.speedOutput.textContent = `${setting.speed.toFixed(1)} s`;
    controls.fade.value = setting.fade;
};

const readLampControls = (id) => {
    const controls = lampControlElements.get(id);
    return {
        enabled: controls.enabled.checked,
        variation: controls.variation.checked,
        intensity: Number(controls.intensity.value),
        speed: Number(controls.speed.value),
        fade: controls.fade.value
    };
};

const updateLampFromControls = (id) => {
    lighting.updateLamp(id, readLampControls(id));
    syncLampControls(lighting.getLampSettings()[id]);
    publishSettings();
};

NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
    const panel = documentRef.createElement('fieldset');
    panel.className = 'lamp-control';

    const legend = documentRef.createElement('legend');
    legend.textContent = defaultSetting.label;
    const legendWrapper = documentRef.createElement('div');
    legendWrapper.appendChild(legend);
    panel.appendChild(legendWrapper);

    const toggles = documentRef.createElement('div');
    toggles.className = 'lamp-control-toggles';

    const enabledLabel = documentRef.createElement('label');
    enabledLabel.className = 'lamp-control-check';
    const enabled = documentRef.createElement('input');
    enabled.type = 'checkbox';
    enabledLabel.append(enabled, documentRef.createTextNode(' Svítí'));

    const variationLabel = documentRef.createElement('label');
    variationLabel.className = 'lamp-control-check';
    const variation = documentRef.createElement('input');
    variation.type = 'checkbox';
    variationLabel.append(variation, documentRef.createTextNode(' Kolísá'));
    toggles.append(enabledLabel, variationLabel);

    const intensityLabel = documentRef.createElement('label');
    intensityLabel.className = 'lamp-control-range';
    const intensityHeader = documentRef.createElement('span');
    intensityHeader.className = 'lamp-control-range-header';
    intensityHeader.appendChild(documentRef.createTextNode('Intenzita'));
    const intensityOutput = documentRef.createElement('output');
    intensityHeader.appendChild(intensityOutput);
    const intensity = documentRef.createElement('input');
    intensity.type = 'range';
    intensity.min = '0';
    intensity.max = '100';
    intensity.step = '1';
    intensityLabel.append(intensityHeader, intensity);

    const speedLabel = documentRef.createElement('label');
    speedLabel.className = 'lamp-control-range';
    const speedHeader = documentRef.createElement('span');
    speedHeader.className = 'lamp-control-range-header';
    speedHeader.appendChild(documentRef.createTextNode('Délka cyklu'));
    const speedOutput = documentRef.createElement('output');
    speedHeader.appendChild(speedOutput);
    const speed = documentRef.createElement('input');
    speed.type = 'range';
    speed.min = '1';
    speed.max = '120';
    speed.step = '0.5';
    speedLabel.append(speedHeader, speed);

    const fadeLabel = documentRef.createElement('label');
    fadeLabel.className = 'lamp-control-select';
    fadeLabel.appendChild(documentRef.createTextNode('Pohasínání'));
    const fade = documentRef.createElement('select');
    NIGHT_FADE_MODES.forEach((mode) => {
        const option = documentRef.createElement('option');
        option.value = mode.value;
        option.textContent = mode.label;
        fade.appendChild(option);
    });
    fadeLabel.appendChild(fade);

    panel.append(toggles, intensityLabel, speedLabel, fadeLabel);
    lampControls.appendChild(panel);

    const controls = {
        enabled,
        variation,
        intensity,
        intensityOutput,
        speed,
        speedOutput,
        fade
    };
    lampControlElements.set(defaultSetting.id, controls);
    syncLampControls(lighting.getLampSettings()[defaultSetting.id]);

    [enabled, variation, intensity, speed, fade].forEach((input) => {
        input.addEventListener('input', () => updateLampFromControls(defaultSetting.id));
        input.addEventListener('change', () => updateLampFromControls(defaultSetting.id));
    });
});

const lensControlElements = new Map();

const syncLensControls = () => {
    const lensState = lensDisplay.getValue();
    const settings = lensState.lenses;
    const controls = lensControlElements.get('component');
    if (!controls || settings.length === 0) {
        return;
    }

    controls.enabled.checked = settings.some((setting) => setting.enabled);
    controls.blinking.checked = settings.some((setting) => setting.blinking);
    controls.firstColor.value = settings[0].color;
    controls.secondColor.value = (settings[1] || settings[0]).color;
    controls.blinkInterval.value = String(settings[0].blinkInterval);
    controls.blinkIntervalOutput.textContent =
        `${settings[0].blinkInterval.toFixed(1)} s`;
    controls.preDepartureEnabled.checked = lensState.preDeparture.enabled;
    controls.preDepartureSeconds.value = String(
        lensState.preDeparture.seconds
    );
    controls.preDepartureSecondsOutput.textContent =
        `${lensState.preDeparture.seconds} s`;
};

const updateLensFromControls = () => {
    const controls = lensControlElements.get('component');
    const state = lensDisplay.getValue();

    state.lenses = state.lenses.map((lens, index) => ({
        ...lens,
        enabled: controls.enabled.checked,
        blinking: controls.blinking.checked,
        color: index === 0
            ? controls.firstColor.value
            : controls.secondColor.value,
        blinkInterval: Number(controls.blinkInterval.value)
    }));
    state.preDeparture = {
        enabled: controls.preDepartureEnabled.checked,
        seconds: Number(controls.preDepartureSeconds.value)
    };
    lensDisplay.set(state);
    syncLensControls();
    persistState();
};

const createLensColorSelect = (labelText) => {
    const label = documentRef.createElement('label');
    label.className = 'lamp-control-select lens-control-select';
    label.appendChild(documentRef.createTextNode(labelText));

    const select = documentRef.createElement('select');
    Object.entries(LENS_COLORS).forEach(([value, color]) => {
        const option = documentRef.createElement('option');
        option.value = value;
        option.textContent = color.label;
        select.appendChild(option);
    });
    label.appendChild(select);

    return { label, select };
};

if (lensControls) {
    const panel = documentRef.createElement('div');
    panel.className = 'lens-component-controls';

    const toggles = documentRef.createElement('div');
    toggles.className = 'lamp-control-toggles';

    const enabledLabel = documentRef.createElement('label');
    enabledLabel.className = 'lamp-control-check';
    const enabled = documentRef.createElement('input');
    enabled.type = 'checkbox';
    enabledLabel.append(enabled, documentRef.createTextNode(' Svítí'));

    const blinkingLabel = documentRef.createElement('label');
    blinkingLabel.className = 'lamp-control-check';
    const blinking = documentRef.createElement('input');
    blinking.type = 'checkbox';
    blinkingLabel.append(blinking, documentRef.createTextNode(' Bliká'));

    const preDepartureEnabledLabel = documentRef.createElement('label');
    preDepartureEnabledLabel.className = 'lamp-control-check';
    const preDepartureEnabled = documentRef.createElement('input');
    preDepartureEnabled.type = 'checkbox';
    preDepartureEnabledLabel.append(
        preDepartureEnabled,
        documentRef.createTextNode(' Rozblikat před odjezdem')
    );
    toggles.append(
        enabledLabel,
        blinkingLabel,
        preDepartureEnabledLabel
    );

    const firstColor = createLensColorSelect('Barva 1. čočky');
    const secondColor = createLensColorSelect('Barva 2. čočky');
    const blinkIntervalLabel = documentRef.createElement('label');
    blinkIntervalLabel.className = 'lamp-control-range';
    const blinkIntervalHeader = documentRef.createElement('span');
    blinkIntervalHeader.className = 'lamp-control-range-header';
    blinkIntervalHeader.appendChild(
        documentRef.createTextNode('Interval blikání')
    );
    const blinkIntervalOutput = documentRef.createElement('output');
    blinkIntervalHeader.appendChild(blinkIntervalOutput);
    const blinkInterval = documentRef.createElement('input');
    blinkInterval.type = 'range';
    blinkInterval.min = String(LENS_BLINK_INTERVAL_MIN);
    blinkInterval.max = String(LENS_BLINK_INTERVAL_MAX);
    blinkInterval.step = '0.1';
    blinkIntervalLabel.append(blinkIntervalHeader, blinkInterval);

    const preDepartureSecondsLabel = documentRef.createElement('label');
    preDepartureSecondsLabel.className = 'lamp-control-range';
    const preDepartureSecondsHeader = documentRef.createElement('span');
    preDepartureSecondsHeader.className = 'lamp-control-range-header';
    preDepartureSecondsHeader.appendChild(
        documentRef.createTextNode('Před odjezdem')
    );
    const preDepartureSecondsOutput = documentRef.createElement('output');
    preDepartureSecondsHeader.appendChild(preDepartureSecondsOutput);
    const preDepartureSeconds = documentRef.createElement('input');
    preDepartureSeconds.type = 'range';
    preDepartureSeconds.min = String(LENS_PREDEPARTURE_SECONDS_MIN);
    preDepartureSeconds.max = String(LENS_PREDEPARTURE_SECONDS_MAX);
    preDepartureSeconds.step = String(LENS_PREDEPARTURE_SECONDS_STEP);
    preDepartureSecondsLabel.append(
        preDepartureSecondsHeader,
        preDepartureSeconds
    );

    const colorControls = documentRef.createElement('div');
    colorControls.className = 'lens-control-stack';
    colorControls.append(firstColor.label, secondColor.label);

    const timingControls = documentRef.createElement('div');
    timingControls.className = 'lens-control-stack';
    timingControls.append(blinkIntervalLabel, preDepartureSecondsLabel);

    panel.append(
        toggles,
        colorControls,
        timingControls
    );
    lensControls.replaceChildren(panel);

    lensControlElements.set('component', {
        enabled,
        blinking,
        firstColor: firstColor.select,
        secondColor: secondColor.select,
        blinkInterval,
        blinkIntervalOutput,
        preDepartureEnabled,
        preDepartureSeconds,
        preDepartureSecondsOutput
    });

    [
        enabled,
        blinking,
        preDepartureEnabled,
        firstColor.select,
        secondColor.select,
        blinkInterval,
        preDepartureSeconds
    ]
        .forEach((input) => {
            input.addEventListener('input', updateLensFromControls);
            input.addEventListener('change', updateLensFromControls);
        });
    syncLensControls();
}

lampControls.appendChild(clockLightControl);

const syncClockLightControls = () => {
    const settings = lighting.getClockSettings();
    clockLightEnabledInput.checked = settings.enabled;
    clockLightIntensityInput.value = String(settings.intensity);
    clockLightIntensityOutput.textContent = `${settings.intensity}%`;
};

const updateClockLightFromControls = ({ persist = false } = {}) => {
    lighting.setClockLight({
        enabled: clockLightEnabledInput.checked,
        intensity: Number(clockLightIntensityInput.value)
    });
    syncClockLightControls();
    publishSettings({ persist });
};

clockLightEnabledInput.addEventListener('input', updateClockLightFromControls);
clockLightIntensityInput.addEventListener('input', updateClockLightFromControls);
[clockLightEnabledInput, clockLightIntensityInput].forEach((input) => {
    input.addEventListener('change', () =>
        updateClockLightFromControls({ persist: true })
    );
});

const renderNightMode = () => {
    documentRef.body.classList.toggle('manage-night-mode', nightMode);
    lampSettingsPanel.hidden = !nightMode;
    autoNightModeInput.checked = autoNightMode;
    nightModeButton.disabled = autoNightMode;
    nightModeButton.setAttribute('aria-disabled', String(autoNightMode));
    nightModeButton.textContent = nightMode
        ? '☀️ Denní režim'
        : '🌙 Noční režim';
    nightModeButton.setAttribute('aria-pressed', String(nightMode));
};

const setNightMode = (isNight, { persist = true, publish = true } = {}) => {
    nightMode = Boolean(isNight);
    renderNightMode();
    if (publish) {
        publishSettings({ persist });
    } else if (persist) {
        persistState();
    }
};

const setAutomaticNightMode = (
    isEnabled,
    { persist = true, publish = true } = {}
) => {
    autoNightMode = Boolean(isEnabled);
    renderNightMode();

    if (publish) {
        publishSettings({ persist });
    } else if (persist) {
        persistState();
    }
};

nightModeButton.addEventListener('click', () => {
    setNightMode(!nightMode);
    setBoardFormStatus(
        nightMode ? 'Noční režim zapnut.' : 'Denní režim zapnut.'
    );
});

autoNightModeInput.addEventListener('change', () => {
    setAutomaticNightMode(autoNightModeInput.checked);
    setBoardFormStatus(
        autoNightMode
            ? 'Automatický režim podle slunce zapnut.'
            : 'Automatický režim podle slunce vypnut.'
    );
});

resetLampSettingsButton.addEventListener('click', () => {
    lighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach((setting) =>
        syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    publishSettings();
    setBoardFormStatus('Výchozí nastavení světel obnoveno.');
});

const boardActionButtons = [
    submitButton,
    startButton,
    resetAllSettingsButton
];

const setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.toggle('is-updating', isBusy);
    boardForm.setAttribute('aria-busy', String(isBusy));
    boardActionButtons.forEach((button) => {
        button.disabled = isBusy;
        button.setAttribute('aria-disabled', String(isBusy));
    });
};

const finishBoardAction = (requestId, message) => {
    const pending = pendingActions.get(requestId);
    if (!pending) {
        return;
    }

    window.clearTimeout(pending.timeout);
    pendingActions.delete(requestId);
    setBoardActionBusy(false);

    if (message.payload?.ok === false) {
        setBoardFormStatus(
            message.payload.error || 'Tabuli se nepodařilo aktualizovat.',
            true
        );
        return;
    }

    setBoardFormStatus(pending.completedMessage);
};

transport.subscribe((message) => {
    if (message.type === 'board:ready') {
        if (typeof message.payload?.nightMode === 'boolean') {
            nightMode = message.payload.nightMode;
        }
        if (typeof message.payload?.autoNightMode === 'boolean') {
            autoNightMode = message.payload.autoNightMode;
        }
        renderNightMode();
        transport.publish('board:settings', getLightingSettingsState());
        return;
    }

    if (message.type === 'board:mode') {
        if (typeof message.payload?.nightMode === 'boolean') {
            nightMode = message.payload.nightMode;
        }
        if (typeof message.payload?.autoNightMode === 'boolean') {
            autoNightMode = message.payload.autoNightMode;
        }
        renderNightMode();
        persistState();
        return;
    }

    if (message.type === 'command:ack') {
        finishBoardAction(message.payload?.requestId, message);
    }
});

const sendBoardAction = (
    action,
    state,
    completedMessage,
    { immediate = false, persist = true } = {}
) => {
    if (boardActionInProgress) {
        return;
    }

    setBoardActionBusy(true);
    if (persist) {
        persistState();
    }

    const requestId = transport.publish('board:command', {
        action,
        state,
        settings: getLightingSettingsState(),
        immediate
    });
    const timeout = window.setTimeout(() => {
        const pending = pendingActions.get(requestId);
        if (!pending) {
            return;
        }

        pendingActions.delete(requestId);
        setBoardActionBusy(false);
        setBoardFormStatus(
            'Tabule není připojena nebo nepotvrdila dokončení akce.',
            true
        );
    }, 10000);

    pendingActions.set(requestId, { completedMessage, timeout });
    setBoardFormStatus('Tabule se přenastavuje…');
};

const getFormState = () => {
    const [hours, minutes] = departureTimeInput.value.split(':').map(Number);
    const parsedDelay = parseDelayMinutes(delayValueInput.value);
    return {
        stations: stationInputs.map((input) => input.value),
        train: trainTypeInput.value,
        delay: parsedDelay === '' ? '' : parsedDelay,
        departureTime: { hours, minutes },
        lenses: lensDisplay.getValue()
    };
};

const getEmptyState = () => ({
    ...createEmptyBoardState(),
    lenses: createDefaultLensState()
});

setFormValues(exampleState);
if (savedState?.form && typeof savedState.form === 'object') {
    setSavedFormValues(savedState.form);
}
syncClockLightControls();
renderNightMode();

startButton.textContent = 'Načíst příklad';
startButton.setAttribute('aria-pressed', 'false');
startButton.addEventListener('click', () => {
    const showExample = !exampleActive;
    const state = showExample
        ? { ...exampleState, lenses: createDefaultLensState() }
        : getEmptyState();

    exampleActive = showExample;
    if (showExample) {
        setFormValues(exampleState);
    }
    startButton.textContent = showExample
        ? 'Resetovat tabuli'
        : 'Načíst příklad';
    startButton.setAttribute('aria-pressed', String(showExample));

    sendBoardAction(
        showExample ? 'apply-board' : 'reset-board',
        state,
        showExample ? 'Příklad načten.' : 'Tabule resetována.'
    );
});

resetAllSettingsButton.addEventListener('click', () => {
    if (boardActionInProgress) {
        return;
    }

    storage.clear();
    lighting.reset();
    lensDisplay.setImmediate(createDefaultLensState());
    nightMode = false;
    autoNightMode = false;
    renderNightMode();
    syncLensControls();
    NIGHT_LIGHT_DEFAULTS.forEach((setting) =>
        syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    setFormValues(exampleState);
    exampleActive = false;
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');

    sendBoardAction(
        'reset-all',
        {
            ...createEmptyBoardState(),
            lenses: createDefaultLensState()
        },
        'Všechna nastavení byla obnovena na výchozí hodnoty.',
        { immediate: true, persist: false }
    );
});

boardForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (boardActionInProgress) {
        return;
    }

    if (!DEPARTURE_TIME_PATTERN.test(departureTimeInput.value)) {
        setBoardFormStatus(
            'Zadejte čas odjezdu ve formátu HH:MM (00:00–23:59).',
            true
        );
        departureTimeInput.focus();
        return;
    }

    if (parseDelayMinutes(delayValueInput.value) === null) {
        setBoardFormStatus(
            'Zpoždění musí být nezáporný počet minut.',
            true
        );
        delayValueInput.focus();
        return;
    }

    exampleActive = true;
    startButton.textContent = 'Resetovat tabuli';
    startButton.setAttribute('aria-pressed', 'true');
    sendBoardAction(
        'apply-board',
        getFormState(),
        'Údaje byly odeslány na tabuli.'
    );
});

[...stationInputs, trainTypeInput, departureTimeInput, delayValueInput]
    .forEach((input) => {
        input.addEventListener('input', persistState);
        input.addEventListener('change', persistState);
    });

transport.publish('manage:hello', { page: 'platformTableManage' });

window.pragotron = {
    transport,
    lighting,
    getState: () => ({
        form: getFormState(),
        ...getSettingsState()
    }),
    setNightMode,
    setAutomaticNightMode,
    destroy: () => {
        pendingActions.forEach(({ timeout }) => window.clearTimeout(timeout));
        pendingActions.clear();
        transport.close();
        lensDisplay.destroy();
    }
};
