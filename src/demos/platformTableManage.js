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
    getActiveStationProfile,
    FLAP_TIMING_DEFAULTS,
    DEPARTURE_FLAP_TIMING_DEFAULTS,
    PLATFORM_FLAP_TIMING_DEFAULTS,
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
    formatStationName,
    matchProfileValue,
    profileSectorValues,
    resolveProfileTrainType,
    setActiveStationProfile,
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
    fetchScraperSchema,
    getDefaultLiveApiUrl,
    LIVE_POLL_INTERVAL_MS,
    LIVE_STATION_DEFAULTS,
    normalizeLiveApiUrl,
    normalizeLivePollIntervalMs,
    normalizeLiveSourceUrl,
    normalizeScraperParameterValue,
    parseLiveSourceUrl,
    postScraperControl,
    SCRAPER_IDLE_ERROR,
    scraperControlUrl
} from '../platform/index.js';
import { mountManageLayout } from './manageLayout.js';
import { mountStationProfileEditor } from './stationProfileEditor.js';

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
if (savedState.stationProfile) {
    setActiveStationProfile(savedState.stationProfile);
}
const logOutput = documentRef.querySelector('#logOutput');
const MANAGE_LOG_LIMIT = 250;

const stringifyLogValue = (value) => {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

const classifyManageLogLine = (line) => {
    const match = String(line).match(
        /^\[pragotron\]\s+(\d{1,2}:\d{2}:\d{2}\.\d{3})\s+([\s\S]+)$/
    );
    const time = match?.[1] || '';
    const direction = (match?.[2] || String(line)).trim();
    const kind = direction === 'odesláno'
        ? 'out'
        : direction === 'přijato'
            ? 'in'
            : 'system';
    return { time, direction, kind };
};

const formatLogTooltip = (date, time) => {
    const datePart = date.toLocaleDateString('cs-CZ');
    const match = String(time).match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/);
    if (!match) {
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        const clock = [
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
            String(date.getSeconds()).padStart(2, '0')
        ].join(':');
        return `${datePart} ${clock}.${ms}`;
    }
    const [, hours, minutes, seconds, milliseconds] = match;
    return `${datePart} ${hours.padStart(2, '0')}:${minutes}:${seconds}.${milliseconds}`;
};

const senderColors = new Map();

const senderHue = (clientId) => {
    let hash = 2166136261;
    const text = String(clientId || '');
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 360;
};

const senderColor = (clientId) => {
    const key = String(clientId || '');
    const known = senderColors.get(key);
    if (known) {
        return known;
    }

    const used = new Set(senderColors.values());
    let hue = senderHue(key);
    let color = `hsl(${hue} 70% 68%)`;
    let guard = 0;
    while (used.has(color) && guard < 360) {
        hue = (hue + 37) % 360;
        color = `hsl(${hue} 70% 68%)`;
        guard += 1;
    }
    senderColors.set(key, color);
    return color;
};

const createLogTime = (date, time) => {
    const tooltip = formatLogTooltip(date, time);
    const clock = document.createElement('time');
    clock.className = 'log-bubble-time';
    clock.dateTime = date.toISOString();
    clock.title = tooltip;
    clock.textContent = time || tooltip.slice(tooltip.lastIndexOf(' ') + 1);
    return clock;
};

const appendManageLog = (line, details) => {
    if (!logOutput) {
        return;
    }

    const sentAt = new Date();
    const { time, direction, kind } = classifyManageLogLine(line);
    const record = details && typeof details === 'object' ? details : null;
    const bubble = document.createElement('article');
    bubble.className = `log-bubble log-bubble-${kind}`;
    bubble.setAttribute(
        'aria-label',
        record?.typ ? `${direction}: ${record.typ}` : direction
    );

    if (kind === 'system') {
        const label = document.createElement('p');
        label.className = 'log-bubble-system-line';
        label.append(document.createTextNode(direction));
        if (time) {
            label.append(document.createTextNode(' · '));
            label.append(createLogTime(sentAt, time));
        }
        bubble.append(label);

        if (record) {
            const note = document.createElement('p');
            note.className = 'log-bubble-system-note';
            const bits = [];
            if (record.url) {
                bits.push(String(record.url));
            }
            if (record.dalšíPokusZaMs != null) {
                bits.push(`další pokus za ${record.dalšíPokusZaMs} ms`);
            }
            note.textContent = bits.length
                ? bits.join(' · ')
                : stringifyLogValue(record);
            bubble.append(note);
        }
    } else {
        const senderId = String(record?.od || '').trim();
        bubble.setAttribute(
            'aria-label',
            record?.typ
                ? `${direction}: ${senderId || '—'}, ${record.typ}`
                : `${direction}: ${senderId || '—'}`
        );
        const sender = document.createElement('p');
        sender.className = 'log-bubble-sender';
        sender.textContent = senderId || '—';
        if (kind === 'in' && senderId) {
            sender.style.color = senderColor(senderId);
        }
        const message = document.createElement('p');
        message.className = 'log-bubble-text';
        message.textContent = record?.typ || direction;
        bubble.append(sender, message);

        const payload = record && Object.hasOwn(record, 'data')
            ? record.data
            : record;
        const emptyObject = payload
            && typeof payload === 'object'
            && !Array.isArray(payload)
            && Object.keys(payload).length === 0;
        const hasPayload = payload != null && !emptyObject;
        const foot = document.createElement('div');
        foot.className = 'log-bubble-foot';
        if (hasPayload || record?.requestId) {
            const disclosure = document.createElement('details');
            disclosure.className = 'log-bubble-data';
            const summary = document.createElement('summary');
            summary.textContent = 'podrobnosti';
            const body = document.createElement('pre');
            body.className = 'log-bubble-body';
            body.textContent = stringifyLogValue(
                record?.requestId
                    ? { requestId: record.requestId, data: payload }
                    : payload
            );
            disclosure.append(summary, body);
            foot.append(disclosure);
        }
        foot.append(createLogTime(sentAt, time));
        bubble.append(foot);
    }

    const pinnedToBottom = logOutput.scrollHeight
        - logOutput.scrollTop
        - logOutput.clientHeight < 48;
    logOutput.append(bubble);
    while (logOutput.childElementCount > MANAGE_LOG_LIMIT) {
        logOutput.firstElementChild?.remove();
    }
    if (pinnedToBottom) {
        logOutput.scrollTop = logOutput.scrollHeight;
    }
};

const transport = new BoardTransport({
    onLog: appendManageLog
});

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
const operatorInput = documentRef.querySelector('#operatorValue');
const departureTimeInput = documentRef.querySelector('#departureTime');
const delayValueInput = documentRef.querySelector('#delayValue');
const delayOffsetEnabledInput = documentRef.querySelector(
    '#delayOffsetEnabled'
);
const manageHeaderClock = documentRef.querySelector('#manageHeaderClock');
const manageHeaderStation = documentRef.querySelector('#manageHeaderStation');
const boardSettingsDialog = documentRef.querySelector('#boardSettingsDialog');
const boardSettingsTitle = documentRef.querySelector('#boardSettingsTitle');
const boardSettingsBody = documentRef.querySelector('#boardSettingsBody');
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
const liveScraperParametersRoot = documentRef.querySelector(
    '#liveScraperParameters'
);
const liveToggleButton = documentRef.querySelector('#liveToggleButton');
const liveDeparturesState = documentRef.querySelector('#liveDeparturesState');
const liveDeparturesStatus = documentRef.querySelector('#liveDeparturesStatus');
const liveDeparturesDescription = documentRef.querySelector(
    '#liveDeparturesDescription'
);
const livePollIntervalInput = documentRef.querySelector('#livePollInterval');
const livePollIntervalValue = documentRef.querySelector('#livePollIntervalValue');
const submitButton = boardForm.querySelector('button[type="submit"]');
const MANAGE_DOCUMENT_TITLE = documentRef.title || 'PRAGOTRON – manage';

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
let boardSettingsInstanceId = '';
let departureBoardLogo = normalizeDepartureBoardLogoId(
    savedSettings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
);
let departureBoardLogoSvg = String(savedSettings?.departureBoardLogoSvg || '')
    .trim()
    .slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
let settingsUpdatedAt = Number(savedSettings?.settingsUpdatedAt) || 0;

const readStoredSettings = () => {
    const stored = storage.load();
    return stored?.settings && typeof stored.settings === 'object'
        ? stored.settings
        : null;
};

const useNewerStoredLogo = () => {
    const storedSettings = readStoredSettings();
    const storedStamp = Number(storedSettings?.settingsUpdatedAt) || 0;
    if (!storedSettings || storedStamp <= settingsUpdatedAt) {
        return null;
    }

    return {
        departureBoardLogo: normalizeDepartureBoardLogoId(
            storedSettings.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
        ),
        departureBoardLogoSvg: String(storedSettings.departureBoardLogoSvg || '')
            .trim()
            .slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH),
        settingsUpdatedAt: storedStamp
    };
};
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
const savedScraperParameters = savedLiveSettings.parameters
    && typeof savedLiveSettings.parameters === 'object'
    && !Array.isArray(savedLiveSettings.parameters)
    ? savedLiveSettings.parameters
    : {};
let liveParameterValues = Object.fromEntries(
    Object.entries(savedScraperParameters)
        .filter(([key]) => /^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(key))
        .map(([key, value]) => [key, String(value ?? '')])
);
let liveSourceUrl = normalizeLiveSourceUrl(
    typeof liveParameterValues.source === 'string'
        && liveParameterValues.source.trim()
        ? liveParameterValues.source.trim()
        : typeof savedLiveSettings.sourceUrl === 'string'
            && savedLiveSettings.sourceUrl.trim()
            ? savedLiveSettings.sourceUrl.trim()
            : LIVE_STATION_DEFAULTS.sourceUrl
);
if (liveParameterValues.source == null) {
    liveParameterValues.source = liveSourceUrl;
}
let liveScraperSchema = null;
let liveSchemaLoading = false;
let liveSchemaToken = 0;
let liveWatchApiUrl = '';
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
let livePollIntervalMs = normalizeLivePollIntervalMs(
    savedLiveSettings.pollIntervalMs
);
let livePollTimer = null;
let livePollInProgress = false;
let liveRunToken = 0;
let exampleActive = false;
let boardActionInProgress = false;
const pendingActions = new Map();
const pendingBackgroundActions = new Map();
const pendingIdentificationActions = new Map();
const activeBoards = new Map();
const settingsSentToInstances = new Set();
let departures = Array.isArray(savedState.departures)
    ? savedState.departures
    : [];
