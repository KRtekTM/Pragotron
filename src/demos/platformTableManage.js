import {
    LENS_BLINK_INTERVAL_MAX,
    LENS_BLINK_INTERVAL_MIN,
    LENS_COLORS,
    LENS_DEFAULTS,
    LENS_PREDEPARTURE_SECONDS_MAX,
    LENS_PREDEPARTURE_SECONDS_MIN,
    LENS_PREDEPARTURE_SECONDS_STEP,
    DEPARTURE_BOARD_LOGO_CUSTOM_ID,
    DEPARTURE_BOARD_LOGO_DEFAULT,
    DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH,
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
    DEPARTURE_BOARD_ROW_COUNT_MAX,
    DEPARTURE_BOARD_ROW_COUNT_MIN,
    DEPARTURE_SECTOR_VALUES,
    DEPARTURE_TRACK_VALUES,
    FLAP_TIMING_DEFAULTS,
    FLAP_TIMING_DURATION_MAX,
    FLAP_TIMING_DURATION_MIN,
    DELAY_OFFSET_DEFAULT,
    FLAP_TIMING_VARIATION_MAX,
    FLAP_TIMING_VARIATION_MIN,
    NIGHT_CLOCK_DEFAULTS,
    NIGHT_FADE_MODES,
    NIGHT_LIGHT_DEFAULTS,
    parseDelayMinutes,
    compareDeparturesByTime,
    getDepartureSortTimestamp,
    getEffectiveDepartureDate,
    DEPARTURE_PLATFORM_VALUES,
    TRAIN_TYPES,
    formatStationName,
    BoardTransport,
    formatBoardIdentity,
    getBoardIdentityKey,
    getLensBlinkPhase,
    identitiesMatch,
    LensDisplay,
    LightingSettings,
    LocalStorageAdapter,
    SunSchedule,
    normalizeBoardIdentity,
    getDepartureBoardLogoLabel,
    getDepartureBoardLogoSrc,
    normalizeDelayOffset,
    normalizeDepartureBoardLogoId,
    normalizeDepartureBoardRowCount,
    normalizeFlapTiming,
    createDefaultLensState,
    createEmptyLensState,
    createEmptyBoardState,
    fetchLiveDepartures,
    getDefaultLiveApiUrl,
    LIVE_POLL_INTERVAL_MS,
    LIVE_STATION_DEFAULTS,
    normalizeLiveApiUrl,
    normalizeLiveSourceUrl,
    parseLiveSourceUrl
} from '../platform/index.js';

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
const transport = new BoardTransport();

const boardForm = documentRef.querySelector('#boardForm');
const stationInputs = [
    documentRef.querySelector('#stationOne'),
    documentRef.querySelector('#stationTwo')
];
const platformInput = documentRef.querySelector('#platformValue');
const trackInput = documentRef.querySelector('#trackValue');
const sectorInput = documentRef.querySelector('#sectorValue');
const trainTypeInput = documentRef.querySelector('#trainType');
const trainNumberInput = documentRef.querySelector('#trainNumber');
const departureTimeInput = documentRef.querySelector('#departureTime');
const delayValueInput = documentRef.querySelector('#delayValue');
const flapTimingDurationInput = documentRef.querySelector(
    '#flapTimingDuration'
);
const flapTimingDurationOutput = documentRef.querySelector(
    '#flapTimingDurationOutput'
);
const flapTimingVariationInput = documentRef.querySelector(
    '#flapTimingVariation'
);
const flapTimingVariationOutput = documentRef.querySelector(
    '#flapTimingVariationOutput'
);
const delayOffsetEnabledInput = documentRef.querySelector(
    '#delayOffsetEnabled'
);
const manageHeaderClock = documentRef.querySelector('#manageHeaderClock');
const manageHeaderStation = documentRef.querySelector('#manageHeaderStation');
const departureBoardRowsInput = documentRef.querySelector(
    '#departureBoardRows'
);
const departureBoardLogoInputs = [
    ...documentRef.querySelectorAll('input[name="departureBoardLogo"]')
];
const departureBoardLogoSvgInput = documentRef.querySelector(
    '#departureBoardLogoSvg'
);
const departureBoardLogoCustomPreview = documentRef.querySelector(
    '#departureBoardLogoCustomPreview'
);
const departureBoardLogoCustomPlaceholder = documentRef.querySelector(
    '#departureBoardLogoCustomPlaceholder'
);
const manageHeaderBoardLogo = documentRef.querySelector('#manageHeaderBoardLogo');
const manageHeaderBoardLogoWrap = documentRef.querySelector(
    '#manageHeaderBoardLogoWrap'
);
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
const clearAllDeparturesButton = documentRef.querySelector(
    '#clearAllDeparturesButton'
);
const activeBoardsList = documentRef.querySelector('#activeBoardsList');
const departuresTable = documentRef.querySelector('#departuresTable');
const departuresTableBody = documentRef.querySelector('#departuresTableBody');
const departuresEmptyState = documentRef.querySelector('#departuresEmptyState');
const liveApiUrlInput = documentRef.querySelector('#liveApiUrl');
const liveSourceUrlInput = documentRef.querySelector('#liveSourceUrl');
const liveSourceStation = documentRef.querySelector('#liveSourceStation');
const liveSourceStationLink = documentRef.querySelector('#liveSourceStationLink');
const liveToggleButton = documentRef.querySelector('#liveToggleButton');
const liveDeparturesState = documentRef.querySelector('#liveDeparturesState');
const liveDeparturesStatus = documentRef.querySelector('#liveDeparturesStatus');
const submitButton = boardForm.querySelector('button[type="submit"]');

const lighting = new LightingSettings({
    initialLamps: savedSettings?.lamps || {},
    initialClock: savedSettings?.clockLight || NIGHT_CLOCK_DEFAULTS
});
const lensDisplay = new LensDisplay(documentRef.createElement('div'), {
    count: 2,
    defaultState: savedSettings?.lenses || createDefaultLensState()
});

let nightMode = savedSettings?.nightMode === true;
let autoNightMode = savedSettings?.autoNightMode === true;
let flapTiming = normalizeFlapTiming(savedSettings?.flapTiming);
let delayOffset = normalizeDelayOffset(
    savedSettings?.delayOffset ?? DELAY_OFFSET_DEFAULT
);
let departureBoardRows = normalizeDepartureBoardRowCount(
    savedSettings?.departureBoardRows ?? DEPARTURE_BOARD_ROW_COUNT_DEFAULT
);
let departureBoardLogo = normalizeDepartureBoardLogoId(
    savedSettings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
);
let departureBoardLogoSvg = String(savedSettings?.departureBoardLogoSvg || '')
    .trim()
    .slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
const savedLiveSettings = savedState.liveDepartures
    && typeof savedState.liveDepartures === 'object'
    ? savedState.liveDepartures
    : {};
let liveDeparturesEnabled = savedLiveSettings.enabled === true;
let liveApiUrl = normalizeLiveApiUrl(
    typeof savedLiveSettings.apiUrl === 'string'
        && savedLiveSettings.apiUrl.trim()
        ? savedLiveSettings.apiUrl.trim()
        : getDefaultLiveApiUrl()
);
let liveSourceUrl = normalizeLiveSourceUrl(
    typeof savedLiveSettings.sourceUrl === 'string'
        && savedLiveSettings.sourceUrl.trim()
        ? savedLiveSettings.sourceUrl.trim()
        : LIVE_STATION_DEFAULTS.sourceUrl
);
const savedLiveStationName = typeof savedLiveSettings.station === 'string'
    ? savedLiveSettings.station.trim()
    : '';
const savedLiveStationKey = String(savedLiveSettings.stationKey || '');
let liveStationName = savedLiveStationName
    && savedLiveStationKey === parseLiveSourceUrl(liveSourceUrl).key
    ? savedLiveStationName
    : parseLiveSourceUrl(liveSourceUrl).key === LIVE_STATION_DEFAULTS.key
        ? LIVE_STATION_DEFAULTS.name
        : '';
let livePollTimer = null;
let livePollInProgress = false;
let liveRunToken = 0;
let exampleActive = false;
let boardActionInProgress = false;
const pendingActions = new Map();
const pendingBackgroundActions = new Map();
const pendingIdentificationActions = new Map();
const activeBoards = new Map();
let departures = Array.isArray(savedState.departures)
    ? savedState.departures
    : [];
let desiredStates = savedState.desired
    && typeof savedState.desired === 'object'
    ? savedState.desired
    : {};
let nextRevision = Number(savedState.revision) || 0;
let globalResetRevision = Number(savedState.globalResetRevision) || 0;
let sortState = {
    key: savedState.sort?.key || 'departureTime',
    direction: savedState.sort?.direction === 'desc' ? 'desc' : 'asc'
};
let presenceTimer = null;
let heartbeatTimer = null;
let lensActivationTimer = null;

const exampleState = {
    stations: ['PRAHA', 'BRATISLAVA'],
    train: 'Eurocity',
    delay: '12',
    target: {
        platform: '1',
        track: '6a',
        sector: 'Jih'
    },
    departureTime: {
        hours: 16,
        minutes: 20
    }
};

const DEPARTURE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TRAIN_NUMBER_PATTERN = /^\d{0,4}$/;

const normalizeTrainNumber = (value) => {
    const text = String(value ?? '').trim();
    return /^\d{1,4}$/.test(text) ? text : '';
};

const setBoardFormStatus = (message, isError = false) => {
    boardFormStatus.textContent = message;
    boardFormStatus.classList.toggle('is-error', isError);
};

