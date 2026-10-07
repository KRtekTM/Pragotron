import {
    DELAY_VALUES,
    LENS_BLINK_INTERVAL_MAX,
    LENS_BLINK_INTERVAL_MIN,
    LENS_COLORS,
    NIGHT_CLOCK_DEFAULTS,
    NIGHT_FADE_MODES,
    NIGHT_LIGHT_DEFAULTS,
    TRAIN_TYPES,
    AnalogClock,
    LocalStorageAdapter,
    NightLighting,
    SplitFlapAudio,
    createBoard,
    createDefaultLensState,
    createDefaultRegistry,
    createEmptyBoardState
} from '../platform/index.js';
import { PLATFORM_TABLE_TEMPLATE } from '../templates/platformTable.js';

const STORAGE_KEY = 'pragotron.platformTable.state.v1';
const documentRef = document;
const storage = new LocalStorageAdapter(STORAGE_KEY);
const savedState = storage.load();

const boardForm = documentRef.querySelector('#boardForm');
const stationInputs = [
    documentRef.querySelector('#stationOne'),
    documentRef.querySelector('#stationTwo')
];
const trainTypeInput = documentRef.querySelector('#trainType');
const departureTimeInput = documentRef.querySelector('#departureTime');
const delayValueInput = documentRef.querySelector('#delayValue');
const boardFormStatus = documentRef.querySelector('#boardFormStatus');
const screenElement = documentRef.querySelector('#skrin');
const lensSettingsPanel = documentRef.querySelector('#lensSettingsPanel');
const lensControls = documentRef.querySelector('#lensControls');
const lampSettingsPanel = documentRef.querySelector('#lampSettingsPanel');
const lampControls = documentRef.querySelector('#lampControls');
const clockLightControl = documentRef.querySelector('#clockLightControl');
const clockLightEnabledInput = documentRef.querySelector('#clockLightEnabled');
const clockLightIntensityInput = documentRef.querySelector('#clockLightIntensity');
const clockLightIntensityOutput = documentRef.querySelector('#clockLightIntensityOutput');
const resetLampSettingsButton = documentRef.querySelector('#resetLampSettings');
const nightModeButton = documentRef.querySelector('#nightModeButton');
const startButton = documentRef.querySelector('#startButton');
const resetAllSettingsButton = documentRef.querySelector('#resetAllSettings');
const submitButton = boardForm.querySelector('button[type="submit"]');

const defaultLensState = savedState?.lenses || createDefaultLensState();
const emptyBoardState = {
    ...createEmptyBoardState(),
    lenses: defaultLensState
};

const board = createBoard({
    root: documentRef.querySelector(PLATFORM_TABLE_TEMPLATE.rootSelector),
    slots: PLATFORM_TABLE_TEMPLATE.slots,
    registry: createDefaultRegistry({ audio: new SplitFlapAudio() }),
    initialState: emptyBoardState
});
const lensDisplay = board.getComponent('lenses');

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

const stationDisplays = stationInputs.map((_, index) =>
    documentRef.querySelector(`[data-board-slot="station${index === 0 ? 'One' : 'Two'}"]`)
);
const exampleState = {
    stations: stationDisplays.map((display) => display.dataset.text || ''),
    train: documentRef.querySelector('[data-board-slot="train"]').dataset.type || '',
    delay: documentRef.querySelector('[data-board-slot="delay"]').dataset.delay || '',
    departureTime: {
        hours: Number(
            documentRef.querySelector('[data-board-slot="departureTime"]').dataset.hours
        ),
        minutes: Number(
            documentRef.querySelector('[data-board-slot="departureTime"]').dataset.minutes
        )
    },
    lenses: createDefaultLensState()
};

const cloneState = (state) => {
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
        && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(formState.departureTime)
        ? formState.departureTime
        : `${String(exampleState.departureTime.hours).padStart(2, '0')}:${
            String(exampleState.departureTime.minutes).padStart(2, '0')
        }`;
    const delay = formState.delay === '' || DELAY_VALUES.some(
        (value) => String(value) === String(formState.delay)
    )
        ? String(formState.delay)
        : String(exampleState.delay);

    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    trainTypeInput.value = train;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
};