let formDepartureId = '';
let formDepartureLocked = false;
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
    operator: '',
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

const normalizeOperator = (value) =>
    String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);

const resolveTrainTypeValue = (train, operator) =>
    resolveProfileTrainType(train, operator);

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
    operatorInput.value = state.operator || '';
    trainTypeInput.value = resolveTrainTypeValue(state.train, state.operator);
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
    const operator = normalizeOperator(formState.operator);
    const train = resolveTrainTypeValue(formState.train, operator)
        || exampleState.train;
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
    operatorInput.value = operator;
    trainTypeInput.value = train;
    trainNumberInput.value = trainNumber;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
};

const getLightingSettingsState = () => {
    const newerLogo = useNewerStoredLogo();
    return {
        nightMode,
        autoNightMode,
        delayOffset,
        departureBoardLogo: newerLogo?.departureBoardLogo ?? departureBoardLogo,
        departureBoardLogoSvg: newerLogo?.departureBoardLogoSvg
            ?? departureBoardLogoSvg,
        settingsUpdatedAt: newerLogo?.settingsUpdatedAt ?? settingsUpdatedAt,
        lenses: getManagedLensState()
    };
};

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
    flapTiming: { ...flapTiming },
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
    operator: operatorInput.value,
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

const normalizePlatformValue = (value) =>
    matchProfileValue(getActiveStationProfile().platforms, value);

const normalizeTrackValue = (value) =>
    matchProfileValue(getActiveStationProfile().tracks, value);

const normalizeSectorValue = (value) =>
    matchProfileValue(profileSectorValues(), value);

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
    const operator = normalizeOperator(
        source.operator ?? desiredState.operator
    );
    const rawTrain = source.train ?? desiredState.train;
    const train = resolveTrainTypeValue(rawTrain, operator);
    const trainNumber = normalizeTrainNumber(
        source.trainNumber ?? desiredState.trainNumber
    );
    const stations = Array.isArray(source.stations)
        ? source.stations
        : [];

    const isLive = source.source === 'live'
        || Boolean(source.liveKey);
    const liveKey = isLive ? String(source.liveKey || source.id || '') : '';
    const manualId = String(source.id || '').trim()
        || (
            target.platform && target.track
                ? getBoardIdentityKey(target)
                : `manual:${Date.now().toString(36)}:${
                    Math.random().toString(36).slice(2, 8)
                }`
        );
    const sourceTrainNumber = isLive
        ? String(source.sourceTrainNumber || '').replace(/\D/g, '')
        : '';
    return {
        id: isLive
            ? String(source.id || `live:${liveKey}`)
            : manualId,
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
        operator,
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
    .filter((departure) => departure.departureTime);

const persistState = () => {
    const newerLogo = useNewerStoredLogo();
    const settings = {
        ...getSettingsState(),
        lamps: lighting.getLampSettings(),
        clockLight: lighting.getClockSettings(),
        ...(newerLogo || {}),
        settingsUpdatedAt: newerLogo?.settingsUpdatedAt ?? settingsUpdatedAt
    };
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
            sourceUrl: liveSourceUrl,
            parameters: { ...liveParameterValues },
            pollIntervalMs: livePollIntervalMs
        },
        revision: nextRevision,
        globalResetRevision,
        sort: sortState,
        stationProfile: getActiveStationProfile()
    });
};

const publishStationProfile = () => {
    transport.publish('station-profile', {
        stationProfile: getActiveStationProfile()
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
    const newerLogo = useNewerStoredLogo();
    if (newerLogo) {
        departureBoardLogo = newerLogo.departureBoardLogo;
        departureBoardLogoSvg = newerLogo.departureBoardLogoSvg;
        settingsUpdatedAt = newerLogo.settingsUpdatedAt;
        syncDepartureBoardLogoControls();
    } else {
        settingsUpdatedAt = Date.now();
    }
    if (persist) {
        persistState();
    }
    transport.publish('board:settings', getLightingSettingsState());
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
        const color = LENS_COLORS.yellow; //LENS_COLORS[setting.color] || LENS_COLORS.green;
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
            departure.operator || '—',
            departure.train || '—',
            departure.trainNumber || '—',
            departure.stations[0],
            departure.stations[1],
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
        const disabled = rows.length === 0;
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
    if (!boardPresence) {
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

let activeBoardRenderDeferred = false;

const normalizeBoardVolume = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 100;
    }

    return Math.min(100, Math.max(0, Math.round(numeric)));
};

const formatBoardConnection = (connection) => {
    if (connection?.channel !== 'network') {
        return 'lokálně, tab prohlížeče';
    }

    const network = connection.network || '';
    const client = connection.client || '';
    if (network && client && network !== client) {
        return `přes síť ${network}, počítač ${client}`;
    }
    if (network || client) {
        return `přes síť ${network || client}`;
    }
    return 'přes síť';
};

const renderActiveBoards = () => {
    if (!activeBoardsList) {
        return;
    }

    if (document.activeElement?.classList?.contains('board-volume-range')
        && activeBoardsList?.contains(document.activeElement)) {
        activeBoardRenderDeferred = true;
        return;
    }

    activeBoardRenderDeferred = false;

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
        details.className = 'active-board-details';
        const instanceLine = documentRef.createElement('span');
        instanceLine.append(documentRef.createTextNode(
            `${isDepartureBoard
                ? `${boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT} řádků`
                : 'nástupištní tabule'} · instance `
        ));
        const clientId = documentRef.createElement('span');
        clientId.className = 'active-board-client';
        clientId.textContent = boardPresence.instanceId || '—';
        if (boardPresence.instanceId) {
            clientId.style.color = senderColor(boardPresence.instanceId);
        }
        instanceLine.append(clientId);
        const connectionLine = documentRef.createElement('span');
        connectionLine.className = 'active-board-connection';
        connectionLine.classList.toggle(
            'is-network',
            boardPresence.connection?.channel === 'network'
        );
        const connectionText = documentRef.createElement('span');
        connectionText.className = 'active-board-connection-text';
        connectionText.textContent = formatBoardConnection(
            boardPresence.connection
        );
        const userAgent = documentRef.createElement('span');
        userAgent.className = 'active-board-user-agent';
        userAgent.textContent = boardPresence.userAgent || '';
        userAgent.title = boardPresence.userAgent || '';
        userAgent.hidden = !boardPresence.userAgent;
        connectionLine.append(connectionText, userAgent);
        details.append(instanceLine);
        const status = documentRef.createElement('span');
        status.className = 'active-board-status';
        status.textContent = !isDepartureBoard
            && boardPresence.configured === false
            ? 'Není nakonfigurovaná'
            : 'Online';
        const audioStatus = documentRef.createElement('span');
        const audioMuted = boardPresence.audioState?.muted === true;
        const audioUnlocked = boardPresence.audioState?.unlocked === true;
        audioStatus.className = 'active-board-audio';
        audioStatus.textContent = audioMuted ? '🔇' : audioUnlocked ? '🔊' : '🔈';
        audioStatus.title = audioMuted
            ? 'Zvuk flapů je ztlumený'
            : audioUnlocked
                ? 'Přehrávání zvuku je povolené'
                : 'Přehrávání zvuku čeká na kliknutí do tabule';
        audioStatus.setAttribute('role', 'img');
        audioStatus.setAttribute(
            'aria-label',
            audioMuted
                ? 'Zvuk ztlumen'
                : audioUnlocked
                    ? 'Zvuk povolen'
                    : 'Zvuk nepovolen'
        );
        const actions = documentRef.createElement('div');
        actions.className = 'active-board-actions';
        const settingsButton = documentRef.createElement('button');
        settingsButton.type = 'button';
        settingsButton.className = 'board-settings-button';
        settingsButton.dataset.boardInstanceId = boardPresence.instanceId;
        settingsButton.replaceChildren(createGearIcon());
        settingsButton.setAttribute('aria-label', 'Nastavení tabule');
        settingsButton.title = 'Nastavení tabule';
        const identifyButton = documentRef.createElement('button');
        identifyButton.type = 'button';
        identifyButton.className = 'identify-board-button';
        identifyButton.dataset.boardInstanceId = boardPresence.instanceId;
        identifyButton.replaceChildren(
            createEyeIcon(boardPresence.identificationActive === true)
        );
        identifyButton.disabled = boardPresence.configured === false;
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
        const muteButton = documentRef.createElement('button');
        muteButton.type = 'button';
        muteButton.className = 'mute-board-button';
        muteButton.dataset.boardInstanceId = boardPresence.instanceId;
        muteButton.replaceChildren(createSpeakerIcon(audioMuted));
        muteButton.setAttribute('aria-pressed', String(audioMuted));
        muteButton.setAttribute(
            'aria-label',
            audioMuted
                ? 'Zapnout zvuk flapů na této tabuli'
                : 'Ztlumit zvuk flapů na této tabuli'
        );
        const audioVolume = normalizeBoardVolume(boardPresence.audioState?.volume);
        const volumeControl = documentRef.createElement('label');
        volumeControl.className = 'board-volume';
        const volumeText = documentRef.createElement('span');
        volumeText.textContent = 'Hlasitost';
        const volumeRange = documentRef.createElement('input');
        volumeRange.type = 'range';
        volumeRange.className = 'board-volume-range';
        volumeRange.min = '0';
        volumeRange.max = '100';
        volumeRange.step = '1';
        volumeRange.value = String(audioVolume);
        volumeRange.dataset.boardInstanceId = boardPresence.instanceId;
        volumeRange.setAttribute(
            'aria-label',
            'Hlasitost zvuku flapů na této tabuli'
        );
        const volumeOutput = documentRef.createElement('output');
        volumeOutput.textContent = `${audioVolume} %`;
        volumeRange.addEventListener('input', () => {
            volumeOutput.textContent = `${volumeRange.value} %`;
            setBoardVolume(boardPresence, volumeRange.value);
        });
        volumeRange.addEventListener('change', () => {
            setBoardFormStatus(
                `Hlasitost tabule nastavena na ${volumeRange.value} %.`
            );
        });
        volumeRange.addEventListener('blur', () => {
            if (activeBoardRenderDeferred) {
                renderActiveBoards();
            }
        });
        volumeControl.append(volumeText, volumeRange, volumeOutput);
        actions.append(volumeControl, muteButton, settingsButton);
        const heading = documentRef.createElement('div');
        heading.className = 'active-board-heading';
        heading.append(identifyButton, identity);
        item.append(heading, details, status, audioStatus, actions, connectionLine);
        activeBoardsList.appendChild(item);
    });
};