const setFormValues = (state) => {
    stationInputs.forEach((input, index) => {
        input.value = state.stations[index] || '';
    });
    platformInput.value = state.target?.platform || '';
    trackInput.value = state.target?.track || '';
    sectorInput.value = state.target?.sector || '';
    trainTypeInput.value = state.train;
    trainNumberInput.value = normalizeTrainNumber(state.trainNumber);
    departureTimeInput.value = state.departureTime
        ? `${String(state.departureTime.hours).padStart(2, '0')}:${
            String(state.departureTime.minutes).padStart(2, '0')
        }`
        : '';
    delayValueInput.value = state.delay === '' ? '' : String(state.delay);
};

const setSavedFormValues = (formState) => {
    const stationOne = typeof formState.stationOne === 'string'
        ? formatStationName(formState.stationOne)
        : exampleState.stations[0];
    const stationTwo = typeof formState.stationTwo === 'string'
        ? formatStationName(formState.stationTwo)
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
    const trainNumber = normalizeTrainNumber(formState.trainNumber);
    const target = formState.target && typeof formState.target === 'object'
        ? formState.target
        : {
            platform: formState.platform,
            track: formState.track,
            sector: formState.sector
        };

    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    platformInput.value = typeof target.platform === 'string'
        ? target.platform.slice(0, 20)
        : exampleState.target.platform;
    trackInput.value = typeof target.track === 'string'
        ? target.track.slice(0, 20)
        : exampleState.target.track;
    sectorInput.value = typeof target.sector === 'string'
        ? target.sector.slice(0, 20)
        : exampleState.target.sector;
    trainTypeInput.value = train;
    trainNumberInput.value = trainNumber;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
};

const getLightingSettingsState = () => ({
    lamps: lighting.getLampSettings(),
    clockLight: lighting.getClockSettings(),
    nightMode,
    autoNightMode,
    flapTiming: { ...flapTiming },
    departureBoardRows,
    delayOffset,
    departureBoardLogo,
    departureBoardLogoSvg
});

const normalizeManagedLensState = (value) => {
    const fallback = createDefaultLensState();
    const source = value && typeof value === 'object' ? value : fallback;
    return {
        ...source,
        lenses: Array.isArray(source.lenses)
            ? source.lenses.map((lens, index) => ({
                ...lens,
                blinking: true,
                blinkInterval: LENS_DEFAULTS.blinkInterval,
                blinkDelay: index * LENS_DEFAULTS.blinkInterval
            }))
            : fallback.lenses.map((lens) => ({ ...lens })),
        preDeparture: {
            ...fallback.preDeparture,
            ...(source.preDeparture || {})
        },
        synchronizeRows: source.synchronizeRows !== false
    };
};

const getManagedLensState = () =>
    normalizeManagedLensState(lensDisplay.getValue());

const getSettingsState = () => ({
    ...getLightingSettingsState(),
    lenses: getManagedLensState()
});

const getDraftFormState = () => ({
    stationOne: stationInputs[0].value,
    stationTwo: stationInputs[1].value,
    platform: platformInput.value,
    track: trackInput.value,
    sector: sectorInput.value,
    train: trainTypeInput.value,
    trainNumber: trainNumberInput.value,
    departureTime: departureTimeInput.value,
    delay: delayValueInput.value
});

const normalizeDepartureTime = (value) => {
    if (value && typeof value === 'object') {
        const hours = Number(value.hours);
        const minutes = Number(value.minutes);
        if (Number.isInteger(hours) && hours >= 0 && hours <= 23
            && Number.isInteger(minutes) && minutes >= 0 && minutes <= 59) {
            return { hours, minutes };
        }
    }

    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
        const hours = Number(match?.[1]);
        const minutes = Number(match?.[2]);
        if (match && hours >= 0 && hours <= 23
            && minutes >= 0 && minutes <= 59) {
            return { hours, minutes };
        }
    }

    return null;
};

const normalizePlatformValue = (value) => {
    const normalized = String(value ?? '').trim();
    return DEPARTURE_PLATFORM_VALUES.includes(normalized)
        ? normalized
        : '';
};

const normalizeTrackValue = (value) => {
    const normalized = String(value ?? '').trim();
    return DEPARTURE_TRACK_VALUES.includes(normalized)
        ? normalized
        : '';
};

const normalizeSectorValue = (value) => {
    const normalized = String(value ?? '').trim();
    return DEPARTURE_SECTOR_VALUES.includes(normalized)
        ? normalized
        : '';
};

const normalizeDeparture = (value) => {
    const nestedState = value?.state && typeof value.state === 'object'
        ? value.state
        : null;
    const source = nestedState
        ? {
            ...nestedState,
            ...value,
            target: value.target ?? nestedState.target
        }
        : value || {};
    const desiredById = value?.id
        ? Object.values(desiredStates).find((candidate) =>
            candidate?.target
            && getBoardIdentityKey(candidate.target) === String(value.id)
        )
        : null;
    const desired = desiredById || (
        source.target
            ? desiredStates[getBoardIdentityKey(source.target)]
            : null
    );
    const desiredState = desired?.state || {};
    const target = {
        platform: normalizePlatformValue(
            value?.target?.platform
                || source.platform
                || desired?.target?.platform
                || ''
        ),
        track: String(
            value?.target?.track
                || source.track
                || desired?.target?.track
                || ''
        ).trim(),
        sector: normalizeSectorValue(
            value?.target?.sector
                || source.sector
                || desired?.target?.sector
                || ''
        )
    };
    target.track = normalizeTrackValue(target.track);
    const departureTime = normalizeDepartureTime(source.departureTime)
        || normalizeDepartureTime(desiredState.departureTime);
    const rawDelay = source.delay ?? desiredState.delay;
    const parsedDelay = parseDelayMinutes(rawDelay);
    const rawTrain = source.train ?? desiredState.train;
    const train = TRAIN_TYPES.some((type) => type.name === rawTrain)
        ? rawTrain
        : '';
    const trainNumber = normalizeTrainNumber(
        source.trainNumber ?? desiredState.trainNumber
    );
    const stations = Array.isArray(source.stations)
        ? source.stations
        : [];

    const isLive = source.source === 'live'
        || Boolean(source.liveKey);
    const liveKey = isLive ? String(source.liveKey || source.id || '') : '';
    const sourceTrainNumber = isLive
        ? String(source.sourceTrainNumber || '').replace(/\D/g, '')
        : '';
    return {
        id: isLive
            ? String(source.id || `live:${liveKey}`)
            : getBoardIdentityKey(target),
        source: isLive ? 'live' : 'manual',
        liveKey,
        liveStationKey: isLive
            ? String(source.liveStationKey || LIVE_STATION_DEFAULTS.key)
            : '',
        dateKey: isLive ? String(source.dateKey || '') : '',
        sourceTrainNumber,
        target,
        stations: [
            formatStationName(
                stations[0]
                    || source.stationOne
                    || desiredState.stations?.[0]
                    || ''
            ),
            formatStationName(
                stations[1]
                    || source.stationTwo
                    || desiredState.stations?.[1]
                    || ''
            )
        ],
        train,
        trainNumber,
        operator: String(source.operator || '').trim(),
        delay: parsedDelay === null ? '' : parsedDelay,
        departureTime,
        lenses: normalizeManagedLensState(
            source.lenses ?? desiredState.lenses
        ),
        revision: Number(value?.revision) || 0,
        updatedAt: Number(value?.updatedAt) || 0
    };
};

departures = departures
    .map(normalizeDeparture)
    .filter((departure) =>
        departure.departureTime
        && (
            departure.source === 'live'
            || (
                departure.target.platform
                && departure.target.track
            )
        )
    );

const persistState = () => {
    const settings = getSettingsState();
    storage.save({
        version: 2,
        form: getDraftFormState(),
        settings,
        ...settings,
        departures,
        desired: desiredStates,
        liveDepartures: {
            enabled: liveDeparturesEnabled,
            apiUrl: liveApiUrl,
            station: liveStationName,
            stationKey: parseLiveSourceUrl(liveSourceUrl).key,
            sourceUrl: liveSourceUrl
        },
        revision: nextRevision,
        globalResetRevision,
        sort: sortState
    });
};

const publishDepartureSnapshot = () => {
    transport.publish('manage:departures', {
        departures: departures.map((departure) => ({
            ...departure,
            target: { ...departure.target },
            stations: [...departure.stations],
            departureTime: departure.departureTime
                ? { ...departure.departureTime }
                : null,
            lenses: departure.lenses
                ? {
                    ...departure.lenses,
                    lenses: departure.lenses.lenses.map((lens) => ({ ...lens })),
                    preDeparture: { ...departure.lenses.preDeparture }
                }
                : createDefaultLensState()
        })),
        revision: nextRevision
    });
};

const publishSettings = ({ persist = true } = {}) => {
    if (persist) {
        persistState();
    }
    transport.publish('board:settings', getLightingSettingsState());
};

const syncFlapTimingControls = () => {
    if (!flapTimingDurationInput || !flapTimingVariationInput) {
        return;
    }

    flapTimingDurationInput.min = String(FLAP_TIMING_DURATION_MIN);
    flapTimingDurationInput.max = String(FLAP_TIMING_DURATION_MAX);
    flapTimingVariationInput.min = String(FLAP_TIMING_VARIATION_MIN);
    flapTimingVariationInput.max = String(FLAP_TIMING_VARIATION_MAX);
    flapTimingDurationInput.value = String(flapTiming.duration);
    flapTimingVariationInput.value = String(flapTiming.variation);
    flapTimingDurationOutput.textContent = `${flapTiming.duration} ms`;
    flapTimingVariationOutput.textContent = `±${flapTiming.variation} ms`;
};