const persistState = () => {
    const lamps = nightLighting.getLampSettings();
    storage.save({
        version: 1,
        form: {
            stationOne: stationInputs[0].value,
            stationTwo: stationInputs[1].value,
            train: trainTypeInput.value,
            departureTime: departureTimeInput.value,
            delay: delayValueInput.value
        },
        lamps,
        clockLight: nightLighting.getClockSettings(),
        lenses: board.getState().lenses,
        nightMode: nightLighting.isNightMode()
    });
};

TRAIN_TYPES.forEach((type) => {
    const option = documentRef.createElement('option');
    option.value = type.name;
    option.textContent = type.name || 'Bez typu vlaku';
    trainTypeInput.appendChild(option);
});

DELAY_VALUES.forEach((value) => {
    const option = documentRef.createElement('option');
    option.value = value === '' ? '' : String(value);
    option.textContent = value === '' ? 'Bez zpoždění' : `${value} min`;
    delayValueInput.appendChild(option);
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
    const setting = nightLighting.updateLamp(id, readLampControls(id));
    syncLampControls(setting);
    persistState();
};

NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
    const panel = documentRef.createElement('fieldset');
    panel.className = 'lamp-control';

    const legend = documentRef.createElement('legend');
    legend.textContent = defaultSetting.label;
    panel.appendChild(legend);

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
    syncLampControls(nightLighting.getLampSettings()[defaultSetting.id]);

    [enabled, variation, intensity, speed, fade].forEach((input) => {
        input.addEventListener('input', () => updateLampFromControls(defaultSetting.id));
        input.addEventListener('change', () => updateLampFromControls(defaultSetting.id));
    });
});

const lensControlElements = new Map();