const createGearIcon = () => {
    const icon = documentRef.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
    );
    icon.classList.add('board-settings-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"></path>';
    return icon;
};

const createSpeakerIcon = (muted) => {
    const icon = documentRef.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
    );
    icon.classList.add('board-audio-icon');
    icon.classList.toggle('is-muted', muted);
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = muted
        ? '<path d="M4 10h3l4-4v12l-4-4H4z"></path><path d="M16 10l4 4"></path><path d="M20 10l-4 4"></path>'
        : '<path d="M4 10h3l4-4v12l-4-4H4z"></path><path d="M16 9.5a4 4 0 0 1 0 5"></path><path d="M18.2 7a7 7 0 0 1 0 10"></path>';
    return icon;
};

const setBoardVolume = (boardPresence, volume) => {
    if (!boardPresence) {
        return;
    }

    const nextVolume = normalizeBoardVolume(volume);
    boardPresence.audioState = {
        ...(boardPresence.audioState || {}),
        volume: nextVolume
    };
    documentRef.querySelectorAll('.board-volume-range').forEach((input) => {
        if (input.dataset.boardInstanceId !== boardPresence.instanceId
            || input === documentRef.activeElement) {
            return;
        }
        input.value = String(nextVolume);
        const output = input.parentElement?.querySelector('output');
        if (output) {
            output.textContent = `${nextVolume} %`;
        }
    });
    transport.publish('board:command', {
        action: 'set-audio-volume',
        volume: nextVolume
    }, {
        target: {
            source: boardPresence.instanceId
        }
    });
    syncOpenBoardSettingsAudio(boardPresence);
};

const toggleBoardMute = (boardPresence) => {
    if (!boardPresence) {
        return;
    }

    const muted = boardPresence.audioState?.muted !== true;
    boardPresence.audioState = {
        ...(boardPresence.audioState || {}),
        muted
    };
    renderActiveBoards();
    transport.publish('board:command', {
        action: 'set-audio-muted',
        muted
    }, {
        target: {
            source: boardPresence.instanceId
        }
    });
    setBoardFormStatus(
        muted
            ? 'Zvuk flapů na tabuli je ztlumený.'
            : 'Zvuk flapů na tabuli je zapnutý.'
    );
    syncOpenBoardSettingsAudio(boardPresence);
};

const findBoardPresence = (instanceId) => [...activeBoards.values()].find(
    (presence) => presence.instanceId === instanceId
);

const boardSettingsTitleFor = (boardPresence) => {
    if (boardPresence.page === 'departureBoard') {
        return 'Odjezdová tabule';
    }
    if (boardPresence.configured === false) {
        return 'Tabule bez identity';
    }
    return formatBoardIdentity(boardPresence.identity);
};

const currentLensColors = (boardPresence) => {
    const reported = Array.isArray(boardPresence.lensColors)
        ? boardPresence.lensColors
        : [];
    const fromState = boardPresence.lensState?.lenses || [];
    return [
        reported[0] || fromState[0]?.color || 'green',
        reported[1] || fromState[1]?.color || reported[0] || fromState[0]?.color || 'green'
    ];
};

const syncOpenBoardSettingsAudio = (boardPresence) => {
    if (!boardSettingsDialog?.open
        || boardSettingsInstanceId !== boardPresence?.instanceId) {
        return;
    }

    const range = boardSettingsDialog.querySelector('.board-settings-volume');
    const output = boardSettingsDialog.querySelector('.board-settings-volume-output');
    const volume = normalizeBoardVolume(boardPresence.audioState?.volume);
    if (range && documentRef.activeElement !== range) {
        range.value = String(volume);
    }
    if (output && documentRef.activeElement !== range) {
        output.textContent = `${volume} %`;
    }

    const muteButton = boardSettingsDialog.querySelector('.board-settings-mute');
    if (!muteButton) {
        return;
    }
    const muted = boardPresence.audioState?.muted === true;
    muteButton.replaceChildren(createSpeakerIcon(muted));
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute(
        'aria-label',
        muted
            ? 'Zapnout zvuk flapů na této tabuli'
            : 'Ztlumit zvuk flapů na této tabuli'
    );
};

const assignIfIdle = (control, value) => {
    if (!control || documentRef.activeElement === control) {
        return;
    }
    if (control.type === 'checkbox') {
        control.checked = Boolean(value);
        return;
    }
    const nextValue = String(value);
    if (control.value !== nextValue) {
        control.value = nextValue;
    }
};

const syncOpenBoardSettings = (boardPresence) => {
    syncOpenBoardSettingsAudio(boardPresence);
    if (!boardSettingsDialog?.open
        || boardSettingsInstanceId !== boardPresence?.instanceId) {
        return;
    }

    const colors = currentLensColors(boardPresence);
    const selects = boardSettingsDialog.querySelectorAll(
        '.lens-control-select select'
    );
    assignIfIdle(selects[0], LENS_COLORS[colors[0]] ? colors[0] : 'green');
    assignIfIdle(
        selects[1],
        LENS_COLORS[colors[1]] ? colors[1] : selects[0]?.value || 'green'
    );

    assignIfIdle(
        boardSettingsDialog.querySelector('.board-sync-rows input'),
        boardPresence.synchronizeRows !== false
    );
    assignIfIdle(
        boardSettingsDialog.querySelector('.board-form-field input[type="number"]'),
        normalizeDepartureBoardRowCount(
            boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT
        )
    );

    const timing = boardPresence.flapTiming
        ? normalizeFlapTiming(boardPresence.flapTiming)
        : null;
    const ranges = boardSettingsDialog.querySelectorAll(
        '.flap-timing-settings input[type="range"]'
    );
    if (timing) {
        assignIfIdle(ranges[0], timing.duration);
        assignIfIdle(ranges[1], timing.variation);
        if (ranges[0] && documentRef.activeElement !== ranges[0]) {
            const output = ranges[0].parentElement?.querySelector('output');
            if (output) {
                output.textContent = `${timing.duration} ms`;
            }
        }
        if (ranges[1] && documentRef.activeElement !== ranges[1]) {
            const output = ranges[1].parentElement?.querySelector('output');
            if (output) {
                output.textContent = `±${timing.variation} ms`;
            }
        }
    }
};

const publishBoardCommand = (presence, payload) => {
    transport.publish('board:command', payload, {
        target: {
            source: presence.instanceId
        }
    });
};

const appendSynchronizeRowsControl = (boardPresence) => {
    const label = documentRef.createElement('label');
    label.className = 'lamp-control-check board-sync-rows';
    const input = documentRef.createElement('input');
    input.type = 'checkbox';
    input.checked = boardPresence.synchronizeRows !== false;
    label.append(
        input,
        documentRef.createTextNode(' Stejná strana ve všech řádcích')
    );
    input.addEventListener('change', () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        if (!presence) {
            return;
        }
        presence.synchronizeRows = input.checked;
        publishBoardCommand(presence, {
            action: 'set-synchronize-rows',
            synchronizeRows: input.checked
        });
    });
    boardSettingsBody.append(label);
};

const lampValue = (source, id, field, fallback) => {
    const value = source?.[id]?.[field];
    return value === undefined ? fallback : value;
};