const updateFlapTimingFromControls = () => {
    flapTiming = normalizeFlapTiming({
        duration: flapTimingDurationInput.value,
        variation: flapTimingVariationInput.value
    });
    syncFlapTimingControls();
    publishSettings();
};

const syncDelayOffsetControls = () => {
    if (!delayOffsetEnabledInput) {
        return;
    }

    delayOffsetEnabledInput.checked = delayOffset;
};

const updateDelayOffsetFromControls = () => {
    delayOffset = normalizeDelayOffset(delayOffsetEnabledInput.checked);
    syncDelayOffsetControls();
    publishSettings();
    renderDeparturesTable();
};

const syncDepartureBoardRowControls = () => {
    if (!departureBoardRowsInput) {
        return;
    }

    departureBoardRowsInput.min = String(DEPARTURE_BOARD_ROW_COUNT_MIN);
    departureBoardRowsInput.max = String(DEPARTURE_BOARD_ROW_COUNT_MAX);
    departureBoardRowsInput.value = String(departureBoardRows);
};

const updateDepartureBoardRowsFromControls = () => {
    departureBoardRows = normalizeDepartureBoardRowCount(
        departureBoardRowsInput.value
    );
    syncDepartureBoardRowControls();
    publishSettings();
};

const applyDisplayedLogos = () => {
    const src = getDepartureBoardLogoSrc(
        departureBoardLogo,
        departureBoardLogoSvg
    );
    const label = getDepartureBoardLogoLabel(departureBoardLogo);
    if (manageHeaderBoardLogo) {
        if (src) {
            manageHeaderBoardLogo.hidden = false;
            manageHeaderBoardLogo.src = src;
            manageHeaderBoardLogo.alt = label;
            if (manageHeaderBoardLogoWrap) {
                manageHeaderBoardLogoWrap.hidden = false;
            }
        } else if (manageHeaderBoardLogoWrap) {
            manageHeaderBoardLogoWrap.hidden = true;
        }
    }

    const customSrc = getDepartureBoardLogoSrc(
        DEPARTURE_BOARD_LOGO_CUSTOM_ID,
        departureBoardLogoSvg
    );
    if (departureBoardLogoCustomPreview) {
        if (customSrc) {
            departureBoardLogoCustomPreview.hidden = false;
            departureBoardLogoCustomPreview.src = customSrc;
        } else {
            departureBoardLogoCustomPreview.hidden = true;
            departureBoardLogoCustomPreview.removeAttribute('src');
        }
    }
    if (departureBoardLogoCustomPlaceholder) {
        departureBoardLogoCustomPlaceholder.hidden = Boolean(customSrc);
    }
};

const syncDepartureBoardLogoControls = () => {
    departureBoardLogoInputs.forEach((input) => {
        input.checked = input.value === departureBoardLogo;
    });
    if (departureBoardLogoSvgInput
        && departureBoardLogoSvgInput.value !== departureBoardLogoSvg) {
        departureBoardLogoSvgInput.value = departureBoardLogoSvg;
    }
    applyDisplayedLogos();
};

const updateDepartureBoardLogoFromControls = () => {
    const selected = departureBoardLogoInputs.find((input) => input.checked);
    departureBoardLogo = normalizeDepartureBoardLogoId(
        selected?.value ?? DEPARTURE_BOARD_LOGO_DEFAULT
    );
    departureBoardLogoSvg = String(departureBoardLogoSvgInput?.value || '')
        .trim()
        .slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
    applyDisplayedLogos();
    publishSettings();
};

const updateDepartureBoardLogoSvgFromControls = () => {
    departureBoardLogo = DEPARTURE_BOARD_LOGO_CUSTOM_ID;
    departureBoardLogoSvg = String(departureBoardLogoSvgInput?.value || '')
        .trim()
        .slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
    syncDepartureBoardLogoControls();
    publishSettings();
};

const getFormTarget = () => normalizeBoardIdentity({
    platform: platformInput.value,
    track: trackInput.value,
    sector: sectorInput.value
});

const formatDepartureTime = (departureTime) => {
    if (!departureTime) {
        return '—';
    }

    return `${String(departureTime.hours).padStart(2, '0')}:${
        String(departureTime.minutes).padStart(2, '0')
    }`;
};

const isDepartureBoardPresence = (boardPresence) =>
    boardPresence?.page === 'departureBoard';

const findMatchingBoards = (target) => [...activeBoards.values()]
    .filter((boardPresence) =>
        !isDepartureBoardPresence(boardPresence)
        && identitiesMatch(boardPresence.identity, target)
    );

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

const clearLensActivationTimer = () => {
    if (lensActivationTimer !== null) {
        window.clearTimeout(lensActivationTimer);
        lensActivationTimer = null;
    }
};

const scheduleLensActivation = () => {
    clearLensActivationTimer();
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
        renderDeparturesTable();
    }, Math.max(0, nextActivation - now) + 10);
};

const getLensPresentation = (
    departure,
    now = Date.now(),
    rowIndex = 0
) => {
    const settings = departure.lenses?.lenses || [];
    const synchronizeRows = departure.lenses?.synchronizeRows !== false;
    const preDepartureActive = getPreDepartureActive(departure, now);

    return settings.map((setting, index) => {
        const on = setting.enabled && preDepartureActive;
        const color = LENS_COLORS[setting.color] || LENS_COLORS.green;
        const blinkInterval = LENS_DEFAULTS.blinkInterval;
        const animationPhase = getLensBlinkPhase({
            now,
            lensIndex: index,
            rowIndex,
            synchronizeRows
        });
        return {
            color: color.light,
            on,
            blinking: on && setting.blinking,
            blinkInterval,
            animationPhase
        };
    });
};

const renderDeparturesTable = () => {
    if (!departuresTableBody || !departuresEmptyState) {
        return;
    }

    const now = new Date();
    const rows = [...departures].sort((first, second) => {
        const getValue = (departure) => {
            switch (sortState.key) {
                case 'stationOne':
                    return departure.stations[0];
                case 'stationTwo':
                    return departure.stations[1];
                case 'train':
                    return departure.train;
                case 'trainNumber':
                    return departure.trainNumber;
                case 'operator':
                    return departure.operator;
                case 'delay':
                    return Number(departure.delay || 0);
                case 'platform':
                    return departure.target.platform;
                case 'track':
                    return departure.target.track;
                case 'sector':
                    return departure.target.sector;
                case 'departureTime':
                default:
                    return getDepartureSortTimestamp(
                        departure.departureTime,
                        departure.delay,
                        now,
                        delayOffset
                    );
            }
        };
        const left = getValue(first);
        const right = getValue(second);
        const comparison = typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'cs', {
                sensitivity: 'base',
                numeric: true
            });
        return (sortState.direction === 'desc' ? -1 : 1) * comparison
            || first.id.localeCompare(second.id);
    });

    departuresTableBody.replaceChildren();
    const boardOrder = [...departures].sort((first, second) =>
        compareDeparturesByTime(first, second, now, delayOffset)
    );

    rows.forEach((departure) => {
        const row = documentRef.createElement('tr');
        const lensCell = documentRef.createElement('td');
        lensCell.className = 'departure-lens-status';
        const boardRowIndex = Math.max(
            0,
            boardOrder.findIndex((item) => item.id === departure.id)
        );
        getLensPresentation(departure, now, boardRowIndex).forEach((lens, index) => {
            const symbol = documentRef.createElement('span');
            symbol.className = 'lens-status-symbol';
            symbol.classList.toggle('is-on', lens.on);
            symbol.classList.toggle('is-blinking', lens.blinking);
            symbol.style.setProperty('--status-color', lens.color);
            symbol.style.setProperty(
                '--lens-blink-duration',
                `${lens.blinkInterval * 2}s`
            );
            symbol.style.setProperty(
                '--lens-blink-delay',
                `${-lens.animationPhase}s`
            );
            symbol.textContent = '●';
            symbol.setAttribute(
                'aria-label',
                `${index + 1}. čočka ${lens.on ? 'svítí' : 'nesvítí'}`
            );
            lensCell.appendChild(symbol);
        });
        row.appendChild(lensCell);

        [
            departure.stations[0],
            departure.stations[1],
            departure.train || '—',
            departure.trainNumber || '—',
            departure.operator || '—',
            formatDepartureTime(departure.departureTime),
            departure.delay === '' ? '—' : `${departure.delay} min`,
            departure.target.platform || '—',
            departure.target.track || '—',
            departure.target.sector || 'celá kolej'
        ].forEach((value) => {
            const cell = documentRef.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionsCell = documentRef.createElement('td');
        actionsCell.className = 'departure-row-actions';
        const loadButton = documentRef.createElement('button');
        loadButton.type = 'button';
        loadButton.dataset.departureAction = 'load';
        loadButton.dataset.departureId = departure.id;
        loadButton.textContent = 'Načíst';
        const resetButton = documentRef.createElement('button');
        resetButton.type = 'button';
        resetButton.dataset.departureAction = 'reset';
        resetButton.dataset.departureId = departure.id;
        resetButton.textContent = 'Smazat a resetovat';
        actionsCell.append(loadButton, resetButton);
        row.appendChild(actionsCell);
        departuresTableBody.appendChild(row);
    });

    departuresEmptyState.hidden = rows.length > 0;
    departuresTable.hidden = rows.length === 0;
    if (clearAllDeparturesButton) {
        const disabled = boardActionInProgress || rows.length === 0;
        clearAllDeparturesButton.disabled = disabled;
        clearAllDeparturesButton.setAttribute('aria-disabled', String(disabled));
    }
    scheduleLensActivation();
    departuresTable.querySelectorAll('[data-sort-key]').forEach((button) => {
        const header = button.closest('th');
        const isActive = button.dataset.sortKey === sortState.key;
        header?.setAttribute(
            'aria-sort',
            isActive
                ? sortState.direction === 'asc' ? 'ascending' : 'descending'
                : 'none'
        );
        button.dataset.sortDirection = isActive ? sortState.direction : '';
        header?.classList.toggle('is-sorted', isActive);
    });
};

const toggleBoardIdentification = (boardPresence) => {
    if (!boardPresence || boardPresence.identificationPending) {
        return;
    }

    const forceOn = boardPresence.identificationActive !== true;
    const requestId = transport.publish('board:command', {
        action: 'identify-lenses',
        forceOn
    }, {
        target: {
            source: boardPresence.instanceId
        }
    });
    const timeout = window.setTimeout(() => {
        const pending = pendingIdentificationActions.get(requestId);
        if (!pending) {
            return;
        }
        pendingIdentificationActions.delete(requestId);
        boardPresence.identificationPending = false;
        renderActiveBoards();
        setBoardFormStatus(
            'Tabule nepotvrdila změnu identifikačního svitu čoček.',
            true
        );
    }, 5000);

    boardPresence.identificationPending = true;
    pendingIdentificationActions.set(requestId, {
        boardPresence,
        timeout
    });
    renderActiveBoards();
};

const createEyeIcon = (isOpen) => {
    const icon = documentRef.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
    );
    icon.classList.add('identify-eye-icon');
    icon.classList.toggle('is-open', isOpen);
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = isOpen
        ? '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.5"></circle>'
        : '<path d="M3 3l18 18"></path><path d="M5.3 7.1C3.2 8.5 2 10.4 2 12c0 0 3.6 6 10 6 1.8 0 3.4-.4 4.8-1"></path><path d="M18.7 16.9C20.8 15.5 22 13.6 22 12c0 0-3.6-6-10-6-1.8 0-3.4.4-4.8 1"></path>';
    return icon;
};