const syncLensControls = () => {
    const settings = lensDisplay.getValue().lenses;
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

if (lensControls && lensDisplay) {
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
    toggles.append(enabledLabel, blinkingLabel);

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

    panel.append(
        toggles,
        firstColor.label,
        secondColor.label,
        blinkIntervalLabel
    );
    lensControls.replaceChildren(panel);

    lensControlElements.set('component', {
        enabled,
        blinking,
        firstColor: firstColor.select,
        secondColor: secondColor.select,
        blinkInterval,
        blinkIntervalOutput
    });

    [enabled, blinking, firstColor.select, secondColor.select, blinkInterval]
        .forEach((input) => {
            input.addEventListener('input', updateLensFromControls);
            input.addEventListener('change', updateLensFromControls);
        });
    syncLensControls();
}

lampControls.appendChild(clockLightControl);

let clockRedrawFrame = null;
const requestClockRedraw = () => {
    if (clockRedrawFrame !== null) {
        return;
    }

    clockRedrawFrame = window.requestAnimationFrame(() => {
        clockRedrawFrame = null;
        analogClock.redraw();
    });
};

const syncClockLightControls = () => {
    const settings = nightLighting.getClockSettings();
    clockLightEnabledInput.checked = settings.enabled;
    clockLightIntensityInput.value = String(settings.intensity);
    clockLightIntensityOutput.textContent = `${settings.intensity}%`;
};

const updateClockLightFromControls = () => {
    nightLighting.setClockLight({
        enabled: clockLightEnabledInput.checked,
        intensity: Number(clockLightIntensityInput.value)
    });
    syncClockLightControls();
    requestClockRedraw();
};

clockLightEnabledInput.addEventListener('input', updateClockLightFromControls);
clockLightIntensityInput.addEventListener('input', updateClockLightFromControls);
[clockLightEnabledInput, clockLightIntensityInput].forEach((input) => {
    input.addEventListener('change', () => {
        updateClockLightFromControls();
        persistState();
    });
});

resetLampSettingsButton.addEventListener('click', () => {
    nightLighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach((setting) =>
        syncLampControls(nightLighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    requestClockRedraw();
    persistState();
    setBoardFormStatus('Výchozí nastavení světel obnoveno.');
});

const setNightMode = (isNight, { persist = true } = {}) => {
    nightLighting.setNightMode(isNight);
    analogClock.transitionNightMode();
    lampSettingsPanel.hidden = !isNight;
    nightModeButton.textContent = isNight ? '☀️ Denní režim' : '🌙 Noční režim';
    nightModeButton.setAttribute('aria-pressed', String(isNight));
    setBoardFormStatus(isNight ? 'Noční režim zapnut.' : 'Denní režim zapnut.');
    if (persist) {
        persistState();
    }
};

nightModeButton.addEventListener('click', () =>
    setNightMode(!nightLighting.isNightMode())
);

const boardActionButtons = [submitButton, startButton, resetAllSettingsButton];
let boardActionInProgress = false;
let exampleActive = false;

const setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.toggle('is-updating', isBusy);
    boardForm.setAttribute('aria-busy', String(isBusy));
    boardActionButtons.forEach((button) => {
        button.disabled = isBusy;
        button.setAttribute('aria-disabled', String(isBusy));
    });
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

const runBoardAction = (action, completedMessage) => {
    if (boardActionInProgress) {
        return;
    }

    setBoardActionBusy(true);

    try {
        action();
        persistState();
        setBoardFormStatus('Tabule se přenastavuje…');
    } catch (error) {
        setBoardActionBusy(false);
        setBoardFormStatus(
            error instanceof Error ? error.message : 'Tabuli se nepodařilo přenastavit.',
            true
        );
        return;
    }

    waitForBoardToSettle().then(() => {
        setBoardActionBusy(false);
        persistState();
        setBoardFormStatus(completedMessage);
    });
};

const applyBoardState = (showExample) => {
    board.setState(showExample ? exampleState : emptyBoardState);
    exampleActive = showExample;
    if (showExample) {
        setFormValues(exampleState);
    }
    startButton.textContent = showExample ? 'Resetovat tabuli' : 'Načíst příklad';
    startButton.setAttribute('aria-pressed', String(showExample));
};

startButton.textContent = 'Načíst příklad';
startButton.setAttribute('aria-pressed', 'false');

startButton.addEventListener('click', () => {
    if (boardActionInProgress) {
        return;
    }

    const showExample = !exampleActive;
    runBoardAction(
        () => applyBoardState(showExample),
        showExample ? 'Příklad načten.' : 'Tabule resetována.'
    );
});

resetAllSettingsButton.addEventListener('click', () => {
    if (boardActionInProgress) {
        return;
    }

    storage.clear();

    const resetLensState = createDefaultLensState();
    emptyBoardState.lenses = resetLensState;
    board.setState(
        {
            ...createEmptyBoardState(),
            lenses: resetLensState
        },
        { immediate: true }
    );

    exampleActive = false;
    setFormValues(exampleState);
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');

    nightLighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach((setting) =>
        syncLampControls(nightLighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    requestClockRedraw();
    syncLensControls();
    setNightMode(false, { persist: false });
    setBoardFormStatus('Všechna nastavení byla obnovena na výchozí hodnoty.');
});

const formState = () => {
    const [hours, minutes] = departureTimeInput.value.split(':').map(Number);
    return {
        stations: stationInputs.map((input) => input.value),
        train: trainTypeInput.value,
        delay: delayValueInput.value,
        departureTime: { hours, minutes },
        lenses: board.getState().lenses || defaultLensState
    };
};

boardForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (boardActionInProgress) {
        return;
    }

    if (!departureTimeInput.value) {
        setBoardFormStatus('Vyplňte prosím čas odjezdu.', true);
        departureTimeInput.focus();
        return;
    }

    runBoardAction(() => {
        board.setState(formState());
        exampleActive = true;
        startButton.textContent = 'Resetovat tabuli';
        startButton.setAttribute('aria-pressed', 'true');
    }, 'Údaje byly odeslány na tabuli.');
});

[...stationInputs, trainTypeInput, departureTimeInput, delayValueInput]
    .forEach((input) => {
        input.addEventListener('input', persistState);
        input.addEventListener('change', persistState);
    });

if (savedState?.form && typeof savedState.form === 'object') {
    setSavedFormValues(savedState.form);
} else {
    setFormValues(exampleState);
}

board.setState(emptyBoardState, { immediate: true });
syncClockLightControls();
setNightMode(savedState?.nightMode === true);

window.pragotron = {
    board,
    lighting: nightLighting,
    clock: analogClock,
    getState: () => board.getState(),
    setState: (state, options) => board.setState(cloneState(state), options),
    setNightMode,
    destroy: () => {
        board.destroy();
        nightLighting.destroy();
        analogClock.destroy();
    }
};