const appendPlatformLighting = (boardPresence) => {
    const lamps = boardPresence.lamps || lighting.getLampSettings();
    const clock = boardPresence.clockLight || lighting.getClockSettings();
    const section = documentRef.createElement('fieldset');
    section.className = 'lamp-settings';
    const legendWrap = documentRef.createElement('div');
    const legend = documentRef.createElement('legend');
    legend.textContent = 'Osvětlení žárovek';
    legendWrap.append(legend);
    const controls = documentRef.createElement('div');
    controls.className = 'lamp-controls';

    const clockPanel = documentRef.createElement('fieldset');
    clockPanel.className = 'lamp-control clock-light-control';
    const clockLegendWrap = documentRef.createElement('div');
    const clockLegend = documentRef.createElement('legend');
    clockLegend.textContent = 'Osvětlení hodin';
    clockLegendWrap.append(clockLegend);
    const clockEnabledLabel = documentRef.createElement('label');
    clockEnabledLabel.className = 'lamp-control-check';
    const clockEnabled = documentRef.createElement('input');
    clockEnabled.type = 'checkbox';
    clockEnabled.dataset.clockField = 'enabled';
    clockEnabled.checked = clock.enabled !== false;
    clockEnabledLabel.append(clockEnabled, documentRef.createTextNode(' Svítí'));
    const clockIntensityLabel = documentRef.createElement('label');
    clockIntensityLabel.className = 'lamp-control-range';
    const clockHeader = documentRef.createElement('span');
    clockHeader.className = 'lamp-control-range-header';
    clockHeader.append(documentRef.createTextNode('Intenzita'));
    const clockOutput = documentRef.createElement('output');
    clockOutput.textContent = `${clock.intensity ?? NIGHT_CLOCK_DEFAULTS.intensity}%`;
    clockHeader.append(clockOutput);
    const clockIntensity = documentRef.createElement('input');
    clockIntensity.type = 'range';
    clockIntensity.min = '0';
    clockIntensity.max = '100';
    clockIntensity.step = '1';
    clockIntensity.dataset.clockField = 'intensity';
    clockIntensity.value = String(
        clock.intensity ?? NIGHT_CLOCK_DEFAULTS.intensity
    );
    clockIntensityLabel.append(clockHeader, clockIntensity);
    clockIntensity.addEventListener('input', () => {
        clockOutput.textContent = `${clockIntensity.value}%`;
    });
    const clockControls = documentRef.createElement('div');
    clockControls.className = 'clock-light-controls';
    clockControls.append(clockEnabledLabel, clockIntensityLabel);
    clockPanel.append(clockLegendWrap, clockControls);

    NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
        const panel = documentRef.createElement('fieldset');
        panel.className = 'lamp-control';
        panel.dataset.lampId = defaultSetting.id;
        const panelLegendWrap = documentRef.createElement('div');
        const panelLegend = documentRef.createElement('legend');
        panelLegend.textContent = defaultSetting.label;
        panelLegendWrap.append(panelLegend);
        const toggles = documentRef.createElement('div');
        toggles.className = 'lamp-control-toggles';
        const enabledLabel = documentRef.createElement('label');
        enabledLabel.className = 'lamp-control-check';
        const enabled = documentRef.createElement('input');
        enabled.type = 'checkbox';
        enabled.dataset.lampField = 'enabled';
        enabled.checked = lampValue(
            lamps,
            defaultSetting.id,
            'enabled',
            defaultSetting.enabled
        ) !== false;
        enabledLabel.append(enabled, documentRef.createTextNode(' Svítí'));
        const variationLabel = documentRef.createElement('label');
        variationLabel.className = 'lamp-control-check';
        const variation = documentRef.createElement('input');
        variation.type = 'checkbox';
        variation.dataset.lampField = 'variation';
        variation.checked = Boolean(lampValue(
            lamps,
            defaultSetting.id,
            'variation',
            defaultSetting.variation
        ));
        variationLabel.append(variation, documentRef.createTextNode(' S efektem'));
        toggles.append(enabledLabel, variationLabel);

        const intensityLabel = documentRef.createElement('label');
        intensityLabel.className = 'lamp-control-range';
        const intensityHeader = documentRef.createElement('span');
        intensityHeader.className = 'lamp-control-range-header';
        intensityHeader.append(documentRef.createTextNode('Intenzita'));
        const intensityOutput = documentRef.createElement('output');
        const intensityValue = lampValue(
            lamps,
            defaultSetting.id,
            'intensity',
            defaultSetting.intensity
        );
        intensityOutput.textContent = `${intensityValue}%`;
        intensityHeader.append(intensityOutput);
        const intensity = documentRef.createElement('input');
        intensity.type = 'range';
        intensity.min = '0';
        intensity.max = '100';
        intensity.step = '1';
        intensity.dataset.lampField = 'intensity';
        intensity.value = String(intensityValue);
        intensityLabel.append(intensityHeader, intensity);
        intensity.addEventListener('input', () => {
            intensityOutput.textContent = `${intensity.value}%`;
        });

        const speedLabel = documentRef.createElement('label');
        speedLabel.className = 'lamp-control-range';
        const speedHeader = documentRef.createElement('span');
        speedHeader.className = 'lamp-control-range-header';
        speedHeader.append(documentRef.createTextNode('Délka cyklu'));
        const speedOutput = documentRef.createElement('output');
        const speedValue = lampValue(
            lamps,
            defaultSetting.id,
            'speed',
            defaultSetting.speed
        );
        speedOutput.textContent = `${Number(speedValue).toFixed(1)} s`;
        speedHeader.append(speedOutput);
        const speed = documentRef.createElement('input');
        speed.type = 'range';
        speed.min = '1';
        speed.max = '120';
        speed.step = '0.5';
        speed.dataset.lampField = 'speed';
        speed.value = String(speedValue);
        speedLabel.append(speedHeader, speed);
        speed.addEventListener('input', () => {
            speedOutput.textContent = `${Number(speed.value).toFixed(1)} s`;
        });

        const fadeLabel = documentRef.createElement('label');
        fadeLabel.className = 'lamp-control-select';
        fadeLabel.append(documentRef.createTextNode('Efekt'));
        const fade = documentRef.createElement('select');
        fade.dataset.lampField = 'fade';
        NIGHT_FADE_MODES.forEach((mode) => {
            const option = documentRef.createElement('option');
            option.value = mode.value;
            option.textContent = mode.label;
            fade.append(option);
        });
        fade.value = String(lampValue(
            lamps,
            defaultSetting.id,
            'fade',
            defaultSetting.fade
        ));
        fadeLabel.append(fade);
        panel.append(
            panelLegendWrap,
            toggles,
            intensityLabel,
            speedLabel,
            fadeLabel
        );
        controls.append(panel);
    });

    const help = documentRef.createElement('p');
    help.className = 'lamp-settings-help';
    help.textContent = 'Checkbox „S efektem“ zapíná vybraný světelný efekt. '
        + 'Volba „Bez pohasínání“ udrží žárovku ve stálém svitu. Délka cyklu '
        + 'je skutečný čas celého efektu; vyšší hodnota znamená pomalejší změny.';
    const actions = documentRef.createElement('div');
    actions.className = 'lamp-settings-actions';
    const resetButton = documentRef.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Obnovit výchozí světla';
    actions.append(resetButton);
    section.append(legendWrap, controls, clockPanel, help, actions);
    boardSettingsBody.append(section);

    const publishLighting = () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        if (!presence) {
            return;
        }
        const nextLamps = {};
        controls.querySelectorAll('[data-lamp-id]').forEach((panel) => {
            nextLamps[panel.dataset.lampId] = {
                enabled: panel.querySelector('[data-lamp-field="enabled"]').checked,
                variation: panel.querySelector('[data-lamp-field="variation"]').checked,
                intensity: Number(
                    panel.querySelector('[data-lamp-field="intensity"]').value
                ),
                speed: Number(panel.querySelector('[data-lamp-field="speed"]').value),
                fade: panel.querySelector('[data-lamp-field="fade"]').value
            };
        });
        const nextClock = {
            enabled: clockEnabled.checked,
            intensity: Number(clockIntensity.value)
        };
        presence.lamps = nextLamps;
        presence.clockLight = nextClock;
        publishBoardCommand(presence, {
            action: 'set-lighting',
            lamps: nextLamps,
            clockLight: nextClock
        });
    };

    section.addEventListener('input', publishLighting);
    section.addEventListener('change', publishLighting);
    resetButton.addEventListener('click', () => {
        clockEnabled.checked = NIGHT_CLOCK_DEFAULTS.enabled;
        clockIntensity.value = String(NIGHT_CLOCK_DEFAULTS.intensity);
        clockOutput.textContent = `${NIGHT_CLOCK_DEFAULTS.intensity}%`;
        NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
            const panel = controls.querySelector(
                `[data-lamp-id="${defaultSetting.id}"]`
            );
            if (!panel) {
                return;
            }
            panel.querySelector('[data-lamp-field="enabled"]').checked =
                defaultSetting.enabled;
            panel.querySelector('[data-lamp-field="variation"]').checked =
                defaultSetting.variation;
            const intensity = panel.querySelector('[data-lamp-field="intensity"]');
            intensity.value = String(defaultSetting.intensity);
            intensity.parentElement.querySelector('output').textContent =
                `${defaultSetting.intensity}%`;
            const speed = panel.querySelector('[data-lamp-field="speed"]');
            speed.value = String(defaultSetting.speed);
            speed.parentElement.querySelector('output').textContent =
                `${Number(defaultSetting.speed).toFixed(1)} s`;
            panel.querySelector('[data-lamp-field="fade"]').value =
                defaultSetting.fade;
        });
        publishLighting();
    });
};

const appendFlapTimingControl = (boardPresence) => {
    const fallback = boardPresence.page === 'departureBoard'
        ? DEPARTURE_FLAP_TIMING_DEFAULTS
        : PLATFORM_FLAP_TIMING_DEFAULTS;
    const timing = boardPresence.flapTiming
        ? normalizeFlapTiming(boardPresence.flapTiming)
        : normalizeFlapTiming(fallback);
    const section = documentRef.createElement('fieldset');
    section.className = 'flap-timing-settings';
    const legendWrap = documentRef.createElement('div');
    const legend = documentRef.createElement('legend');
    legend.textContent = 'Rychlost split-flapů';
    legendWrap.append(legend);
    const controls = documentRef.createElement('div');
    controls.className = 'flap-timing-controls';

    const createRange = (labelText, min, max, step, value, format) => {
        const field = documentRef.createElement('label');
        field.className = 'lamp-control-range';
        const header = documentRef.createElement('span');
        header.className = 'lamp-control-range-header';
        header.append(documentRef.createTextNode(labelText));
        const output = documentRef.createElement('output');
        output.textContent = format(value);
        header.append(output);
        const input = documentRef.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        field.append(header, input);
        return { field, input, output };
    };

    const duration = createRange(
        'Délka jednoho flapu',
        FLAP_TIMING_DURATION_MIN,
        FLAP_TIMING_DURATION_MAX,
        10,
        timing.duration,
        (value) => `${value} ms`
    );
    const variation = createRange(
        'Náhodná variace',
        FLAP_TIMING_VARIATION_MIN,
        FLAP_TIMING_VARIATION_MAX,
        1,
        timing.variation,
        (value) => `±${value} ms`
    );
    controls.append(duration.field, variation.field);
    const help = documentRef.createElement('small');
    help.className = 'flap-timing-help';
    help.textContent = 'Nastavení se použije pro každý jednotlivý flap včetně '
        + 'času, typu vlaku, zpoždění a názvů stanic. Platí jen pro tuto tabuli.';
    section.append(legendWrap, controls, help);
    boardSettingsBody.append(section);

    const publishTiming = () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        if (!presence) {
            return;
        }
        const nextTiming = normalizeFlapTiming({
            duration: duration.input.value,
            variation: variation.input.value
        });
        duration.output.textContent = `${nextTiming.duration} ms`;
        variation.output.textContent = `±${nextTiming.variation} ms`;
        presence.flapTiming = nextTiming;
        publishBoardCommand(presence, {
            action: 'set-flap-timing',
            flapTiming: nextTiming
        });
    };
    duration.input.addEventListener('input', publishTiming);
    variation.input.addEventListener('input', publishTiming);
};