const renderActiveBoards = () => {
    if (!activeBoardsList) {
        return;
    }

    activeBoardsList.replaceChildren();
    const values = [...activeBoards.values()]
        .sort((first, second) =>
            formatBoardIdentity(first.identity).localeCompare(
                formatBoardIdentity(second.identity),
                'cs'
            ));

    if (values.length === 0) {
        const empty = documentRef.createElement('p');
        empty.className = 'manage-empty-state';
        empty.textContent = 'Zatím nebyla nalezena žádná tabule.';
        activeBoardsList.appendChild(empty);
        return;
    }

    values.forEach((boardPresence) => {
        const isDepartureBoard = isDepartureBoardPresence(boardPresence);
        const item = documentRef.createElement('div');
        item.className = 'active-board-item';
        item.classList.toggle('is-departure-board', isDepartureBoard);
        item.classList.toggle(
            'is-unconfigured',
            !isDepartureBoard && boardPresence.configured === false
        );
        const identity = documentRef.createElement('strong');
        identity.textContent = isDepartureBoard
            ? 'Odjezdová tabule'
            : boardPresence.configured === false
            ? 'Tabule bez identity'
            : formatBoardIdentity(boardPresence.identity);
        const details = documentRef.createElement('span');
        details.textContent = `${isDepartureBoard
            ? `${boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT} řádků`
            : 'nástupištní tabule'} · instance ${
            boardPresence.instanceId || '—'
        }`;
        const status = documentRef.createElement('span');
        status.className = 'active-board-status';
        status.textContent = !isDepartureBoard
            && boardPresence.configured === false
            ? 'Není nakonfigurovaná'
            : 'Online';
        const audioStatus = documentRef.createElement('span');
        const audioUnlocked = boardPresence.audioState?.unlocked === true;
        audioStatus.className = 'active-board-audio';
        audioStatus.textContent = audioUnlocked ? '🔊' : '🔈';
        audioStatus.title = audioUnlocked
            ? 'Přehrávání zvuku je povolené'
            : 'Přehrávání zvuku čeká na kliknutí do tabule';
        audioStatus.setAttribute('role', 'img');
        audioStatus.setAttribute(
            'aria-label',
            audioUnlocked ? 'Zvuk povolen' : 'Zvuk nepovolen'
        );
        const actions = documentRef.createElement('div');
        actions.className = 'active-board-actions';
        const identifyButton = documentRef.createElement('button');
        identifyButton.type = 'button';
        identifyButton.className = 'identify-board-button';
        identifyButton.dataset.boardInstanceId = boardPresence.instanceId;
        identifyButton.replaceChildren(
            createEyeIcon(boardPresence.identificationActive === true)
        );
        identifyButton.disabled = boardPresence.identificationPending
            || boardPresence.configured === false;
        identifyButton.setAttribute(
            'aria-pressed',
            String(boardPresence.identificationActive === true)
        );
        identifyButton.setAttribute(
            'aria-label',
            boardPresence.identificationActive
                ? 'Vrátit čočky do původního stavu'
                : 'Force rozsvítit čočky pro identifikaci tabule'
        );
        actions.appendChild(identifyButton);
        item.append(identity, details, status, audioStatus, actions);
        activeBoardsList.appendChild(item);
    });
};

activeBoardsList?.addEventListener('click', (event) => {
    const button = event.target.closest('.identify-board-button');
    if (!button) {
        return;
    }

    const boardPresence = [...activeBoards.values()].find(
        (presence) => presence.instanceId === button.dataset.boardInstanceId
    );
    toggleBoardIdentification(boardPresence);
});

const getDepartureById = (id) =>
    departures.find((departure) => departure.id === id);

const loadDepartureIntoForm = (departure) => {
    if (!departure) {
        return;
    }
    setFormValues(departure);
    lensDisplay.set(departure.lenses);
    syncLensControls();
    setBoardFormStatus(
        `Odjezd pro ${formatBoardIdentity(departure.target)} načten do formuláře.`
    );
};

const nextStateRevision = () => {
    nextRevision += 1;
    return nextRevision;
};

const setDesiredState = (target, action, state, revision) => {
    desiredStates[getBoardIdentityKey(target)] = {
        target,
        action,
        state,
        revision,
        updatedAt: Date.now()
    };
};

TRAIN_TYPES.forEach((type) => {
    const option = documentRef.createElement('option');
    option.value = type.name;
    option.textContent = type.label || type.name || 'Bez typu vlaku';
    trainTypeInput.appendChild(option);
});

DEPARTURE_PLATFORM_VALUES.slice(1).forEach((platform) => {
    const option = documentRef.createElement('option');
    option.value = platform;
    option.textContent = platform;
    platformInput.appendChild(option);
});

DEPARTURE_TRACK_VALUES.slice(1).forEach((track) => {
    const option = documentRef.createElement('option');
    option.value = track;
    option.textContent = track;
    trackInput.appendChild(option);
});

DEPARTURE_SECTOR_VALUES.slice(1).forEach((sector) => {
    const option = documentRef.createElement('option');
    option.value = sector;
    option.textContent = sector;
    sectorInput.appendChild(option);
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
    variationLabel.append(variation, documentRef.createTextNode(' S efektem'));
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
    fadeLabel.appendChild(documentRef.createTextNode('Efekt'));
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
    controls.blinking.checked = true;
    controls.synchronizeRows.checked =
        lensState.synchronizeRows !== false;
    controls.firstColor.value = settings[0].color;
    controls.secondColor.value = (settings[1] || settings[0]).color;
    controls.blinkInterval.value = String(LENS_DEFAULTS.blinkInterval);
    controls.blinkIntervalOutput.textContent =
        `${LENS_DEFAULTS.blinkInterval.toFixed(1)} s`;
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
        blinking: true,
        blinkInterval: LENS_DEFAULTS.blinkInterval,
        blinkDelay: index * LENS_DEFAULTS.blinkInterval,
        color: index === 0
            ? controls.firstColor.value
            : controls.secondColor.value
    }));
    state.synchronizeRows = controls.synchronizeRows.checked;
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
    enabled.checked = true;
    enabledLabel.append(enabled, documentRef.createTextNode(' Svítí'));

    const blinkingLabel = documentRef.createElement('label');
    blinkingLabel.className = 'lamp-control-check';
    const blinking = documentRef.createElement('input');
    blinking.type = 'checkbox';
    blinking.checked = true;
    blinking.disabled = true;
    blinking.setAttribute('disabled', 'disabled');
    blinking.readOnly = true;
    blinking.setAttribute('aria-readonly', 'true');
    blinking.title = 'Blikání je vždy zapnuté';
    blinking.addEventListener('click', (event) => {
        event.preventDefault();
        blinking.checked = true;
    });
    blinking.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            blinking.checked = true;
        }
    });
    blinkingLabel.append(blinking, documentRef.createTextNode(' Bliká'));

    const synchronizeRowsLabel = documentRef.createElement('label');
    synchronizeRowsLabel.className = 'lamp-control-check';
    const synchronizeRows = documentRef.createElement('input');
    synchronizeRows.type = 'checkbox';
    synchronizeRows.checked = true;
    synchronizeRowsLabel.append(
        synchronizeRows,
        documentRef.createTextNode(' Stejná strana ve všech řádcích')
    );

    const preDepartureEnabledLabel = documentRef.createElement('label');
    preDepartureEnabledLabel.className = 'lamp-control-check';
    const preDepartureEnabled = documentRef.createElement('input');
    preDepartureEnabled.type = 'checkbox';
    preDepartureEnabled.checked = true;
    preDepartureEnabledLabel.append(
        preDepartureEnabled,
        documentRef.createTextNode(' Rozblikat před odjezdem')
    );
    toggles.append(
        enabledLabel,
        blinkingLabel,
        synchronizeRowsLabel,
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
    blinkInterval.value = String(LENS_DEFAULTS.blinkInterval);
    blinkInterval.disabled = true;
    blinkInterval.readOnly = true;
    blinkInterval.setAttribute('disabled', 'disabled');
    blinkInterval.setAttribute('readonly', 'readonly');
    blinkInterval.setAttribute('aria-readonly', 'true');
    blinkInterval.title = 'Interval je sjednocený pro všechny řádky.';
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
        synchronizeRows,
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
        synchronizeRows,
        preDepartureEnabled,
        firstColor.select,
        secondColor.select,
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

flapTimingDurationInput.addEventListener('input', updateFlapTimingFromControls);
flapTimingVariationInput.addEventListener('input', updateFlapTimingFromControls);
syncFlapTimingControls();
delayOffsetEnabledInput?.addEventListener('change', updateDelayOffsetFromControls);
syncDelayOffsetControls();
departureBoardRowsInput?.addEventListener(
    'input',
    updateDepartureBoardRowsFromControls
);
departureBoardRowsInput?.addEventListener(
    'change',
    updateDepartureBoardRowsFromControls
);
syncDepartureBoardRowControls();
departureBoardLogoInputs.forEach((input) => {
    input.addEventListener('change', updateDepartureBoardLogoFromControls);
});
departureBoardLogoSvgInput?.addEventListener(
    'input',
    updateDepartureBoardLogoSvgFromControls
);
syncDepartureBoardLogoControls();

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

const sunSchedule = new SunSchedule({
    onChange: (isNight) => {
        if (!autoNightMode) {
            return;
        }

        setNightMode(isNight);
    }
});

const syncAutomaticNightMode = () => {
    if (!autoNightMode) {
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

const setAutomaticNightMode = (
    isEnabled,
    { persist = true, publish = true } = {}
) => {
    autoNightMode = Boolean(isEnabled);
    renderNightMode();
    syncAutomaticNightMode();

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
            ? (
                nightMode
                    ? 'Noční režim podle slunce.'
                    : 'Denní režim podle slunce.'
            )
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
    resetAllSettingsButton,
    clearAllDeparturesButton
];

const setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.toggle('is-updating', isBusy);
    boardForm.setAttribute('aria-busy', String(isBusy));
    boardActionButtons.forEach((button) => {
        const emptyClear = button === clearAllDeparturesButton
            && departures.length === 0;
        button.disabled = isBusy || emptyClear;
        button.setAttribute('aria-disabled', String(button.disabled));
    });
    documentRef.querySelectorAll('[data-departure-action]').forEach((button) => {
        button.disabled = isBusy;
        button.setAttribute('aria-disabled', String(isBusy));
    });
};

const getDesiredStateForBoard = (identity) => {
    const matching = Object.values(desiredStates)
        .filter((desired) => identitiesMatch(identity, desired.target));
    if (globalResetRevision > 0) {
        matching.push({
            action: 'reset-all',
            state: getEmptyState(),
            revision: globalResetRevision,
            target: null
        });
    }
    return matching.sort(
        (first, second) => Number(second.revision) - Number(first.revision)
    )[0];
};

const syncBoardPresence = (boardPresence) => {
    if (boardPresence.configured === false) {
        return;
    }

    const desired = getDesiredStateForBoard(boardPresence.identity);
    if (!desired || Number(desired.revision) <= Number(
        boardPresence.appliedRevision || 0
    ) || boardPresence.lastSyncedRevision === desired.revision) {
        return;
    }
    if (boardPresence.syncPendingRevision === desired.revision
        && Date.now() - boardPresence.syncPendingAt < 8000) {
        return;
    }

    transport.publish('board:command', {
        action: desired.action,
        ...(desired.target ? { target: desired.target } : {}),
        state: desired.state,
        settings: getLightingSettingsState(),
        revision: desired.revision
    }, {
        target: {
            source: boardPresence.instanceId
        }
    });
    boardPresence.syncPendingRevision = desired.revision;
    boardPresence.syncPendingAt = Date.now();
};

const updateBoardPresence = (message) => {
    const payload = message.payload || {};
    const page = payload.page || 'platformTable';
    const isDepartureBoard = page === 'departureBoard';
    const identity = normalizeBoardIdentity(payload.identity);
    const boardId = payload.boardId
        || (isDepartureBoard ? 'departure-board' : getBoardIdentityKey(identity));
    const instanceId = payload.instanceId || message.source;
    const key = `${page}:${boardId}:${instanceId}`;
    const oldEntry = [...activeBoards.entries()].find(
        ([, presence]) => presence.instanceId === instanceId
    );
    if (oldEntry && oldEntry[0] !== key) {
        activeBoards.delete(oldEntry[0]);
    }
    const previous = activeBoards.get(key) || oldEntry?.[1];
    const sameBoardIdentity = previous?.boardId === boardId
        && previous?.page === page;
    const previousLensState = JSON.stringify(previous?.lensState);
    const boardPresence = {
        ...previous,
        page,
        boardId,
        instanceId,
        identity,
        configured: isDepartureBoard || (
            payload.configured !== false
            && Boolean(identity.platform && identity.track)
        ),
        rowCount: Number(payload.rowCount) || previous?.rowCount || 0,
        capabilities: payload.capabilities || previous?.capabilities || [],
        appliedRevision: Number(payload.appliedRevision)
            || previous?.appliedRevision
            || 0,
        lensState: payload.lensState || previous?.lensState || null,
        audioState: payload.audio
            || previous?.audioState
            || { available: false, unlocked: false },
        identificationActive: payload.identificationActive === true,
        identificationPending: sameBoardIdentity
            ? previous?.identificationPending === true
            : false,
        lastSeen: Date.now(),
        lastSyncedRevision: sameBoardIdentity
            ? previous?.lastSyncedRevision
            : null,
        syncPendingRevision: sameBoardIdentity
            ? previous?.syncPendingRevision
            : null,
        syncPendingAt: sameBoardIdentity ? previous?.syncPendingAt || 0 : 0
    };
    activeBoards.set(key, boardPresence);
    renderActiveBoards();
    if (previousLensState !== JSON.stringify(boardPresence.lensState)
        || !previous) {
        renderDeparturesTable();
    }
    if (!isDepartureBoard) {
        syncBoardPresence(boardPresence);
    }
};

const pruneActiveBoards = () => {
    const expiry = Date.now() - 12000;
    let removed = false;
    [...activeBoards.entries()].forEach(([key, boardPresence]) => {
        if (boardPresence.lastSeen < expiry) {
            activeBoards.delete(key);
            removed = true;
        }
    });
    renderActiveBoards();
    if (removed) {
        renderDeparturesTable();
    }
};

const publishDiscovery = () => {
    transport.publish('manage:discover', {
        page: 'platformTableManage',
        sentAt: Date.now()
    });
};

const finishBoardAction = (requestId, message) => {
    const pending = pendingActions.get(requestId);
    if (!pending) {
        return;
    }

    const instanceId = message.payload?.instanceId || message.source;
    if (pending.expectedInstances.size > 0
        && !pending.expectedInstances.has(instanceId)) {
        return;
    }
    pending.acknowledgedInstances.add(instanceId);
    const boardPresence = [...activeBoards.values()].find(
        (presence) => presence.instanceId === instanceId
    );
    if (boardPresence) {
        boardPresence.appliedRevision = Number(message.payload?.revision)
            || boardPresence.appliedRevision;
        boardPresence.lensState = message.payload?.lensState
            || boardPresence.lensState;
        if (typeof message.payload?.identificationActive === 'boolean') {
            boardPresence.identificationActive =
                message.payload.identificationActive;
        }
        boardPresence.lastSeen = Date.now();
        boardPresence.syncPendingRevision = null;
    }
    if (message.payload?.ok === false) {
        window.clearTimeout(pending.timeout);
        pendingActions.delete(requestId);
        setBoardActionBusy(false);
        setBoardFormStatus(
            message.payload.error || 'Tabuli se nepodařilo aktualizovat.',
            true
        );
        return;
    }
    if (pending.acknowledgedInstances.size < pending.expectedInstances.size) {
        return;
    }

    window.clearTimeout(pending.timeout);
    pendingActions.delete(requestId);
    setBoardActionBusy(false);

    setBoardFormStatus(pending.completedMessage);
    pending.onComplete?.();
    renderActiveBoards();
    renderDeparturesTable();
};

const finishBackgroundBoardAction = (requestId, message) => {
    const pending = pendingBackgroundActions.get(requestId);
    if (!pending) {
        return false;
    }

    const instanceId = message.payload?.instanceId || message.source;
    if (pending.expectedInstances.size > 0
        && !pending.expectedInstances.has(instanceId)) {
        return true;
    }

    pending.acknowledgedInstances.add(instanceId);
    const boardPresence = [...activeBoards.values()].find(
        (presence) => presence.instanceId === instanceId
    );
    if (boardPresence) {
        boardPresence.appliedRevision = Number(message.payload?.revision)
            || boardPresence.appliedRevision;
        boardPresence.lensState = message.payload?.lensState
            || boardPresence.lensState;
        boardPresence.lastSeen = Date.now();
        boardPresence.syncPendingRevision = null;
    }

    if (message.payload?.ok === false
        || pending.acknowledgedInstances.size
            >= pending.expectedInstances.size) {
        window.clearTimeout(pending.timeout);
        pendingBackgroundActions.delete(requestId);
        pending.resolve(message.payload?.ok !== false);
        renderActiveBoards();
        renderDeparturesTable();
    }

    return true;
};

transport.subscribe((message) => {
    if (message.type === 'departure-board:hello') {
        publishDepartureSnapshot();
        return;
    }

    if (message.type === 'board:ready'
        || message.type === 'board:heartbeat') {
        updateBoardPresence(message);
        if (message.type === 'board:ready') {
            transport.publish('board:settings', getLightingSettingsState());
        }
        return;
    }

    if (message.type === 'board:mode') {
        if (typeof message.payload?.autoNightMode === 'boolean') {
            autoNightMode = message.payload.autoNightMode;
        }
        if (typeof message.payload?.nightMode === 'boolean' && !autoNightMode) {
            nightMode = message.payload.nightMode;
        }
        renderNightMode();
        persistState();
        syncAutomaticNightMode();
        return;
    }

    if (message.type === 'command:ack') {
        const pendingIdentification = pendingIdentificationActions.get(
            message.requestId
        );
        if (pendingIdentification) {
            window.clearTimeout(pendingIdentification.timeout);
            pendingIdentificationActions.delete(message.requestId);
            pendingIdentification.boardPresence.identificationPending = false;
            if (message.payload?.ok === false) {
                setBoardFormStatus(
                    message.payload.error
                        || 'Čočky se nepodařilo přepnout do identifikačního režimu.',
                    true
                );
            } else {
                pendingIdentification.boardPresence.identificationActive =
                    message.payload?.identificationActive === true;
                pendingIdentification.boardPresence.lensState =
                    message.payload?.lensState
                    || pendingIdentification.boardPresence.lensState;
                setBoardFormStatus(
                    pendingIdentification.boardPresence.identificationActive
                        ? 'Identifikační svit čoček zapnut.'
                        : 'Čočky vráceny do původního stavu.'
                );
            }
            renderActiveBoards();
            renderDeparturesTable();
            return;
        }

        if (pendingActions.has(message.requestId)) {
            finishBoardAction(message.requestId, message);
            return;
        }
        if (finishBackgroundBoardAction(message.requestId, message)) {
            return;
        }

        const instanceId = message.payload?.instanceId || message.source;
        const boardPresence = [...activeBoards.values()].find(
            (presence) => presence.instanceId === instanceId
        );
        if (boardPresence) {
            if (message.payload?.ok === false) {
                boardPresence.syncPendingRevision = null;
            }
            boardPresence.appliedRevision = Number(message.payload?.revision)
                || boardPresence.appliedRevision;
            boardPresence.lensState = message.payload?.lensState
                || boardPresence.lensState;
            if (typeof message.payload?.identificationActive === 'boolean') {
                boardPresence.identificationActive =
                    message.payload.identificationActive;
            }
            boardPresence.lastSeen = Date.now();
            const desired = getDesiredStateForBoard(boardPresence.identity);
            if (desired
                && Number(desired.revision) <= boardPresence.appliedRevision) {
                boardPresence.lastSyncedRevision = desired.revision;
                boardPresence.syncPendingRevision = null;
            }
            renderActiveBoards();
            renderDeparturesTable();
        }
    }
});

const sendBoardAction = (
    action,
    state,
    completedMessage,
    {
        immediate = false,
        persist = true,
        target = null,
        revision = 0,
        onComplete,
        onTimeout
    } = {}
) => {
    if (boardActionInProgress) {
        return null;
    }

    setBoardActionBusy(true);
    if (persist) {
        persistState();
    }

    const expectedInstances = new Set(
        target
            ? findMatchingBoards(target).map(
                (boardPresence) => boardPresence.instanceId
            )
            : [...activeBoards.values()]
                .filter((boardPresence) =>
                    !isDepartureBoardPresence(boardPresence)
                )
                .map(
                (boardPresence) => boardPresence.instanceId
                )
    );
    const requestId = transport.publish('board:command', {
        action,
        state,
        ...(target ? { target } : {}),
        settings: getLightingSettingsState(),
        revision,
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
        pending.onTimeout?.();
    }, 10000);

    pendingActions.set(requestId, {
        completedMessage,
        expectedInstances,
        acknowledgedInstances: new Set(),
        onComplete,
        onTimeout,
        timeout
    });
    setBoardFormStatus('Tabule se přenastavuje…');
    return requestId;
};

const sendBackgroundBoardAction = (
    action,
    state,
    target,
    revision
) => {
    const expectedInstances = new Set(
        findMatchingBoards(target).map(
            (boardPresence) => boardPresence.instanceId
        )
    );
    const requestId = `live-${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;

    if (expectedInstances.size === 0) {
        transport.publish('board:command', {
            action,
            state,
            target,
            settings: getLightingSettingsState(),
            revision
        }, { requestId });
        return Promise.resolve(true);
    }

    const promise = new Promise((resolve) => {
        const timeout = window.setTimeout(() => {
            const pending = pendingBackgroundActions.get(requestId);
            if (!pending) {
                return;
            }
            pendingBackgroundActions.delete(requestId);
            resolve(false);
        }, 10000);

        pendingBackgroundActions.set(requestId, {
            expectedInstances,
            acknowledgedInstances: new Set(),
            resolve,
            timeout
        });
    });

    transport.publish('board:command', {
        action,
        state,
        target,
        settings: getLightingSettingsState(),
        revision
    }, { requestId });

    return promise;
};

const getFormState = () => {
    const [hours, minutes] = departureTimeInput.value.split(':').map(Number);
    const parsedDelay = parseDelayMinutes(delayValueInput.value);
    return {
        stations: stationInputs.map((input) => input.value),
        train: trainTypeInput.value,
        trainNumber: trainNumberInput.value.trim(),
        delay: parsedDelay === '' ? '' : parsedDelay,
        departureTime: { hours, minutes },
        lenses: getManagedLensState()
    };
};

const getEmptyState = () => ({
    ...createEmptyBoardState(),
    lenses: createEmptyLensState()
});

const getBoardStateFromDeparture = (departure) => ({
    stations: [
        formatStationName(departure.stations?.[0] || ''),
        formatStationName(departure.stations?.[1] || '')
    ],
    train: departure.train,
    trainNumber: departure.trainNumber,
    delay: departure.delay,
    departureTime: departure.departureTime
        ? { ...departure.departureTime }
        : null,
    lenses: departure.lenses
});

const sameTarget = (first, second) =>
    first?.platform === second?.platform
    && first?.track === second?.track
    && first?.sector === second?.sector;

const isConfiguredTarget = (target) =>
    Boolean(target?.platform && target?.track);

const sameDepartureContent = (first, second) =>
    JSON.stringify({
        stations: first?.stations || [],
        train: first?.train || '',
        trainNumber: first?.trainNumber || '',
        operator: first?.operator || '',
        delay: first?.delay ?? '',
        departureTime: first?.departureTime || null,
        target: first?.target || {},
        lenses: first?.lenses || null
    }) === JSON.stringify({
        stations: second?.stations || [],
        train: second?.train || '',
        trainNumber: second?.trainNumber || '',
        operator: second?.operator || '',
        delay: second?.delay ?? '',
        departureTime: second?.departureTime || null,
        target: second?.target || {},
        lenses: second?.lenses || null
    });

const sameLiveTrainNumber = (first, second) => {
    if (!first || !second) {
        return false;
    }
    return String(first).slice(-4) === String(second).slice(-4);
};

const findPreviousLiveDeparture = (departure, previousLive) => {
    const byKey = previousLive.find((item) =>
        item.liveKey && item.liveKey === departure.liveKey
    );
    if (byKey) {
        return byKey;
    }

    const sourceTrainNumber = departure.sourceTrainNumber
        || departure.trainNumber;
    if (!sourceTrainNumber) {
        return null;
    }

    return previousLive.find((item) => {
        const previousNumber = item.sourceTrainNumber || item.trainNumber;
        return sameLiveTrainNumber(previousNumber, sourceTrainNumber)
            && (
                !departure.dateKey
                || !item.dateKey
                || item.dateKey === departure.dateKey
            )
            && (
                !departure.liveStationKey
                || !item.liveStationKey
                || item.liveStationKey === departure.liveStationKey
            );
    }) || null;
};

const reconcileLiveDepartures = async (values) => {
    const previousDepartures = [...departures];
    const previousLive = previousDepartures.filter(
        (departure) => departure.source === 'live'
    );
    const normalizedLive = (Array.isArray(values) ? values : [])
        .map((value) => normalizeDeparture({
            ...value,
            source: 'live',
            lenses: getManagedLensState()
        }))
        .filter((departure) => departure.departureTime);

    const nextLive = normalizedLive.map((departure) => {
        const previous = findPreviousLiveDeparture(departure, previousLive);
        return {
            ...departure,
            id: previous?.id || departure.id,
            source: 'live',
            liveKey: departure.liveKey || previous?.liveKey,
            liveStationKey: departure.liveStationKey
                || previous?.liveStationKey
                || LIVE_STATION_DEFAULTS.key,
            dateKey: departure.dateKey || previous?.dateKey || '',
            sourceTrainNumber: departure.sourceTrainNumber
                || previous?.sourceTrainNumber
                || '',
            lenses: previous?.lenses || departure.lenses
        };
    });

    const liveTargetKeys = new Set(
        nextLive
            .filter((departure) => isConfiguredTarget(departure.target))
            .map((departure) => getBoardIdentityKey(departure.target))
    );
    const manualDepartures = previousDepartures.filter(
        (departure) =>
            departure.source !== 'live'
            && !liveTargetKeys.has(getBoardIdentityKey(departure.target))
    );
    const pairedPrevious = new Map(
        nextLive.map((departure) => [
            departure,
            findPreviousLiveDeparture(departure, previousLive)
        ])
    );
    const matchedPrevious = new Set(
        [...pairedPrevious.values()].filter(Boolean)
    );
    const changed = previousLive.length !== nextLive.length
        || previousLive.some((departure) => !matchedPrevious.has(departure))
        || nextLive.some((departure) => {
            const previous = pairedPrevious.get(departure);
            return !previous || !sameDepartureContent(previous, departure);
        });

    if (!changed) {
        return {
            changed: false,
            applied: 0
        };
    }

    departures = [...manualDepartures, ...nextLive];
    const commands = [];

    previousLive.forEach((previous) => {
        const next = nextLive.find((departure) =>
            pairedPrevious.get(departure) === previous
        );
        const targetChanged = next && !sameTarget(
            previous.target,
            next.target
        );
        const removed = !next;
        if ((removed || targetChanged)
            && isConfiguredTarget(previous.target)) {
            const revision = nextStateRevision();
            setDesiredState(
                previous.target,
                'reset-board',
                getEmptyState(),
                revision
            );
            commands.push(
                sendBackgroundBoardAction(
                    'reset-board',
                    getEmptyState(),
                    previous.target,
                    revision
                )
            );
        }
    });

    nextLive.forEach((next) => {
        const previous = pairedPrevious.get(next);
        const needsApply = !previous
            || !sameDepartureContent(previous, next)
            || !sameTarget(previous.target, next.target);
        if (!needsApply || !isConfiguredTarget(next.target)) {
            return;
        }

        const revision = nextStateRevision();
        next.revision = revision;
        setDesiredState(
            next.target,
            'apply-board',
            getBoardStateFromDeparture(next),
            revision
        );
        commands.push(
            sendBackgroundBoardAction(
                'apply-board',
                getBoardStateFromDeparture(next),
                next.target,
                revision
            )
        );
    });

    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    const results = await Promise.all(commands);
    return {
        changed: true,
        applied: results.filter(Boolean).length
    };
};

const setLiveStatus = (message, isError = false) => {
    if (!liveDeparturesStatus) {
        return;
    }
    liveDeparturesStatus.textContent = message;
    liveDeparturesStatus.classList.toggle('is-error', isError);
};

const renderManageHeaderStation = () => {
    if (!manageHeaderStation) {
        return;
    }

    const name = String(liveStationName || '').trim();
    const visible = liveDeparturesEnabled && Boolean(name);
    manageHeaderStation.hidden = !visible;
    manageHeaderStation.textContent = visible ? `stanice: ${name}` : '';
};

const renderLiveSourceStation = () => {
    const name = String(liveStationName || '').trim();
    renderManageHeaderStation();
    if (!liveSourceStation || !liveSourceStationLink) {
        return;
    }

    if (!name) {
        liveSourceStation.hidden = true;
        liveSourceStationLink.removeAttribute('href');
        liveSourceStationLink.textContent = '';
        return;
    }

    liveSourceStation.hidden = false;
    liveSourceStationLink.textContent = name;
    liveSourceStationLink.href = liveSourceUrl;
};

const renderLiveControls = () => {
    if (liveSourceUrlInput) {
        liveSourceUrlInput.value = liveSourceUrl;
        liveSourceUrlInput.disabled = liveDeparturesEnabled;
    }
    renderLiveSourceStation();
    if (liveApiUrlInput) {
        liveApiUrlInput.value = liveApiUrl;
        liveApiUrlInput.disabled = liveDeparturesEnabled;
    }
    if (liveToggleButton) {
        liveToggleButton.textContent = liveDeparturesEnabled
            ? 'Zastavit live odjezdy'
            : 'Spustit live odjezdy';
        liveToggleButton.disabled = livePollInProgress;
        liveToggleButton.setAttribute(
            'aria-pressed',
            String(liveDeparturesEnabled)
        );
    }
    if (liveDeparturesState) {
        liveDeparturesState.textContent = liveDeparturesEnabled
            ? 'Live odjezdy jsou spuštěné.'
            : 'Live odjezdy jsou vypnuté.';
    }
};

const stopLivePolling = () => {
    liveRunToken += 1;
    if (livePollTimer !== null) {
        window.clearInterval(livePollTimer);
        livePollTimer = null;
    }
};

const pollLiveDepartures = async () => {
    if (!liveDeparturesEnabled || livePollInProgress) {
        return;
    }

    livePollInProgress = true;
    renderLiveControls();
    const runToken = liveRunToken;
    try {
        const payload = await fetchLiveDepartures({
            apiUrl: liveApiUrl,
            sourceUrl: liveSourceUrl
        });
        if (!liveDeparturesEnabled || runToken !== liveRunToken) {
            return;
        }

        const result = await reconcileLiveDepartures(payload.departures);
        const fetchedAt = payload.fetchedAt
            ? new Date(payload.fetchedAt).toLocaleTimeString('cs-CZ')
            : new Date().toLocaleTimeString('cs-CZ');
        if (typeof payload.station === 'string' && payload.station.trim()) {
            liveStationName = payload.station.trim();
            persistState();
            renderLiveSourceStation();
        }
        const stationName = liveStationName || 'tabule SŽ';
        setLiveStatus(
            result.changed
                ? `Aktualizováno ${fetchedAt} (${stationName}): ${
                    payload.departures.length
                } odjezdů.`
                : `Beze změny, poslední kontrola ${fetchedAt} (${stationName}).`
        );
    } catch (error) {
        if (runToken === liveRunToken) {
            setLiveStatus(
                error instanceof Error
                    ? error.message
                    : 'Live odjezdy se nepodařilo načíst.',
                true
            );
        }
    } finally {
        livePollInProgress = false;
        renderLiveControls();
    }
};

const startLivePolling = () => {
    stopLivePolling();
    liveDeparturesEnabled = true;
    renderLiveControls();
    persistState();
    setLiveStatus('Načítám aktuální odjezdy…');
    void pollLiveDepartures();
    livePollTimer = window.setInterval(
        pollLiveDepartures,
        LIVE_POLL_INTERVAL_MS
    );
};

const stopLiveDepartures = () => {
    stopLivePolling();
    liveDeparturesEnabled = false;
    renderLiveControls();
    persistState();
    setLiveStatus('Live odjezdy byly zastaveny.');
};

let desiredStatesRepaired = false;
departures.forEach((departure) => {
    if (departure.source === 'live') {
        return;
    }
    const key = getBoardIdentityKey(departure.target);
    const revision = departure.revision || ++nextRevision;
    nextRevision = Math.max(nextRevision, revision);
    const existing = desiredStates[key];
    const existingStations = existing?.state?.stations;
    const hasCurrentStations = Array.isArray(existingStations)
        && existingStations.length >= 2
        && existingStations[0] === departure.stations[0]
        && existingStations[1] === departure.stations[1];

    // The departure collection is authoritative. Repair older desired-state
    // entries that may predate the stations being included in the payload.
    if (!existing || Number(existing.revision) < Number(revision)
        || !hasCurrentStations) {
        desiredStates[key] = {
            target: departure.target,
            action: 'apply-board',
            state: getBoardStateFromDeparture(departure),
            revision: Math.max(Number(existing?.revision) || 0, revision),
            updatedAt: departure.updatedAt || Date.now()
        };
        desiredStatesRepaired = true;
    }
});

// Recover active departures that are present in the desired-state registry
// but missing from an older/incomplete departures collection.
Object.values(desiredStates).forEach((desired) => {
    if (desired?.action !== 'apply-board'
        || !desired.target
        || !desired.state?.departureTime) {
        return;
    }

    const identity = getBoardIdentityKey(desired.target);
    const alreadyLoaded = departures.some((departure) =>
        departure.id === identity
        || getBoardIdentityKey(departure.target) === identity
    );
    if (alreadyLoaded) {
        return;
    }

    const recovered = normalizeDeparture({
        id: identity,
        target: desired.target,
        ...desired.state,
        revision: desired.revision,
        updatedAt: desired.updatedAt
    });
    if (recovered.target.platform
        && recovered.target.track
        && recovered.departureTime) {
        departures.push(recovered);
        nextRevision = Math.max(
            nextRevision,
            Number(recovered.revision) || 0
        );
        desiredStatesRepaired = true;
    }
});

const upsertDeparture = (state, target) => {
    const revision = nextStateRevision();
    const departure = normalizeDeparture({
        target,
        ...state,
        revision,
        updatedAt: Date.now()
    });
    departures = [
        ...departures.filter((item) => item.id !== departure.id),
        departure
    ];
    setDesiredState(
        target,
        'apply-board',
        getBoardStateFromDeparture(departure),
        revision
    );
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    return departure;
};

const resetDeparture = (departure) => {
    if (!departure || boardActionInProgress) {
        return;
    }

    const revision = nextStateRevision();
    departures = departures.filter((item) => item.id !== departure.id);
    setDesiredState(
        departure.target,
        'reset-board',
        getEmptyState(),
        revision
    );
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    sendBoardAction(
        'reset-board',
        getEmptyState(),
        `Tabule pro ${formatBoardIdentity(departure.target)} byla resetována.`,
        {
            target: departure.target,
            revision
        }
    );
};

const clearAllDepartures = () => {
    if (boardActionInProgress || departures.length === 0) {
        return;
    }

    const confirmed = window.confirm(
        departures.length === 1
            ? 'Opravdu vymazat 1 uložený odjezd a resetovat související tabule?'
            : `Opravdu vymazat všech ${departures.length} uložených odjezdů a resetovat související tabule?`
    );
    if (!confirmed) {
        return;
    }

    const targets = [];
    const seen = new Set();
    departures.forEach((departure) => {
        if (!isConfiguredTarget(departure.target)) {
            return;
        }

        const key = getBoardIdentityKey(departure.target);
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        targets.push(departure.target);
    });

    departures = [];
    targets.forEach((target) => {
        const revision = nextStateRevision();
        setDesiredState(
            target,
            'reset-board',
            getEmptyState(),
            revision
        );
        void sendBackgroundBoardAction(
            'reset-board',
            getEmptyState(),
            target,
            revision
        );
    });

    exampleActive = false;
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    setBoardFormStatus(
        targets.length
            ? 'Všechny odjezdy byly vymazány a tabule resetovány.'
            : 'Všechny odjezdy byly vymazány.'
    );
};

clearAllDeparturesButton?.addEventListener('click', clearAllDepartures);

departuresTable?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-departure-action]');
    if (!actionButton) {
        return;
    }

    const departure = getDepartureById(actionButton.dataset.departureId);
    if (actionButton.dataset.departureAction === 'load') {
        loadDepartureIntoForm(departure);
    } else if (actionButton.dataset.departureAction === 'reset') {
        resetDeparture(departure);
    }
});

departuresTable?.querySelectorAll('[data-sort-key]').forEach((button) => {
    button.addEventListener('click', () => {
        const key = button.dataset.sortKey;
        sortState = {
            key,
            direction: sortState.key === key && sortState.direction === 'asc'
                ? 'desc'
                : 'asc'
        };
        persistState();
        renderDeparturesTable();
    });
});

setFormValues(exampleState);
if (savedState?.form && typeof savedState.form === 'object') {
    setSavedFormValues(savedState.form);
}
if (desiredStatesRepaired) {
    persistState();
}
const padClockPart = (value) => String(value).padStart(2, '0');

const formatManageClock = (date) =>
    `${padClockPart(date.getHours())}:`
    + `${padClockPart(date.getMinutes())}:`
    + `${padClockPart(date.getSeconds())}`;

const renderManageClock = (date = new Date()) => {
    if (!manageHeaderClock) {
        return;
    }

    manageHeaderClock.textContent = formatManageClock(date);
    manageHeaderClock.dateTime = date.toISOString();
};

let manageClockTimer = null;
const scheduleManageClock = () => {
    const now = new Date();
    renderManageClock(now);
    manageClockTimer = window.setTimeout(
        scheduleManageClock,
        1000 - now.getMilliseconds()
    );
};

scheduleManageClock();

renderActiveBoards();
renderDeparturesTable();
syncClockLightControls();
syncFlapTimingControls();
syncDelayOffsetControls();
syncDepartureBoardRowControls();
syncDepartureBoardLogoControls();
renderNightMode();
syncAutomaticNightMode();

startButton.textContent = 'Načíst příklad';
startButton.setAttribute('aria-pressed', 'false');
startButton.addEventListener('click', () => {
    const showExample = !exampleActive;

    exampleActive = showExample;
    if (showExample) {
        setFormValues(exampleState);
        const target = getFormTarget();
        const state = {
            ...exampleState,
            lenses: createDefaultLensState()
        };
        const departure = upsertDeparture(state, target);
        startButton.textContent = 'Resetovat tabuli';
        startButton.setAttribute('aria-pressed', 'true');
        sendBoardAction(
            'apply-board',
            getBoardStateFromDeparture(departure),
            'Příklad načten.',
            {
                target,
                revision: departure.revision
            }
        );
        return;
    }

    const target = getFormTarget();
    const revision = nextStateRevision();
    departures = departures.filter(
        (departure) => departure.id !== getBoardIdentityKey(target)
    );
    setDesiredState(target, 'reset-board', getEmptyState(), revision);
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');
    sendBoardAction(
        'reset-board',
        getEmptyState(),
        'Tabule resetována.',
        {
            target,
            revision
        }
    );
});

resetAllSettingsButton.addEventListener('click', () => {
    if (boardActionInProgress) {
        return;
    }

    storage.clear();
    legacyStorage.clear();
    stopLivePolling();
    liveDeparturesEnabled = false;
    liveApiUrl = getDefaultLiveApiUrl();
    liveSourceUrl = LIVE_STATION_DEFAULTS.sourceUrl;
    liveStationName = LIVE_STATION_DEFAULTS.name;
    departures = [];
    desiredStates = {};
    lighting.reset();
    lensDisplay.setImmediate(createDefaultLensState());
    nightMode = false;
    autoNightMode = false;
    sunSchedule.stop();
    flapTiming = normalizeFlapTiming(FLAP_TIMING_DEFAULTS);
    delayOffset = DELAY_OFFSET_DEFAULT;
    departureBoardRows = DEPARTURE_BOARD_ROW_COUNT_DEFAULT;
    departureBoardLogo = DEPARTURE_BOARD_LOGO_DEFAULT;
    departureBoardLogoSvg = '';
    renderNightMode();
    renderLiveControls();
    setLiveStatus('Live odjezdy byly vypnuté obnovením nastavení.');
    syncLensControls();
    NIGHT_LIGHT_DEFAULTS.forEach((setting) =>
        syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    syncFlapTimingControls();
    syncDelayOffsetControls();
    syncDepartureBoardRowControls();
    syncDepartureBoardLogoControls();
    publishSettings({ persist: false });
    setFormValues(exampleState);
    exampleActive = false;
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');
    renderDeparturesTable();
    const resetRevision = nextStateRevision();
    globalResetRevision = resetRevision;
    persistState();
    publishDepartureSnapshot();

    sendBoardAction(
        'reset-all',
        {
            ...createEmptyBoardState(),
            lenses: createEmptyLensState()
        },
        'Všechna nastavení byla obnovena na výchozí hodnoty.',
        {
            immediate: true,
            persist: false,
            revision: resetRevision
        }
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

    if (!TRAIN_NUMBER_PATTERN.test(trainNumberInput.value.trim())) {
        setBoardFormStatus(
            'Číslo vlaku musí obsahovat nejvýše 4 číslice.',
            true
        );
        trainNumberInput.focus();
        return;
    }

    const target = getFormTarget();
    if (!target.platform || !target.track) {
        setBoardFormStatus(
            'Vyplňte nástupiště a kolej, pro které se odjezd odesílá.',
            true
        );
        (!target.platform ? platformInput : trackInput).focus();
        return;
    }

    const departure = upsertDeparture(getFormState(), target);
    exampleActive = true;
    startButton.textContent = 'Resetovat tabuli';
    startButton.setAttribute('aria-pressed', 'true');
    sendBoardAction(
        'apply-board',
        getBoardStateFromDeparture(departure),
        'Údaje byly odeslány na tabuli.',
        {
            target,
            revision: departure.revision
        }
    );
});

[...stationInputs, platformInput, trackInput, sectorInput,
    trainTypeInput, trainNumberInput, departureTimeInput, delayValueInput]
    .forEach((input) => {
        input.addEventListener('input', persistState);
        input.addEventListener('change', persistState);
    });

liveSourceUrlInput?.addEventListener('change', () => {
    const value = liveSourceUrlInput.value.trim();
    const parsed = parseLiveSourceUrl(value);
    if (value && !parsed.valid) {
        setLiveStatus(
            'URL musí být tabule Správy železnic ve formátu '
            + 'StationTable.aspx?Key=…',
            true
        );
        renderLiveControls();
        return;
    }

    if (parsed.key !== parseLiveSourceUrl(liveSourceUrl).key) {
        liveStationName = parsed.key === LIVE_STATION_DEFAULTS.key
            ? LIVE_STATION_DEFAULTS.name
            : '';
    }
    liveSourceUrl = parsed.sourceUrl;
    renderLiveControls();
    persistState();
    setLiveStatus('');
});

liveApiUrlInput?.addEventListener('change', () => {
    liveApiUrl = normalizeLiveApiUrl(
        liveApiUrlInput.value.trim() || getDefaultLiveApiUrl()
    );
    renderLiveControls();
    persistState();
});

liveToggleButton?.addEventListener('click', () => {
    if (liveDeparturesEnabled) {
        stopLiveDepartures();
    } else {
        startLivePolling();
    }
});

renderLiveControls();
publishDiscovery();
publishDepartureSnapshot();
heartbeatTimer = window.setInterval(publishDiscovery, 4000);
presenceTimer = window.setInterval(pruneActiveBoards, 4000);

window.pragotron = {
    transport,
    lighting,
    getState: () => ({
        form: getFormState(),
        target: getFormTarget(),
        ...getSettingsState(),
        departures: [...departures],
        liveDepartures: {
            enabled: liveDeparturesEnabled,
            apiUrl: liveApiUrl,
            station: liveStationName,
            stationKey: parseLiveSourceUrl(liveSourceUrl).key,
            sourceUrl: liveSourceUrl
        }
    }),
    getActiveBoards: () => [...activeBoards.values()].map((boardPresence) => ({
        ...boardPresence,
        identity: { ...boardPresence.identity }
    })),
    setNightMode,
    setAutomaticNightMode,
    destroy: () => {
        documentRef.removeEventListener('visibilitychange', handleVisibilityChange);
        sunSchedule.destroy();
        stopLivePolling();
        pendingBackgroundActions.forEach(({ timeout, resolve }) => {
            window.clearTimeout(timeout);
            resolve(false);
        });
        pendingBackgroundActions.clear();
        pendingActions.forEach(({ timeout }) => window.clearTimeout(timeout));
        pendingActions.clear();
        pendingIdentificationActions.forEach(({ timeout }) =>
            window.clearTimeout(timeout)
        );
        pendingIdentificationActions.clear();
        clearLensActivationTimer();
        window.clearTimeout(manageClockTimer);
        window.clearInterval(heartbeatTimer);
        window.clearInterval(presenceTimer);
        manageClockTimer = null;
        heartbeatTimer = null;
        presenceTimer = null;
        transport.close();
        lensDisplay.destroy();
    }
};

if (liveDeparturesEnabled) {
    startLivePolling();
}