const openBoardSettings = (boardPresence) => {
    if (!boardSettingsDialog || !boardSettingsBody || !boardPresence) {
        return;
    }

    boardSettingsInstanceId = boardPresence.instanceId;
    boardSettingsDialog.classList.toggle(
        'is-platform-board',
        boardPresence.page !== 'departureBoard'
    );
    if (boardSettingsTitle) {
        boardSettingsTitle.textContent = boardSettingsTitleFor(boardPresence);
    }

    boardSettingsBody.replaceChildren();
    const colors = currentLensColors(boardPresence);
    const firstColor = createLensColorSelect('Barva 1. čočky');
    const secondColor = createLensColorSelect('Barva 2. čočky');
    firstColor.select.value = LENS_COLORS[colors[0]] ? colors[0] : 'green';
    secondColor.select.value = LENS_COLORS[colors[1]] ? colors[1] : firstColor.select.value;

    const publishLensColors = () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        if (!presence) {
            return;
        }
        const nextColors = [
            firstColor.select.value,
            secondColor.select.value
        ];
        presence.lensColors = nextColors;
        transport.publish('board:command', {
            action: 'set-lens-colors',
            colors: nextColors
        }, {
            target: {
                source: presence.instanceId
            }
        });
    };
    firstColor.select.addEventListener('change', publishLensColors);
    secondColor.select.addEventListener('change', publishLensColors);

    const colorStack = documentRef.createElement('div');
    colorStack.className = 'lens-control-stack';
    colorStack.append(firstColor.label, secondColor.label);
    boardSettingsBody.append(colorStack);

    if (boardPresence.page === 'departureBoard') {
        appendSynchronizeRowsControl(boardPresence);
        const rowLabel = documentRef.createElement('label');
        rowLabel.className = 'board-form-field';
        rowLabel.append(documentRef.createTextNode('Počet řádků'));
        const rowInput = documentRef.createElement('input');
        rowInput.type = 'number';
        rowInput.min = String(DEPARTURE_BOARD_ROW_COUNT_MIN);
        rowInput.max = String(DEPARTURE_BOARD_ROW_COUNT_MAX);
        rowInput.step = '1';
        rowInput.inputMode = 'numeric';
        rowInput.value = String(normalizeDepartureBoardRowCount(
            boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT
        ));
        const rowHelp = documentRef.createElement('small');
        rowHelp.textContent = 'Platí jen pro tuto odjezdovou tabuli. Rozsah je 1–24.';
        rowLabel.append(rowInput, rowHelp);
        rowInput.addEventListener('change', () => {
            const presence = findBoardPresence(boardSettingsInstanceId);
            if (!presence) {
                return;
            }
            const nextCount = normalizeDepartureBoardRowCount(rowInput.value);
            rowInput.value = String(nextCount);
            presence.rowCount = nextCount;
            transport.publish('board:command', {
                action: 'set-row-count',
                rowCount: nextCount
            }, {
                target: {
                    source: presence.instanceId
                }
            });
        });
        boardSettingsBody.append(rowLabel);
    }

    if (boardPresence.page !== 'departureBoard') {
        appendPlatformLighting(boardPresence);
    }

    appendFlapTimingControl(boardPresence);

    const audioRow = documentRef.createElement('div');
    audioRow.className = 'board-settings-audio';
    const volume = normalizeBoardVolume(boardPresence.audioState?.volume);
    const volumeLabel = documentRef.createElement('label');
    volumeLabel.className = 'board-volume';
    const volumeText = documentRef.createElement('span');
    volumeText.textContent = 'Hlasitost';
    const volumeRange = documentRef.createElement('input');
    volumeRange.type = 'range';
    volumeRange.className = 'board-volume-range board-settings-volume';
    volumeRange.min = '0';
    volumeRange.max = '100';
    volumeRange.step = '1';
    volumeRange.value = String(volume);
    const volumeOutput = documentRef.createElement('output');
    volumeOutput.className = 'board-settings-volume-output';
    volumeOutput.textContent = `${volume} %`;
    volumeRange.addEventListener('input', () => {
        volumeOutput.textContent = `${volumeRange.value} %`;
        const presence = findBoardPresence(boardSettingsInstanceId);
        setBoardVolume(presence, volumeRange.value);
    });
    volumeLabel.append(volumeText, volumeRange, volumeOutput);

    const muteButton = documentRef.createElement('button');
    muteButton.type = 'button';
    muteButton.className = 'board-settings-mute';
    const muted = boardPresence.audioState?.muted === true;
    muteButton.replaceChildren(createSpeakerIcon(muted));
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute(
        'aria-label',
        muted
            ? 'Zapnout zvuk flapů na této tabuli'
            : 'Ztlumit zvuk flapů na této tabuli'
    );
    muteButton.addEventListener('click', () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        toggleBoardMute(presence);
    });
    audioRow.append(volumeLabel, muteButton);
    boardSettingsBody.append(audioRow);

    if (!boardSettingsDialog.open) {
        boardSettingsDialog.showModal();
    }
};

activeBoardsList?.addEventListener('click', (event) => {
    const settingsButton = event.target.closest('.board-settings-button');
    if (settingsButton) {
        openBoardSettings(findBoardPresence(settingsButton.dataset.boardInstanceId));
        return;
    }

    const muteButton = event.target.closest('.mute-board-button');
    if (muteButton) {
        const boardPresence = [...activeBoards.values()].find(
            (presence) => presence.instanceId === muteButton.dataset.boardInstanceId
        );
        toggleBoardMute(boardPresence);
        return;
    }

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
    formDepartureId = departure.id;
    formDepartureLocked = true;
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

const fillCatalogSelects = () => {
    const profile = getActiveStationProfile();
    const refill = (select, values) => {
        if (!select) {
            return;
        }
        const current = select.value;
        const placeholder = select.options[0];
        select.replaceChildren();
        if (placeholder) {
            select.appendChild(placeholder);
        }
        values.forEach((value) => {
            const option = documentRef.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        if ([...select.options].some((option) => option.value === current)) {
            select.value = current;
        }
    };

    if (trainTypeInput) {
        const current = trainTypeInput.value;
        trainTypeInput.replaceChildren();
        profile.trainTypes.forEach((type) => {
            const option = documentRef.createElement('option');
            option.value = type.name;
            option.textContent = type.label || type.name || 'Bez typu vlaku';
            trainTypeInput.appendChild(option);
        });
        if ([...trainTypeInput.options].some((option) => option.value === current)) {
            trainTypeInput.value = current;
        }
    }
    refill(platformInput, profile.platforms);
    refill(trackInput, profile.tracks);
    refill(sectorInput, profileSectorValues(profile));
};

fillCatalogSelects();

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
        blinkDelay: index * LENS_DEFAULTS.blinkInterval
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
        preDepartureEnabledLabel
    );

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

    const timingControls = documentRef.createElement('div');
    timingControls.className = 'lens-control-stack';
    timingControls.append(blinkIntervalLabel, preDepartureSecondsLabel);

    panel.append(toggles, timingControls);
    lensControls.replaceChildren(panel);

    lensControlElements.set('component', {
        enabled,
        blinking,
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
        preDepartureSeconds
    ]
        .forEach((input) => {
            input.addEventListener('input', updateLensFromControls);
            input.addEventListener('change', updateLensFromControls);
        });
    syncLensControls();
}

delayOffsetEnabledInput?.addEventListener('change', updateDelayOffsetFromControls);
syncDelayOffsetControls();
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

const boardActionButtons = [
    submitButton,
    startButton,
    resetAllSettingsButton,
    clearAllDeparturesButton
];

const setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.remove('is-updating');
    boardForm.setAttribute('aria-busy', 'false');
    boardActionButtons.forEach((button) => {
        if (!button) {
            return;
        }
        const disabled = button === clearAllDeparturesButton
            && departures.length === 0;
        button.disabled = disabled;
        button.setAttribute('aria-disabled', String(disabled));
    });
    documentRef.querySelectorAll('[data-departure-action]').forEach((button) => {
        button.disabled = false;
        button.setAttribute('aria-disabled', 'false');
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

    const applies = matching.filter((desired) =>
        desired.action === 'apply-board' && desired.state?.departureTime
    );
    if (applies.length > 0) {
        const now = new Date();
        applies.sort((first, second) => compareDeparturesByTime(
            {
                ...first.state,
                id: getBoardIdentityKey(first.target)
            },
            {
                ...second.state,
                id: getBoardIdentityKey(second.target)
            },
            now,
            delayOffset
        ));
        const nearest = applies[0];
        const newerReset = matching
            .filter((desired) => desired.action !== 'apply-board')
            .sort((first, second) =>
                Number(second.revision) - Number(first.revision)
            )[0];
        if (!newerReset
            || Number(newerReset.revision) <= Number(nearest.revision)) {
            return nearest;
        }
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

const boardListView = (presence) => JSON.stringify({
    page: presence.page,
    boardId: presence.boardId,
    instanceId: presence.instanceId,
    identity: presence.identity,
    configured: presence.configured,
    rowCount: presence.rowCount,
    connection: presence.connection,
    userAgent: presence.userAgent,
    audioMuted: presence.audioState?.muted === true,
    audioUnlocked: presence.audioState?.unlocked === true,
    audioVolume: presence.audioState?.volume ?? null,
    identificationActive: presence.identificationActive === true,
    identificationPending: presence.identificationPending === true
});

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
        lensColors: Array.isArray(payload.lensColors) && payload.lensColors.length
            ? payload.lensColors.slice(0, 2)
            : previous?.lensColors || null,
        synchronizeRows: typeof payload.synchronizeRows === 'boolean'
            ? payload.synchronizeRows
            : previous?.synchronizeRows !== false,
        lamps: payload.lamps && typeof payload.lamps === 'object'
            ? payload.lamps
            : previous?.lamps || null,
        clockLight: payload.clockLight && typeof payload.clockLight === 'object'
            ? payload.clockLight
            : previous?.clockLight || null,
        flapTiming: payload.flapTiming && typeof payload.flapTiming === 'object'
            ? normalizeFlapTiming(payload.flapTiming)
            : previous?.flapTiming || null,
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
        syncPendingAt: sameBoardIdentity ? previous?.syncPendingAt || 0 : 0,
        connection: message.delivery
            || previous?.connection
            || { channel: 'local' },
        userAgent: typeof payload.userAgent === 'string'
            && payload.userAgent.trim()
            ? payload.userAgent.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 400)
            : previous?.userAgent || ''
    };
    const nextListView = boardListView(boardPresence);
    const listChanged = nextListView !== previous?.listView;
    boardPresence.listView = nextListView;
    activeBoards.set(key, boardPresence);
    if (listChanged) {
        renderActiveBoards();
    }
    syncOpenBoardSettings(boardPresence);
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
            settingsSentToInstances.delete(boardPresence.instanceId);
            removed = true;
        }
    });
    if (removed) {
        renderActiveBoards();
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

transport.subscribeDelivery((source, delivery) => {
    let changed = false;
    activeBoards.forEach((boardPresence) => {
        if (boardPresence.instanceId !== source) {
            return;
        }
        boardPresence.connection = delivery;
        changed = true;
    });
    if (changed) {
        renderActiveBoards();
    }
});

transport.subscribe((message) => {
    if (message.type === 'departure-board:hello') {
        publishDepartureSnapshot();
        return;
    }

    if (message.type === 'board:ready'
        || message.type === 'board:heartbeat') {
        const instanceId = message.payload?.instanceId || message.source;
        const sendSettings = Boolean(instanceId)
            && !settingsSentToInstances.has(instanceId);
        if (sendSettings) {
            const newerLogo = useNewerStoredLogo();
            if (newerLogo) {
                departureBoardLogo = newerLogo.departureBoardLogo;
                departureBoardLogoSvg = newerLogo.departureBoardLogoSvg;
                settingsUpdatedAt = newerLogo.settingsUpdatedAt;
                syncDepartureBoardLogoControls();
            }
            settingsSentToInstances.add(instanceId);
            transport.publish('board:settings', {
                ...getLightingSettingsState(),
                stationProfile: getActiveStationProfile()
            }, {
                target: {
                    source: instanceId
                }
            });
        }
        updateBoardPresence(message);
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
            if (message.payload?.audio) {
                boardPresence.audioState = message.payload.audio;
            }
            if (Array.isArray(message.payload?.lensColors)
                && message.payload.lensColors.length) {
                boardPresence.lensColors = message.payload.lensColors.slice(0, 2);
            }
            if (Number.isInteger(Number(message.payload?.rowCount))
                && Number(message.payload.rowCount) > 0) {
                boardPresence.rowCount = Number(message.payload.rowCount);
            }
            if (typeof message.payload?.synchronizeRows === 'boolean') {
                boardPresence.synchronizeRows = message.payload.synchronizeRows;
            }
            if (message.payload?.lamps && typeof message.payload.lamps === 'object') {
                boardPresence.lamps = message.payload.lamps;
            }
            if (message.payload?.clockLight
                && typeof message.payload.clockLight === 'object') {
                boardPresence.clockLight = message.payload.clockLight;
            }
            if (message.payload?.flapTiming
                && typeof message.payload.flapTiming === 'object') {
                boardPresence.flapTiming = normalizeFlapTiming(
                    message.payload.flapTiming
                );
            }
            boardPresence.lastSeen = Date.now();
            boardPresence.listView = boardListView(boardPresence);
            syncOpenBoardSettings(boardPresence);
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
    if (persist) {
        persistState();
    }
    if (completedMessage) {
        setBoardFormStatus(completedMessage);
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
    const operator = normalizeOperator(operatorInput.value);
    return {
        stations: stationInputs.map((input) => input.value),
        train: resolveTrainTypeValue(trainTypeInput.value, operator),
        trainNumber: trainNumberInput.value.trim(),
        operator,
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
    operator: departure.operator || '',
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

const nearestDepartureForTarget = (target) => {
    if (!isConfiguredTarget(target)) {
        return null;
    }

    const now = new Date();
    return departures
        .filter((departure) =>
            isConfiguredTarget(departure.target)
            && sameTarget(departure.target, target)
        )
        .sort((first, second) =>
            compareDeparturesByTime(first, second, now, delayOffset)
        )[0] || null;
};

const collectBoardTargets = (...groups) => {
    const targets = new Map();
    groups.flat().forEach((departure) => {
        if (!isConfiguredTarget(departure?.target)) {
            return;
        }
        targets.set(
            getBoardIdentityKey(departure.target),
            departure.target
        );
    });
    Object.values(desiredStates).forEach((desired) => {
        if (!isConfiguredTarget(desired?.target)) {
            return;
        }
        const key = getBoardIdentityKey(desired.target);
        if (!targets.has(key)) {
            targets.set(key, desired.target);
        }
    });
    return [...targets.values()];
};

const syncTargetBoard = (target) => {
    if (!isConfiguredTarget(target)) {
        return null;
    }

    const nearest = nearestDepartureForTarget(target);
    const current = desiredStates[getBoardIdentityKey(target)];
    if (!nearest) {
        if (!current || current.action === 'reset-board') {
            return null;
        }
        const revision = nextStateRevision();
        setDesiredState(target, 'reset-board', getEmptyState(), revision);
        return {
            action: 'reset-board',
            state: getEmptyState(),
            target,
            revision
        };
    }

    const nextState = getBoardStateFromDeparture(nearest);
    if (current?.action === 'apply-board' && sameDepartureContent(
        { ...current.state, target: current.target },
        { ...nextState, target: nearest.target }
    )) {
        return null;
    }

    const revision = nextStateRevision();
    nearest.revision = revision;
    setDesiredState(
        nearest.target,
        'apply-board',
        nextState,
        revision
    );
    return {
        action: 'apply-board',
        state: nextState,
        target: nearest.target,
        revision
    };
};

const syncAllTargetBoards = () => collectBoardTargets(departures)
    .map((target) => syncTargetBoard(target))
    .filter(Boolean);

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

    if (changed) {
        departures = [...manualDepartures, ...nextLive];
    }
    const commands = collectBoardTargets(previousDepartures, departures)
        .map((target) => syncTargetBoard(target))
        .filter(Boolean)
        .map((command) => sendBackgroundBoardAction(
            command.action,
            command.state,
            command.target,
            command.revision
        ));

    if (!changed && commands.length === 0) {
        return {
            changed: false,
            applied: 0
        };
    }

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
    documentRef.title = visible
        ? `${name} – ${MANAGE_DOCUMENT_TITLE}`
        : MANAGE_DOCUMENT_TITLE;
};

const renderLiveSourceStation = () => {
    const name = String(liveStationName || '').trim();
    renderManageHeaderStation();
    documentRef.querySelectorAll('[data-parameter-station]').forEach((station) => {
        const link = station.querySelector('a');
        const href = String(
            liveParameterValues[station.dataset.parameterStation] || ''
        ).trim();
        if (!name || !href || !link) {
            station.hidden = true;
            link?.removeAttribute('href');
            if (link) {
                link.textContent = '';
            }
            return;
        }

        station.hidden = false;
        link.textContent = name;
        link.href = href;
    });
};

const formatLivePollInterval = (intervalMs) => (
    `${Math.round(normalizeLivePollIntervalMs(intervalMs) / 1000)} s`
);

const renderLivePollInterval = () => {
    const seconds = Math.round(livePollIntervalMs / 1000);
    if (livePollIntervalInput
        && documentRef.activeElement !== livePollIntervalInput) {
        livePollIntervalInput.value = String(seconds);
    }
    if (livePollIntervalValue) {
        livePollIntervalValue.textContent = formatLivePollInterval(
            livePollIntervalMs
        );
    }
    if (liveDeparturesDescription) {
        if (liveSchemaLoading && !liveScraperSchema) {
            liveDeparturesDescription.textContent = 'Načítám parametry scraperu…';
        } else if (liveScraperSchema?.description) {
            liveDeparturesDescription.textContent =
                `${liveScraperSchema.description} Aktualizace každých ${seconds} sekund.`;
        } else {
            liveDeparturesDescription.textContent =
                `Živé odjezdy · aktualizace každých ${seconds} sekund.`;
        }
    }
};

const scraperQueryParameters = () => {
    const query = {};
    (liveScraperSchema?.parameters || []).forEach((parameter) => {
        const normalized = normalizeScraperParameterValue(
            parameter,
            liveParameterValues[parameter.id]
        );
        if (!normalized.ok || normalized.value === '') {
            return;
        }
        query[parameter.id] = normalized.value;
    });
    return query;
};

const syncLiveSourceFromParameters = () => {
    const parameter = liveScraperSchema?.parameters?.find(
        (item) => item.format === 'sz-station-url'
    );
    if (!parameter) {
        return;
    }

    const normalized = normalizeScraperParameterValue(
        parameter,
        liveParameterValues[parameter.id]
    );
    if (!normalized.ok) {
        return;
    }

    if (normalized.key !== parseLiveSourceUrl(liveSourceUrl).key) {
        liveStationName = normalized.key === LIVE_STATION_DEFAULTS.key
            ? LIVE_STATION_DEFAULTS.name
            : '';
    }
    liveSourceUrl = normalized.value;
    liveParameterValues[parameter.id] = normalized.value;
};

const applyParameterInput = (parameter, control) => {
    const normalized = normalizeScraperParameterValue(parameter, control.value);
    if (!normalized.ok) {
        setLiveStatus(normalized.message, true);
        control.value = liveParameterValues[parameter.id] ?? '';
        return;
    }

    const previousKey = parameter.format === 'sz-station-url'
        ? parseLiveSourceUrl(liveSourceUrl).key
        : '';
    liveParameterValues[parameter.id] = normalized.value;
    control.value = normalized.value;
    if (parameter.format === 'sz-station-url') {
        if (normalized.key !== previousKey) {
            liveStationName = normalized.key === LIVE_STATION_DEFAULTS.key
                ? LIVE_STATION_DEFAULTS.name
                : '';
        }
        liveSourceUrl = normalized.value;
    }
    renderLiveSourceStation();
    persistState();
    setLiveStatus('');
};

const renderScraperParameters = () => {
    if (!liveScraperParametersRoot) {
        return;
    }

    const activeId = documentRef.activeElement?.dataset?.parameter || '';
    liveScraperParametersRoot.replaceChildren();
    (liveScraperSchema?.parameters || []).forEach((parameter) => {
        const field = documentRef.createElement('label');
        field.className = 'board-form-field';
        field.htmlFor = `liveParameter-${parameter.id}`;
        const heading = documentRef.createElement('span');
        heading.className = 'live-source-heading';
        const label = documentRef.createElement('span');
        label.textContent = parameter.label;
        heading.append(label);
        if (parameter.showStation) {
            const station = documentRef.createElement('span');
            station.className = 'live-source-station';
            station.hidden = true;
            station.dataset.parameterStation = parameter.id;
            const link = documentRef.createElement('a');
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            station.append('(', link, ')');
            heading.append(station);
        }
        field.append(heading);

        const control = parameter.type === 'select'
            ? documentRef.createElement('select')
            : documentRef.createElement('input');
        control.id = `liveParameter-${parameter.id}`;
        control.dataset.parameter = parameter.id;
        control.disabled = liveDeparturesEnabled;
        if (parameter.type === 'select') {
            parameter.options.forEach((option) => {
                const item = documentRef.createElement('option');
                item.value = option.value;
                item.textContent = option.label;
                control.append(item);
            });
        } else {
            control.type = parameter.type === 'number' ? 'number' : parameter.type;
            control.autocomplete = 'off';
            control.spellcheck = false;
            if (parameter.placeholder) {
                control.placeholder = parameter.placeholder;
            }
            if (parameter.type === 'number') {
                if (parameter.min != null) {
                    control.min = String(parameter.min);
                }
                if (parameter.max != null) {
                    control.max = String(parameter.max);
                }
                if (parameter.step != null) {
                    control.step = String(parameter.step);
                }
            }
        }
        control.value = liveParameterValues[parameter.id] ?? parameter.default ?? '';
        field.append(control);
        if (parameter.help) {
            const help = documentRef.createElement('small');
            help.id = `liveParameterHelp-${parameter.id}`;
            help.textContent = parameter.help;
            control.setAttribute('aria-describedby', help.id);
            field.append(help);
        }
        liveScraperParametersRoot.append(field);
        control.addEventListener('change', () => {
            applyParameterInput(parameter, control);
        });
    });
    renderLiveSourceStation();
    if (activeId) {
        liveScraperParametersRoot
            .querySelector(`[data-parameter="${CSS.escape(activeId)}"]`)
            ?.focus();
    }
};

const adoptScraperSchema = (schema) => {
    liveScraperSchema = schema;
    schema.parameters.forEach((parameter) => {
        const raw = Object.prototype.hasOwnProperty.call(
            liveParameterValues,
            parameter.id
        )
            ? liveParameterValues[parameter.id]
            : parameter.default;
        const normalized = normalizeScraperParameterValue(parameter, raw);
        liveParameterValues[parameter.id] = normalized.ok
            ? normalized.value
            : String(raw ?? '');
    });
    syncLiveSourceFromParameters();
    renderScraperParameters();
    renderLivePollInterval();
    persistState();
};

const loadScraperSchema = async () => {
    const token = liveSchemaToken + 1;
    liveSchemaToken = token;
    liveSchemaLoading = true;
    renderLivePollInterval();
    try {
        const schema = await fetchScraperSchema({ apiUrl: liveApiUrl });
        if (token !== liveSchemaToken) {
            return false;
        }
        liveSchemaLoading = false;
        adoptScraperSchema(schema);
        return true;
    } catch (error) {
        if (token !== liveSchemaToken) {
            return false;
        }
        liveSchemaLoading = false;
        liveScraperSchema = null;
        liveScraperParametersRoot?.replaceChildren();
        renderLivePollInterval();
        setLiveStatus(
            error instanceof Error
                ? error.message
                : 'Scraper neposkytl definici parametrů.',
            true
        );
        return false;
    }
};

const renderLiveControls = () => {
    liveScraperParametersRoot?.querySelectorAll('[data-parameter]').forEach((control) => {
        const id = control.dataset.parameter;
        if (documentRef.activeElement !== control) {
            control.value = liveParameterValues[id] ?? '';
        }
        control.disabled = liveDeparturesEnabled;
    });
    renderLiveSourceStation();
    renderLivePollInterval();
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

const scraperWatchesItself = () => liveScraperSchema?.controls?.watch === true;

const releaseScraperWatch = () => {
    const apiUrl = liveWatchApiUrl;
    if (!apiUrl) {
        return;
    }
    liveWatchApiUrl = '';
    const url = scraperControlUrl(apiUrl, 'stop');
    void fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client: transport.id })
    }).catch(() => {
        // The server stops on its own when the lease expires.
    });
};

const engageScraperWatch = async () => {
    if (!scraperWatchesItself()) {
        releaseScraperWatch();
        return;
    }
    if (liveWatchApiUrl && liveWatchApiUrl !== liveApiUrl) {
        releaseScraperWatch();
    }
    await postScraperControl({
        apiUrl: liveApiUrl,
        action: 'watch',
        parameters: scraperQueryParameters(),
        pollIntervalMs: livePollIntervalMs,
        clientId: transport.id
    });
    liveWatchApiUrl = liveApiUrl;
};

const stopLivePolling = () => {
    liveRunToken += 1;
    if (livePollTimer !== null) {
        window.clearInterval(livePollTimer);
        livePollTimer = null;
    }
};

const restartLiveTimer = () => {
    if (livePollTimer !== null) {
        window.clearInterval(livePollTimer);
        livePollTimer = null;
    }
    if (!liveDeparturesEnabled) {
        return;
    }

    livePollTimer = window.setInterval(
        pollLiveDepartures,
        livePollIntervalMs
    );
};

const pollLiveDepartures = async () => {
    if (!liveDeparturesEnabled || livePollInProgress) {
        return;
    }

    livePollInProgress = true;
    renderLiveControls();
    const runToken = liveRunToken;
    try {
        if (!liveScraperSchema) {
            const ready = await loadScraperSchema();
            if (!ready || !liveDeparturesEnabled || runToken !== liveRunToken) {
                return;
            }
        }
        let payload;
        try {
            payload = await fetchLiveDepartures({
                apiUrl: liveApiUrl,
                parameters: scraperQueryParameters(),
                pollIntervalMs: livePollIntervalMs
            });
        } catch (error) {
            const idle = error instanceof Error
                && error.message === SCRAPER_IDLE_ERROR;
            if (!idle || !scraperWatchesItself()) {
                throw error;
            }
            await engageScraperWatch();
            if (!liveDeparturesEnabled || runToken !== liveRunToken) {
                return;
            }
            payload = await fetchLiveDepartures({
                apiUrl: liveApiUrl,
                parameters: scraperQueryParameters(),
                pollIntervalMs: livePollIntervalMs
            });
        }
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
        const stationName = liveStationName
            || liveScraperSchema?.name
            || 'scraper';
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
    void (async () => {
        try {
            await engageScraperWatch();
        } catch (error) {
            if (!liveDeparturesEnabled) {
                return;
            }
            setLiveStatus(
                error instanceof Error
                    ? error.message
                    : 'Sledování scraperu se nepodařilo spustit.',
                true
            );
        }
        if (!liveDeparturesEnabled) {
            return;
        }
        void pollLiveDepartures();
        restartLiveTimer();
    })();
};

const stopLiveDepartures = () => {
    stopLivePolling();
    liveDeparturesEnabled = false;
    releaseScraperWatch();
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

const startupBoardCommands = syncAllTargetBoards();
if (startupBoardCommands.length > 0) {
    desiredStatesRepaired = true;
}

const isSameManualTrain = (departure, state) => {
    const leftNumber = normalizeTrainNumber(departure?.trainNumber);
    const rightNumber = normalizeTrainNumber(state?.trainNumber);
    if (leftNumber || rightNumber) {
        return leftNumber === rightNumber;
    }

    return formatDepartureTime(departure?.departureTime)
        === formatDepartureTime(state?.departureTime)
        && (departure?.stations?.[0] || '') === (state?.stations?.[0] || '');
};

const resolveFormDeparture = (state, target) => {
    const bound = formDepartureId ? getDepartureById(formDepartureId) : null;
    if (bound && (formDepartureLocked || isSameManualTrain(bound, state))) {
        return bound;
    }
    if (bound) {
        return null;
    }
    if (!isConfiguredTarget(target)) {
        return null;
    }

    return departures.find((item) =>
        item.source !== 'live'
        && isConfiguredTarget(item.target)
        && sameTarget(item.target, target)
    ) || null;
};

const upsertDeparture = (state, target, existing = null) => {
    const previous = existing?.id ? getDepartureById(existing.id) : null;
    const previousTarget = previous?.target;
    const revision = nextStateRevision();
    const departure = normalizeDeparture({
        ...(previous || {}),
        ...state,
        id: previous?.id,
        source: previous?.source === 'live' ? 'live' : 'manual',
        liveKey: previous?.liveKey || '',
        liveStationKey: previous?.liveStationKey || '',
        dateKey: previous?.dateKey || '',
        sourceTrainNumber: previous?.sourceTrainNumber || '',
        target,
        revision,
        updatedAt: Date.now()
    });
    departures = [
        ...departures.filter((item) => item.id !== departure.id),
        departure
    ];
    const commands = [];
    if (
        previousTarget
        && isConfiguredTarget(previousTarget)
        && !sameTarget(previousTarget, target)
    ) {
        const previousCommand = syncTargetBoard(previousTarget);
        if (previousCommand) {
            commands.push(previousCommand);
        }
    }
    if (isConfiguredTarget(target)) {
        const nextCommand = syncTargetBoard(target);
        if (nextCommand) {
            commands.push(nextCommand);
        }
    }
    commands.forEach((command) => {
        void sendBackgroundBoardAction(
            command.action,
            command.state,
            command.target,
            command.revision
        );
    });
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    return departure;
};

const resetDeparture = (departure) => {
    if (!departure) {
        return;
    }

    departures = departures.filter((item) => item.id !== departure.id);
    const command = syncTargetBoard(departure.target);
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    if (command) {
        void sendBackgroundBoardAction(
            command.action,
            command.state,
            command.target,
            command.revision
        );
    }
    setBoardFormStatus(
        `Odjezd pro ${formatBoardIdentity(departure.target)} byl smazán.`
    );
};

const clearAllDepartures = () => {
    if (departures.length === 0) {
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
startupBoardCommands.forEach((command) => {
    void sendBackgroundBoardAction(
        command.action,
        command.state,
        command.target,
        command.revision
    );
});
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
let syncedNearestMinute = new Date().getHours() * 60 + new Date().getMinutes();
const syncNearestBoardsForClock = () => {
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    if (minute === syncedNearestMinute) {
        return;
    }
    syncedNearestMinute = minute;
    const commands = syncAllTargetBoards();
    if (commands.length === 0) {
        return;
    }
    persistState();
    publishDepartureSnapshot();
    commands.forEach((command) => {
        void sendBackgroundBoardAction(
            command.action,
            command.state,
            command.target,
            command.revision
        );
    });
};
const scheduleManageClock = () => {
    const now = new Date();
    renderManageClock(now);
    syncNearestBoardsForClock();
    manageClockTimer = window.setTimeout(
        scheduleManageClock,
        1000 - now.getMilliseconds()
    );
};

scheduleManageClock();

renderActiveBoards();
renderDeparturesTable();
syncDelayOffsetControls();
syncDepartureBoardLogoControls();
renderNightMode();
syncAutomaticNightMode();

startButton.textContent = 'Načíst příklad';
startButton.setAttribute('aria-pressed', 'false');
startButton.addEventListener('click', () => {
    const showExample = !exampleActive;

    exampleActive = showExample;
    formDepartureId = '';
    formDepartureLocked = false;
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
        const desired = desiredStates[getBoardIdentityKey(target)];
        sendBoardAction(
            desired?.action || 'apply-board',
            desired?.state || getBoardStateFromDeparture(departure),
            'Příklad načten.',
            {
                target: desired?.target || target,
                revision: desired?.revision || departure.revision
            }
        );
        return;
    }

    const target = getFormTarget();
    departures = departures.filter(
        (departure) => departure.id !== getBoardIdentityKey(target)
    );
    const command = syncTargetBoard(target);
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    startButton.textContent = 'Načíst příklad';
    startButton.setAttribute('aria-pressed', 'false');
    if (!command) {
        setBoardFormStatus('Tabule resetována.');
        return;
    }
    sendBoardAction(
        command.action,
        command.state,
        command.action === 'apply-board'
            ? 'Příklad byl odebrán. Tabule ukazuje další odjezd.'
            : 'Tabule resetována.',
        {
            target: command.target,
            revision: command.revision
        }
    );
});

resetAllSettingsButton.addEventListener('click', () => {
    storage.clear();
    legacyStorage.clear();
    stopLivePolling();
    releaseScraperWatch();
    liveDeparturesEnabled = false;
    liveApiUrl = getDefaultLiveApiUrl();
    liveSourceUrl = LIVE_STATION_DEFAULTS.sourceUrl;
    liveParameterValues = { source: liveSourceUrl };
    liveScraperSchema = null;
    liveStationName = LIVE_STATION_DEFAULTS.name;
    livePollIntervalMs = LIVE_POLL_INTERVAL_MS;
    departures = [];
    desiredStates = {};
    formDepartureId = '';
    formDepartureLocked = false;
    lighting.reset();
    lensDisplay.setImmediate(createDefaultLensState());
    nightMode = false;
    autoNightMode = false;
    sunSchedule.stop();
    flapTiming = normalizeFlapTiming(FLAP_TIMING_DEFAULTS);
    delayOffset = DELAY_OFFSET_DEFAULT;
    departureBoardLogo = DEPARTURE_BOARD_LOGO_DEFAULT;
    departureBoardLogoSvg = '';
    renderNightMode();
    renderLiveControls();
    void loadScraperSchema();
    setLiveStatus('Live odjezdy byly vypnuté obnovením nastavení.');
    syncLensControls();
    syncDelayOffsetControls();
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

    const state = getFormState();
    if (state.train) {
        trainTypeInput.value = state.train;
    }
    operatorInput.value = state.operator;
    const target = getFormTarget();
    const departure = upsertDeparture(
        state,
        target,
        resolveFormDeparture(state, target)
    );
    formDepartureId = departure.id;
    formDepartureLocked = false;
    exampleActive = true;
    startButton.textContent = 'Resetovat tabuli';
    startButton.setAttribute('aria-pressed', 'true');
    if (!isConfiguredTarget(target)) {
        setBoardFormStatus(
            'Odjezd byl uložen. Nástupiště a kolej lze doplnit později.'
        );
        return;
    }

    const desired = desiredStates[getBoardIdentityKey(target)];
    const nearest = nearestDepartureForTarget(target);
    sendBoardAction(
        'apply-board',
        desired?.state || getBoardStateFromDeparture(nearest || departure),
        nearest && nearest.id !== departure.id
            ? 'Odjezd byl uložen. Nástupištní tabule ukazuje bližší odjezd.'
            : 'Údaje byly odeslány na tabuli.',
        {
            target: desired?.target || target,
            revision: desired?.revision || departure.revision
        }
    );
});

[...stationInputs, platformInput, trackInput, sectorInput,
    trainTypeInput, trainNumberInput, operatorInput, departureTimeInput,
    delayValueInput]
    .forEach((input) => {
        input.addEventListener('input', persistState);
        input.addEventListener('change', persistState);
    });

liveApiUrlInput?.addEventListener('change', () => {
    liveApiUrl = normalizeLiveApiUrl(
        liveApiUrlInput.value.trim() || getDefaultLiveApiUrl()
    );
    renderLiveControls();
    persistState();
    void loadScraperSchema();
});

const applyLivePollInterval = (seconds) => {
    livePollIntervalMs = normalizeLivePollIntervalMs(Number(seconds) * 1000);
    renderLivePollInterval();
};

livePollIntervalInput?.addEventListener('input', () => {
    applyLivePollInterval(livePollIntervalInput.value);
});

livePollIntervalInput?.addEventListener('change', () => {
    applyLivePollInterval(livePollIntervalInput.value);
    persistState();
    restartLiveTimer();
    if (liveDeparturesEnabled && scraperWatchesItself()) {
        void engageScraperWatch();
    }
});

liveToggleButton?.addEventListener('click', () => {
    if (liveDeparturesEnabled) {
        stopLiveDepartures();
    } else {
        startLivePolling();
    }
});

const MANAGE_BLOCK_STATE_KEY = 'pragotron.manage.blockState.v1';

const readManageBlockState = () => {
    try {
        const parsed = JSON.parse(
            window.localStorage.getItem(MANAGE_BLOCK_STATE_KEY) || '{}'
        );
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    } catch {
        return {};
    }
};

const rememberManageBlock = (element, collapsed) => {
    const key = element?.id;
    if (!key) {
        return;
    }

    const state = readManageBlockState();
    if (collapsed) {
        state[key] = true;
    } else {
        delete state[key];
    }

    try {
        window.localStorage.setItem(
            MANAGE_BLOCK_STATE_KEY,
            JSON.stringify(state)
        );
    } catch {
        // The block still keeps the choice for this page view.
    }
};

const applyStoredBlockState = (element, button, collapsedBlocks) => {
    const collapsed = Boolean(element?.id && collapsedBlocks[element.id]);
    element.classList.toggle('is-collapsed', collapsed);
    button?.setAttribute('aria-expanded', String(!collapsed));
};

const setupManageBlockToggles = () => {
    const collapsedBlocks = readManageBlockState();
    documentRef.querySelectorAll('#manage fieldset').forEach((fieldset) => {
        const legend = fieldset.querySelector(':scope > div > legend');
        if (!legend || legend.querySelector('.manage-block-toggle')) {
            return;
        }

        const heading = legend.parentElement;
        if (!heading) {
            return;
        }

        heading.classList.add('manage-block-heading');
        const button = documentRef.createElement('button');
        button.type = 'button';
        button.className = 'manage-block-toggle';
        button.setAttribute('aria-expanded', 'true');
        const mark = documentRef.createElement('span');
        mark.className = 'manage-block-mark';
        mark.setAttribute('aria-hidden', 'true');
        const label = documentRef.createElement('span');
        label.className = 'manage-block-label';
        label.textContent = legend.textContent.trim();
        button.append(mark, label);
        legend.replaceChildren(button);
        applyStoredBlockState(fieldset, button, collapsedBlocks);
        button.addEventListener('click', () => {
            const collapsed = fieldset.classList.toggle('is-collapsed');
            button.setAttribute('aria-expanded', String(!collapsed));
            rememberManageBlock(fieldset, collapsed);
        });
    });

    documentRef.querySelectorAll('.station-profile-section').forEach((section) => {
        const button = section.querySelector(
            ':scope > .station-profile-section-heading .manage-block-toggle'
        );
        if (!button) {
            return;
        }
        applyStoredBlockState(section, button, collapsedBlocks);
        button.addEventListener('click', () => {
            const collapsed = section.classList.toggle('is-collapsed');
            button.setAttribute('aria-expanded', String(!collapsed));
            rememberManageBlock(section, collapsed);
        });
    });
};

mountStationProfileEditor({
    documentRef,
    onSectionExpanded: (section) => rememberManageBlock(section, false),
    onApply: (profile) => {
        if (!profile) {
            setBoardFormStatus(
                'Profil stanice nejde použít. Doplňte nástupiště, koleje a aspoň jeden typ vlaku.',
                true
            );
            return;
        }
        departures = departures
            .map(normalizeDeparture)
            .filter((departure) => departure.departureTime);
        fillCatalogSelects();
        persistState();
        publishStationProfile();
        syncAllTargetBoards().forEach((command) => {
            transport.publish('board:command', command);
        });
        publishDepartureSnapshot();
        renderDeparturesTable();
        setBoardFormStatus(
            `Profil stanice „${profile.name}“ je uložený a odeslaný tabulím.`
        );
    }
});
setupManageBlockToggles();
mountManageLayout(documentRef);
window.addEventListener('pagehide', () => {
    releaseScraperWatch();
});
window.addEventListener('beforeunload', (event) => {
    event.preventDefault();
    event.returnValue = 'Manage stránka musí zůstat otevřená. Obnovení nebo zavření přeskočí animaci odjezdové tabule a tabule přestanou dostávat data.';
});
if (!settingsUpdatedAt) {
    settingsUpdatedAt = Date.now();
    persistState();
}
publishStationProfile();
renderLiveControls();
publishDiscovery();
publishDepartureSnapshot();
heartbeatTimer = window.setInterval(publishDiscovery, 30000);
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
            sourceUrl: liveSourceUrl,
            parameters: { ...liveParameterValues },
            pollIntervalMs: livePollIntervalMs
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

void loadScraperSchema().then(() => {
    if (liveDeparturesEnabled) {
        startLivePolling();
    }
});
