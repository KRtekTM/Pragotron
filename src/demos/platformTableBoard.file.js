(() => {
  // src/platform/data.js
  var STATION_CHARACTER_COUNT = 14;
  var STATION_FLAP_SEQUENCE = Object.freeze([
    " ",
    ".",
    "-",
    "/",
    "A",
    "\xC1",
    "\xC4",
    "B",
    "C",
    "\u010C",
    "D",
    "\u010E",
    "E",
    "\xC9",
    "\u011A",
    "\xCB",
    "F",
    "G",
    "H",
    "I",
    "\xCD",
    "\xCF",
    "J",
    "K",
    "L",
    "\u013D",
    "M",
    "N",
    "\u0147",
    "O",
    "\xD3",
    "\xD6",
    "P",
    "Q",
    "R",
    "\u0158",
    "\u0154",
    "S",
    "\u0160",
    "T",
    "\u0164",
    "U",
    "\xDA",
    "\u016E",
    "\xDC",
    "V",
    "W",
    "X",
    "Y",
    "\xDD",
    "\u0178",
    "Z",
    "\u017D",
    ",",
    ":",
    ";",
    "+",
    "(",
    ")",
    "[",
    "]",
    "!",
    "?",
    "%",
    "&",
    "#",
    "'",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ]);
  var STATION_NAME_VOWELS = Object.freeze(/* @__PURE__ */ new Set([
    "A",
    "\xC1",
    "\xC4",
    "E",
    "\xC9",
    "\u011A",
    "\xCB",
    "I",
    "\xCD",
    "\xCF",
    "O",
    "\xD3",
    "\xD6",
    "U",
    "\xDA",
    "\u016E",
    "\xDC",
    "Y",
    "\xDD",
    "\u0178"
  ]));
  var stationNameChars = (value) => Array.from(String(value ?? ""));
  var stationNameLength = (value) => stationNameChars(value).length;
  var sliceStationName = (value, start, end) => stationNameChars(value).slice(start, end).join("");
  var abbreviateStationConnectors = (value) => {
    const words = String(value).split(" ").filter(Boolean);
    const result = [];
    for (let index = 0; index < words.length; index += 1) {
      if (words[index] === "NAD" && words[index + 1]) {
        result.push(`N/${words[index + 1]}`);
        index += 1;
        continue;
      }
      result.push(words[index]);
    }
    return result.join(" ");
  };
  var fillStationName = (value, width) => {
    const words = String(value).split(" ").filter(Boolean);
    let result = "";
    for (const word of words) {
      if (!result) {
        result = stationNameLength(word) <= width ? word : sliceStationName(word, 0, width);
        continue;
      }
      const remaining = width - stationNameLength(result);
      const next = ` ${word}`;
      if (stationNameLength(next) <= remaining) {
        result += next;
        continue;
      }
      if (remaining <= 1) {
        break;
      }
      result += ` ${sliceStationName(word, 0, remaining - 1)}`;
      break;
    }
    return result.replace(/ +$/g, "");
  };
  var stripTrailingVowels = (value) => {
    const chars = stationNameChars(value);
    while (chars.length > 1 && STATION_NAME_VOWELS.has(chars[chars.length - 1])) {
      chars.pop();
    }
    return chars.join("");
  };
  var nextKeptLetter = (value) => {
    for (const character of stationNameChars(value)) {
      if (character !== " " && character !== ".") {
        return character;
      }
    }
    return "";
  };
  var formatStationName = (value, {
    maxLength = STATION_CHARACTER_COUNT,
    sequence = STATION_FLAP_SEQUENCE
  } = {}) => {
    const cleaned = stationNameChars(
      String(value ?? "").replace(/[–—−]/g, "-").toLocaleUpperCase("cs-CZ")
    ).map((character) => sequence.includes(character) ? character : " ").join("").replace(/\s+/g, " ").trim();
    if (!cleaned || maxLength <= 0) {
      return "";
    }
    const abbreviated = abbreviateStationConnectors(cleaned);
    if (stationNameLength(abbreviated) <= maxLength) {
      return abbreviated;
    }
    if (maxLength === 1) {
      return ".";
    }
    const filled = fillStationName(abbreviated, maxLength - 1);
    const remaining = sliceStationName(abbreviated, stationNameLength(filled));
    if (filled.endsWith(".")) {
      const extra = nextKeptLetter(remaining);
      const combined = `${filled}${extra}`;
      return stationNameLength(combined) <= maxLength ? combined : sliceStationName(combined, 0, maxLength);
    }
    return `${stripTrailingVowels(filled)}.`;
  };
  var STATION_FLIP_DURATION = 190;
  var FLAP_TIMING_VARIATION_MS = 0;
  var FLAP_TIMING_DURATION_MIN = 50;
  var FLAP_TIMING_DURATION_MAX = 500;
  var FLAP_TIMING_VARIATION_MIN = 0;
  var FLAP_TIMING_VARIATION_MAX = 10;
  var FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: STATION_FLIP_DURATION,
    variation: FLAP_TIMING_VARIATION_MS
  });
  var DEPARTURE_FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: 100,
    variation: FLAP_TIMING_VARIATION_MS
  });
  var PLATFORM_FLAP_TIMING_DEFAULTS = Object.freeze({
    duration: 130,
    variation: FLAP_TIMING_VARIATION_MS
  });
  var DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH = 8e4;
  var DEPARTURE_BOARD_LOGO_PRESETS = Object.freeze([
    {
      id: "cd",
      src: "images/tabule/CD_logo.svg",
      label: "\u010CD"
    },
    {
      id: "sprzel",
      src: "images/tabule/sprzel.svg",
      label: "Spr\xE1va \u017Eeleznic"
    },
    {
      id: "sprzel-white",
      src: "images/tabule/sprzel_bile.svg",
      label: "Spr\xE1va \u017Eeleznic b\xEDl\xE9"
    },
    {
      id: "pragotron",
      src: "images/tabule/pragotron_bile.svg",
      label: "Pragotron"
    }
  ]);
  var normalizeCustomBoardLogoSvg = (value) => {
    const text = String(value ?? "").trim();
    if (!text || text.length > DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH || !/<svg[\s>]/i.test(text) || /<script/i.test(text) || /\bon\w+\s*=/i.test(text)) {
      return "";
    }
    return text;
  };
  var TRAIN_TYPE_IMAGE_FILE_NAMES = [
    "EuroCity_Logo.svg",
    "InterCity_Austria.svg",
    "intercity.svg",
    "Nightjet_logo.svg",
    "nightjet.svg",
    "Railjet_logo.svg",
    "railjet.svg",
    "Regiojet_logo.svg",
    "regiojet.svg",
    "Spr\xE1va_\u017Eeleznic_logo.svg",
    "supercity.svg"
  ];
  var trainTypeImageLabel = (file) => String(file || "").replace(/\.svg$/i, "").replaceAll("_", " ");
  var TRAIN_TYPE_IMAGE_FILES = Object.freeze(
    [...TRAIN_TYPE_IMAGE_FILE_NAMES].sort(
      (left, right) => trainTypeImageLabel(left).localeCompare(
        trainTypeImageLabel(right),
        "cs",
        { sensitivity: "base" }
      )
    )
  );
  var TRAIN_TYPE_IMAGE_FILE_SET = new Set(TRAIN_TYPE_IMAGE_FILES);
  var trainTypeImageSrc = (file) => `images/typy-vlaku/${file}`;
  var normalizeTrainTypeSource = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    if (/<svg[\s>]/i.test(raw)) {
      return normalizeCustomBoardLogoSvg(raw);
    }
    const file = raw.split(/[/\\]/).pop();
    if (TRAIN_TYPE_IMAGE_FILE_SET.has(file) && (raw === trainTypeImageSrc(file) || raw === `images/${file}` || raw === file)) {
      return trainTypeImageSrc(file);
    }
    return "";
  };
  var trainTypeImageUrl = (value) => {
    const source = normalizeTrainTypeSource(value);
    if (!source) {
      return "";
    }
    if (source.startsWith("<")) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    }
    return source;
  };
  var clampInteger = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.round(number))) : fallback;
  };
  var normalizeFlapTiming = (value = {}) => {
    const source = value && typeof value === "object" ? value : {};
    return {
      duration: clampInteger(
        source.duration,
        FLAP_TIMING_DURATION_MIN,
        FLAP_TIMING_DURATION_MAX,
        FLAP_TIMING_DEFAULTS.duration
      ),
      variation: clampInteger(
        source.variation,
        FLAP_TIMING_VARIATION_MIN,
        FLAP_TIMING_VARIATION_MAX,
        FLAP_TIMING_DEFAULTS.variation
      )
    };
  };
  var isLegacySharedFlapTiming = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }
    return Number(value.duration) === STATION_FLIP_DURATION && Number(value.variation ?? FLAP_TIMING_VARIATION_MS) === FLAP_TIMING_VARIATION_MS;
  };
  var resolveBoardFlapTiming = (value, boardDefault = FLAP_TIMING_DEFAULTS) => {
    const source = value && typeof value === "object" ? value : null;
    const hasDuration = Number.isFinite(Number(source?.duration));
    if (!source || !hasDuration || isLegacySharedFlapTiming(source)) {
      return normalizeFlapTiming(boardDefault);
    }
    return normalizeFlapTiming(source);
  };
  var getFlapDuration = (timing = FLAP_TIMING_DEFAULTS) => {
    const normalized = normalizeFlapTiming(timing);
    return normalized.duration + Math.floor(Math.random() * (normalized.variation * 2 + 1)) - normalized.variation;
  };
  var DELAY_VALUES = Object.freeze([
    "",
    5,
    10,
    15,
    20,
    25,
    30,
    35,
    40,
    45,
    50,
    55,
    60,
    70,
    80,
    90,
    100,
    110,
    120,
    150,
    180,
    210,
    240,
    270,
    300,
    330,
    360,
    390
  ]);
  var DELAY_DISPLAY_THRESHOLD = 5;
  var DELAY_OFFSET_DEFAULT = false;
  var RECENT_DEPARTURE_GRACE_MS = 10 * 60 * 1e3;
  var DEPARTURE_HOLD_RELEASE_MS = RECENT_DEPARTURE_GRACE_MS + 60 * 1e3;
  var minutesSinceClock = (clockDate, reference) => {
    const referenceMinute = new Date(reference.getTime());
    referenceMinute.setSeconds(0, 0);
    return referenceMinute.getTime() - clockDate.getTime();
  };
  var normalizeDelayOffset = (value) => value === true;
  var parseDelayMinutes = (value) => {
    if (value === "" || value === null || value === void 0) {
      return "";
    }
    const text = String(value).trim();
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*min\.?$/i);
    const numericValue = Number(match ? match[1].replace(",", ".") : value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : null;
  };
  var getDisplayedDelay = (value, values = DELAY_VALUES, applyOffset = DELAY_OFFSET_DEFAULT) => {
    const minutes = parseDelayMinutes(value);
    if (minutes === "" || minutes === null) {
      return "";
    }
    const offsetEnabled = normalizeDelayOffset(applyOffset);
    if (offsetEnabled && minutes <= DELAY_DISPLAY_THRESHOLD) {
      return "";
    }
    const availableValues = values.filter(
      (candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0 && (offsetEnabled ? Number(candidate) < minutes : Number(candidate) <= minutes)
    );
    return availableValues.length ? availableValues[availableValues.length - 1] : "";
  };
  var getEffectiveDepartureDate = (departureTime, delay, now = /* @__PURE__ */ new Date(), applyOffset = DELAY_OFFSET_DEFAULT) => {
    const hours = Number(departureTime?.hours);
    const minutes = Number(departureTime?.minutes);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      return null;
    }
    const reference = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(reference.getTime())) {
      return null;
    }
    const clock = new Date(reference.getTime());
    clock.setSeconds(0, 0);
    clock.setHours(hours, minutes, 0, 0);
    const date = new Date(clock.getTime());
    const displayedDelay = getDisplayedDelay(delay, DELAY_VALUES, applyOffset);
    if (displayedDelay !== "") {
      date.setMinutes(date.getMinutes() + Number(displayedDelay));
    }
    const recentDeparture = minutesSinceClock(date, reference) <= RECENT_DEPARTURE_GRACE_MS;
    if (date.getTime() < reference.getTime() && !recentDeparture) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };
  var TRAIN_TYPES = Object.freeze([
    {
      name: "",
      text: "",
      background: "var(--flap-background)",
      foreground: "var(--flap-foreground)"
    },
    { name: "\u010CEDOK", text: "\u010CEDOK", background: "#D80300", foreground: "#fff" },
    { name: "Ex", text: "Ex", background: "#D80300", foreground: "#fff" },
    {
      name: "Ex l\xF4\u017Ek.",
      text: "Ex",
      suffix: "l\xF4\u017Ek.",
      background: "#D80300",
      foreground: "#fff"
    },
    {
      name: "Ex miest.",
      text: "Ex",
      suffix: "miest.",
      background: "#D80300",
      foreground: "#fff"
    },
    {
      name: "Mim. Os",
      text: "Mim. Os",
      background: "var(--flap-background)",
      foreground: "#fff"
    },
    { name: "Mim. R", text: "Mim. R", background: "#D80300", foreground: "#fff" },
    { name: "ODKLON", text: "ODKLON", background: "#FFD800", foreground: "#000" },
    { name: "Os", text: "Os", background: "var(--flap-background)", foreground: "#fff" },
    { name: "R", text: "R", background: "#D80300", foreground: "#fff" },
    {
      name: "R miest.",
      text: "R",
      suffix: "miest.",
      background: "#D80300",
      foreground: "#fff"
    },
    { name: "ROH", text: "ROH", background: "#D80300", foreground: "#fff" },
    { name: "Sp", text: "Sp", background: "#1e3c69", foreground: "#fff" },
    {
      name: "Z\xC1JAZD",
      text: "Z\xC1JAZD",
      background: "var(--flap-background)",
      foreground: "#fff"
    },
    {
      name: "Intercity",
      source: "images/typy-vlaku/intercity.svg",
      label: "Intercity (IC)",
      background: "#fff",
      foreground: "#CC3333"
    },
    {
      name: "Eurocity",
      source: "images/typy-vlaku/EuroCity_Logo.svg",
      label: "Eurocity (EC)",
      background: "#fff",
      foreground: "#000"
    },
    {
      name: "rj",
      source: "images/typy-vlaku/railjet.svg",
      label: "Railjet (rj)",
      background: "#D80300",
      foreground: "#fff"
    },
    {
      name: "RJ",
      source: "images/typy-vlaku/regiojet.svg",
      label: "RegioJet (RJ)",
      background: "#F1B504",
      foreground: "#000"
    },
    {
      name: "EuroNight",
      text: "EN",
      label: "EuroNight (EN)",
      background: "var(--flap-background)",
      foreground: "#fff"
    },
    {
      name: "nj",
      source: "images/typy-vlaku/nightjet.svg",
      label: "NightJet (nj)",
      background: "#1e3c69",
      foreground: "#fff"
    },
    {
      name: "SuperCity",
      source: "images/typy-vlaku/supercity.svg",
      label: "SuperCity (SC)",
      background: "#fff",
      foreground: "#F1B504"
    }
  ]);
  var DEPARTURE_TRACK_VALUES = Object.freeze([
    "",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "6a",
    "11a",
    "701"
  ]);
  var DEPARTURE_PLATFORM_VALUES = Object.freeze([
    "",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ]);
  var DEPARTURE_SECTOR_VALUES = Object.freeze([
    "",
    "A",
    "A-B",
    "A-C",
    "A-D",
    "B",
    "B-C",
    "B-D",
    "B-E",
    "C",
    "C-D",
    "C-E",
    "D",
    "D-E",
    "E",
    "Sever",
    "Jih"
  ]);
  var TRAIN_NUMBER_CARD_STYLES = Object.freeze({
    default: Object.freeze({
      background: "var(--flap-background)",
      foreground: "var(--flap-foreground)"
    }),
    intercity: Object.freeze({
      background: "#fff",
      foreground: "#000"
    }),
    sp: Object.freeze({
      background: "#1e3c69",
      foreground: "#fff"
    }),
    red: Object.freeze({
      background: "#D80300",
      foreground: "#fff"
    })
  });
  var createTrainNumberCard = (key, value, style) => Object.freeze({
    key,
    value,
    ...TRAIN_NUMBER_CARD_STYLES[style],
    style
  });
  var createTrainNumberDigitCards = (style) => Array.from(
    { length: 10 },
    (_, digit) => createTrainNumberCard(`${style}-${digit}`, String(digit), style)
  );
  var TRAIN_NUMBER_FLAP_CARDS = Object.freeze([
    createTrainNumberCard("blank", "", "default"),
    ...createTrainNumberDigitCards("default"),
    ...createTrainNumberDigitCards("intercity"),
    ...createTrainNumberDigitCards("sp"),
    ...createTrainNumberDigitCards("red")
  ]);
  var normalizeOperatorKey = (value) => String(value ?? "").toLocaleLowerCase("cs-CZ").replace(/[^a-z0-9áäčďéěíľĺňóôŕřšťúůýž]+/gi, "");
  var isRegioJetOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized.includes("regiojet") || normalized === "rjet" || normalized === "rj";
  };
  var isCDOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized === "\u010Dd" || normalized === "cd" || normalized.includes("\u010Desk\xE9dr\xE1hy") || normalized.includes("ceskedrahy");
  };
  var findKnownTrainTypeName = (value) => {
    const sourceType = String(value ?? "").trim();
    if (!sourceType) {
      return "";
    }
    const lower = sourceType.toLocaleLowerCase("cs-CZ");
    return TRAIN_TYPES.find((candidate) => candidate.name === sourceType)?.name || TRAIN_TYPES.find(
      (candidate) => candidate.name.toLocaleLowerCase("cs-CZ") === lower
    )?.name || TRAIN_TYPES.find(
      (candidate) => candidate.text && candidate.text.toLocaleLowerCase("cs-CZ") === lower
    )?.name || "";
  };
  var resolveCanonicalTrainType = (sourceType, operator = "") => {
    const original = String(sourceType ?? "").trim();
    const lower = original.toLocaleLowerCase("cs-CZ");
    if (lower === "ic" || lower === "intercity") {
      return "Intercity";
    }
    if (lower === "ec" || lower === "eurocity") {
      return "Eurocity";
    }
    if (lower === "sc" || lower === "supercity") {
      return "SuperCity";
    }
    if (lower === "en" || lower === "euronight") {
      return "EuroNight";
    }
    if (lower === "nj" || lower === "nightjet") {
      return "nj";
    }
    if (lower === "railjet") {
      return "rj";
    }
    if (lower === "regiojet") {
      return "RJ";
    }
    if (lower === "rj") {
      if (isRegioJetOperator(operator)) {
        return "RJ";
      }
      if (isCDOperator(operator)) {
        return "rj";
      }
      return original === "RJ" ? "RJ" : "rj";
    }
    return findKnownTrainTypeName(original);
  };
  var findTrainType = (value, types = TRAIN_TYPES) => {
    const requested = String(value ?? "").trim();
    if (!requested) {
      return types.find((type) => type.name === "") || types[0] || null;
    }
    const exact = types.find(
      (type) => type.name === requested || type.source === requested
    );
    if (exact) {
      return exact;
    }
    const normalized = requested.toLocaleLowerCase("cs-CZ");
    const aliasName = normalized === "railjet" ? "rj" : normalized === "regiojet" ? "RJ" : "";
    if (aliasName) {
      const aliased = types.find((type) => type.name === aliasName);
      if (aliased) {
        return aliased;
      }
    }
    const insensitive = types.filter(
      (type) => type.name.toLocaleLowerCase("cs-CZ") === normalized
    );
    if (insensitive.length === 1) {
      return insensitive[0];
    }
    const canonicalName = resolveCanonicalTrainType(requested);
    return types.find((type) => type.name === canonicalName) || null;
  };
  var NIGHT_FADE_MODES = Object.freeze([
    { value: "none", label: "Bez pohas\xEDn\xE1n\xED (st\xE1l\xFD svit)" },
    { value: "soft", label: "Jemn\xE9 kol\xEDs\xE1n\xED" },
    { value: "slow", label: "Pomal\xE9 pohas\xEDn\xE1n\xED" },
    { value: "flicker", label: "Nepravideln\xE9 poblik\xE1v\xE1n\xED" }
  ]);
  var NIGHT_LIGHT_BASE_DEFAULTS = Object.freeze({
    enabled: true,
    variation: false,
    intensity: 40,
    speed: 120,
    fade: "none"
  });
  var NIGHT_LIGHT_DEFAULTS = Object.freeze([
    { id: "top-left", label: "Horn\xED lev\xE1", ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: "top-center", label: "Horn\xED st\u0159ed", ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: "top-right", label: "Horn\xED prav\xE1", ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: "bottom-left", label: "Doln\xED lev\xE1", ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: "bottom-center", label: "Doln\xED st\u0159ed", ...NIGHT_LIGHT_BASE_DEFAULTS },
    { id: "bottom-right", label: "Doln\xED prav\xE1", ...NIGHT_LIGHT_BASE_DEFAULTS }
  ]);
  var NIGHT_CLOCK_DEFAULTS = Object.freeze({
    enabled: true,
    intensity: 60
  });
  var createEmptyBoardState = () => ({
    stations: ["", ""],
    train: "",
    delay: "",
    departureTime: null
  });
  var cloneBoardState = (state) => {
    const source = state && typeof state === "object" ? state : {};
    const stations = Array.isArray(source.stations) ? source.stations : [source.stationOne, source.stationTwo];
    return {
      ...source,
      stations: [stations[0] || "", stations[1] || ""],
      train: source.train || "",
      delay: source.delay ?? "",
      departureTime: source.departureTime && typeof source.departureTime === "object" ? {
        hours: Number(source.departureTime.hours) || 0,
        minutes: Number(source.departureTime.minutes) || 0
      } : null
    };
  };

  // src/platform/audio.js
  var soundUrl = (fileName) => typeof document === "undefined" ? fileName : new URL(fileName, document.baseURI).href;
  var DEFAULT_SOUND_URL = soundUrl("sounds/split-flap.wav");
  var PITCHED_SOUND_URL = soundUrl("sounds/split-flap_pitched_down.wav");
  var FLAP_SOUND_DURATION_MS = 170;
  var FLAP_SOUND_POOL_SIZE = 48;
  var DEFAULT_PLAYBACK_RATE = Math.min(
    16,
    Math.max(0.0625, FLAP_SOUND_DURATION_MS / STATION_FLIP_DURATION)
  );
  var playbackRateFor = (durationMs) => {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration <= 0) {
      return DEFAULT_PLAYBACK_RATE;
    }
    return Math.min(16, Math.max(0.0625, FLAP_SOUND_DURATION_MS / duration));
  };
  var usesGeckoMix = () => {
    if (typeof document === "undefined") {
      return false;
    }
    const style = document.documentElement?.style;
    return Boolean(style) && ("MozAppearance" in style || "MozBoxSizing" in style);
  };
  var hannWindow = (length) => {
    const window2 = new Float32Array(length);
    const last = Math.max(1, length - 1);
    for (let index = 0; index < length; index += 1) {
      window2[index] = 0.5 * (1 - Math.cos(2 * Math.PI * index / last));
    }
    return window2;
  };
  var stretchPreservePitch = (channels, sampleRate, playbackRate) => {
    const rate = Number(playbackRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return channels.map((channel) => Float32Array.from(channel));
    }
    const stretch = 1 / rate;
    if (Math.abs(stretch - 1) < 4e-3) {
      return channels.map((channel) => Float32Array.from(channel));
    }
    const inputLength = channels[0].length;
    const outputLength = Math.max(1, Math.round(inputLength * stretch));
    const windowSize = Math.max(16, Math.round(sampleRate * 0.02));
    if (inputLength < windowSize * 2) {
      return channels.map((channel) => Float32Array.from(channel));
    }
    const hopOut = Math.max(8, Math.floor(windowSize / 2));
    const hopIn = hopOut / stretch;
    const search = Math.max(1, Math.round(sampleRate * 4e-3));
    const hann = hannWindow(windowSize);
    const outputs = channels.map(() => new Float32Array(outputLength + windowSize));
    const weight = new Float32Array(outputLength + windowSize);
    const clampPos = (pos) => Math.max(
      0,
      Math.min(inputLength - windowSize, Math.round(pos))
    );
    const correlate = (origin, candidate) => {
      let dot = 0;
      let energy = 1e-12;
      for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
        const channel = channels[channelIndex];
        for (let index = 0; index < windowSize; index += 4) {
          const left = channel[origin + index];
          const right = channel[candidate + index];
          dot += left * right;
          energy += right * right;
        }
      }
      return dot / Math.sqrt(energy);
    };
    const addFrame = (inputIndex, outputIndex) => {
      for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
        const input = channels[channelIndex];
        const output = outputs[channelIndex];
        for (let index = 0; index < windowSize; index += 1) {
          output[outputIndex + index] += input[inputIndex + index] * hann[index];
        }
      }
      for (let index = 0; index < windowSize; index += 1) {
        weight[outputIndex + index] += hann[index];
      }
    };
    let inPos = 0;
    let outPos = 0;
    addFrame(0, 0);
    while (outPos + hopOut < outputLength) {
      const nominal = inPos + hopIn;
      if (nominal + windowSize >= inputLength) {
        break;
      }
      const origin = clampPos(inPos + hopOut);
      let best = clampPos(nominal);
      let bestScore = -Infinity;
      const start = clampPos(nominal - search);
      const end = clampPos(nominal + search);
      for (let candidate = start; candidate <= end; candidate += 2) {
        const score = correlate(origin, candidate);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      outPos += hopOut;
      addFrame(best, outPos);
      inPos = best;
    }
    const mixed = outputs.map((output) => {
      const trimmed = new Float32Array(outputLength);
      for (let index = 0; index < outputLength; index += 1) {
        const scale = weight[index];
        trimmed[index] = scale > 1e-5 ? output[index] / scale : 0;
      }
      return trimmed;
    });
    const attack = Math.min(
      inputLength,
      outputLength,
      Math.round(sampleRate * 0.025)
    );
    const fade = Math.min(
      Math.round(sampleRate * 8e-3),
      Math.max(0, Math.min(inputLength, outputLength) - attack)
    );
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      const input = channels[channelIndex];
      const output = mixed[channelIndex];
      for (let index = 0; index < attack; index += 1) {
        output[index] = input[index];
      }
      for (let index = 0; index < fade; index += 1) {
        const at = attack + index;
        const blend = index / fade;
        output[at] = input[at] * (1 - blend) + output[at] * blend;
      }
    }
    return mixed;
  };
  var AUDIO_MUTE_STORAGE_KEY = "pragotron.board.audioMuted.v1";
  var AUDIO_VOLUME_STORAGE_KEY = "pragotron.board.audioVolume.v1";
  var normalizeVolume = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 100;
    }
    return Math.min(100, Math.max(0, Math.round(numeric)));
  };
  var forgetStoredAudioLevel = () => {
    try {
      globalThis.sessionStorage?.removeItem(AUDIO_MUTE_STORAGE_KEY);
      globalThis.sessionStorage?.removeItem(AUDIO_VOLUME_STORAGE_KEY);
    } catch {
    }
  };
  var readVolumeOverride = () => {
    try {
      const params = new URLSearchParams(globalThis.location?.search || "");
      if (!params.has("volume")) {
        return null;
      }
      const raw = String(params.get("volume") ?? "").trim();
      if (!/^\d{1,3}$/.test(raw)) {
        return null;
      }
      const numeric = Number(raw);
      if (!Number.isInteger(numeric) || numeric > 100) {
        return null;
      }
      return numeric;
    } catch {
      return null;
    }
  };
  var SplitFlapAudio = class {
    constructor(source = DEFAULT_SOUND_URL) {
      this.template = typeof Audio === "function" ? new Audio(source) : null;
      this.pitchedTemplate = typeof Audio === "function" ? new Audio(PITCHED_SOUND_URL) : null;
      this.unlocked = false;
      this.muted = false;
      const volumeOverride = readVolumeOverride();
      this.volume = volumeOverride === null ? 100 : volumeOverride;
      forgetStoredAudioLevel();
      this.activationTarget = null;
      this.activationHandler = null;
      this.listeners = /* @__PURE__ */ new Set();
      this.voices = [];
      this.pitchedVoices = [];
      this.pendingPlays = [];
      this.flushingPlays = false;
      this.bufferMix = usesGeckoMix() && typeof AudioContext === "function" && Boolean(this.template);
      this.context = null;
      this.master = null;
      this.normalDecoded = null;
      this.pitchedDecoded = null;
      this.normalCache = /* @__PURE__ */ new Map();
      this.pitchedCache = /* @__PURE__ */ new Map();
      this.pendingAfterDecode = [];
      this.liveSources = /* @__PURE__ */ new Set();
      [this.template, this.pitchedTemplate].forEach((template) => {
        if (template) {
          template.preload = "auto";
        }
      });
      if (this.bufferMix) {
        this.startBufferMix();
      } else {
        this.fillPool(this.voices, this.template);
        this.fillPool(this.pitchedVoices, this.pitchedTemplate);
      }
      this.applyVolume();
    }
    applyVolume() {
      const level = this.volume / 100;
      const apply = (sound) => {
        if (sound) {
          sound.volume = level;
        }
      };
      apply(this.template);
      apply(this.pitchedTemplate);
      this.voices.forEach((voice) => apply(voice.sound));
      this.pitchedVoices.forEach((voice) => apply(voice.sound));
      if (this.master) {
        this.master.gain.value = level;
      }
    }
    holdPitch(sound) {
      if (!sound) {
        return;
      }
      if (sound.preservesPitch !== true) {
        sound.preservesPitch = true;
      }
      if ("webkitPreservesPitch" in sound && sound.webkitPreservesPitch !== true) {
        sound.webkitPreservesPitch = true;
      }
    }
    configureSound(sound) {
      sound.preload = "auto";
      sound.playbackRate = DEFAULT_PLAYBACK_RATE;
      this.holdPitch(sound);
      sound.volume = this.volume / 100;
    }
    makeVoice(template) {
      const sound = template.cloneNode();
      this.configureSound(sound);
      if (!sound.getAttribute("src") && template.src) {
        sound.src = template.src;
        this.holdPitch(sound);
      }
      const voice = {
        sound,
        busy: false,
        ready: true
      };
      this.bindVoice(voice);
      return voice;
    }
    bindVoice(voice) {
      const sound = voice.sound;
      const keepPitch = () => {
        if (voice.sound !== sound) {
          return;
        }
        this.holdPitch(sound);
      };
      sound.addEventListener("loadedmetadata", () => {
        keepPitch();
        if (voice.sound !== sound) {
          return;
        }
        sound.volume = this.volume / 100;
      });
      sound.addEventListener("ended", () => {
        if (voice.sound !== sound) {
          return;
        }
        if (voice.busyTimer) {
          clearTimeout(voice.busyTimer);
          voice.busyTimer = null;
        }
        voice.busy = false;
        voice.ready = true;
      });
      sound.addEventListener("error", () => {
        if (voice.sound !== sound) {
          return;
        }
        voice.busy = false;
        voice.ready = true;
      });
    }
    fillPool(pool, template) {
      if (!template) {
        return;
      }
      while (pool.length < FLAP_SOUND_POOL_SIZE) {
        pool.push(this.makeVoice(template));
      }
    }
    claimVoice(pool) {
      for (let index = 0; index < pool.length; index += 1) {
        const voice = pool[index];
        if (!voice.busy && !voice.sound.seeking) {
          return voice;
        }
      }
      return null;
    }
    getState() {
      return {
        available: Boolean(this.template),
        unlocked: this.unlocked,
        muted: this.muted,
        volume: this.volume
      };
    }
    setMuted(value) {
      const nextValue = Boolean(value);
      if (nextValue === this.muted) {
        return this.muted;
      }
      this.muted = nextValue;
      this.listeners.forEach((listener) => listener(this.getState()));
      return this.muted;
    }
    setVolume(value) {
      const nextValue = normalizeVolume(value);
      const changed = nextValue !== this.volume;
      this.volume = nextValue;
      this.applyVolume();
      if (changed) {
        this.listeners.forEach((listener) => listener(this.getState()));
      }
      return this.volume;
    }
    setUnlocked(value) {
      const nextValue = Boolean(value);
      if (nextValue === this.unlocked) {
        return;
      }
      this.unlocked = nextValue;
      this.listeners.forEach((listener) => listener(this.getState()));
    }
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener audia mus\xED b\xFDt funkce.");
      }
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    removeActivationListeners() {
      if (!this.activationTarget || !this.activationHandler) {
        return;
      }
      ["pointerdown", "keydown"].forEach((eventName) => {
        this.activationTarget.removeEventListener(
          eventName,
          this.activationHandler,
          true
        );
      });
      this.activationTarget = null;
      this.activationHandler = null;
    }
    bindUserActivation(target = globalThis.document) {
      if (!this.template || !target?.addEventListener) {
        return this;
      }
      if (this.unlocked || this.activationTarget) {
        return this;
      }
      this.activationTarget = target;
      this.activationHandler = () => {
        this.unlock();
      };
      ["pointerdown", "keydown"].forEach((eventName) => {
        target.addEventListener(
          eventName,
          this.activationHandler,
          true
        );
      });
      return this;
    }
    unlock() {
      if (!this.template || this.unlocked) {
        return this.unlocked;
      }
      const sound = this.template.cloneNode();
      sound.preload = "auto";
      sound.muted = true;
      sound.volume = 0;
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) {
          return;
        }
        cleanedUp = true;
        sound.pause();
        sound.remove();
      };
      const unlocked = () => {
        this.setUnlocked(true);
        this.removeActivationListeners();
        this.context?.resume?.();
        this.applyVolume();
        cleanup();
      };
      try {
        const playback = sound.play();
        if (playback?.then) {
          playback.then(unlocked).catch(cleanup);
        } else {
          unlocked();
        }
      } catch {
        cleanup();
      }
      return this.unlocked;
    }
    play(variant, durationMs) {
      if (this.muted) {
        return;
      }
      this.applyVolume();
      this.pendingPlays.push({ variant, durationMs });
      if (this.flushingPlays) {
        return;
      }
      this.flushingPlays = true;
      const flush = () => {
        this.flushingPlays = false;
        const queued = this.pendingPlays.splice(0);
        if (this.bufferMix) {
          this.playBuffered(queued);
          return;
        }
        queued.forEach((item) => this.playNow(item.variant, item.durationMs));
      };
      if (typeof queueMicrotask === "function") {
        queueMicrotask(flush);
      } else {
        setTimeout(flush, 0);
      }
    }
    playNow(variant, durationMs) {
      const pool = variant === "pitched" ? this.pitchedVoices : this.voices;
      if (this.muted || pool.length === 0) {
        return;
      }
      const voice = this.claimVoice(pool);
      if (!voice) {
        return;
      }
      const sound = voice.sound;
      voice.busy = true;
      voice.ready = false;
      sound.volume = this.volume / 100;
      const rate = playbackRateFor(durationMs);
      if (Math.abs(sound.playbackRate - rate) > 1e-3) {
        sound.playbackRate = rate;
      }
      this.holdPitch(sound);
      const release = () => {
        if (voice.busyTimer) {
          clearTimeout(voice.busyTimer);
          voice.busyTimer = null;
        }
        voice.busy = false;
        voice.ready = !sound.seeking;
      };
      const armRelease = () => {
        const expectedMs = Number.isFinite(sound.duration) && sound.playbackRate > 0 ? sound.duration / sound.playbackRate * 1e3 : 200;
        voice.busyTimer = setTimeout(() => {
          voice.busyTimer = null;
          if (voice.sound !== sound || !voice.busy) {
            return;
          }
          if (sound.paused || sound.ended) {
            voice.busy = false;
            voice.ready = true;
          }
        }, expectedMs + 80);
      };
      try {
        const playback = sound.play();
        if (playback?.then) {
          playback.then(() => {
            this.setUnlocked(true);
            armRelease();
          }).catch(release);
        } else {
          this.setUnlocked(true);
          armRelease();
        }
      } catch {
        release();
      }
    }
    startBufferMix() {
      const context = new AudioContext();
      const master = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -1.5;
      limiter.knee.value = 3;
      limiter.ratio.value = 20;
      limiter.attack.value = 2e-3;
      limiter.release.value = 0.04;
      master.gain.value = this.volume / 100;
      master.connect(limiter);
      limiter.connect(context.destination);
      this.context = context;
      this.master = master;
      this.limiter = limiter;
      this.prepareDecoded("normal", this.template.src);
      this.prepareDecoded("pitched", this.pitchedTemplate?.src);
    }
    prepareDecoded(kind, url) {
      if (!url || !this.context) {
        return;
      }
      fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.arrayBuffer();
      }).then((encoded) => this.context.decodeAudioData(encoded.slice(0))).then((decoded) => {
        if (!this.bufferMix || !this.context) {
          return;
        }
        if (kind === "pitched") {
          this.pitchedDecoded = decoded;
        } else {
          this.normalDecoded = decoded;
        }
        this.flushDecodedQueue();
      }).catch(() => this.failBufferMix());
    }
    failBufferMix() {
      if (!this.bufferMix) {
        return;
      }
      this.bufferMix = false;
      const queued = this.pendingAfterDecode.splice(0);
      this.fillPool(this.voices, this.template);
      this.fillPool(this.pitchedVoices, this.pitchedTemplate);
      queued.forEach((item) => this.playNow(item.variant, item.durationMs));
    }
    flushDecodedQueue() {
      if (!this.bufferMix || this.pendingAfterDecode.length === 0) {
        return;
      }
      if (!this.normalDecoded) {
        return;
      }
      const queued = this.pendingAfterDecode.splice(0);
      this.playBuffered(queued);
    }
    bufferFor(variant, durationMs) {
      const decoded = variant === "pitched" ? this.pitchedDecoded : this.normalDecoded;
      if (!decoded || !this.context) {
        return null;
      }
      const rate = playbackRateFor(durationMs);
      const key = rate.toFixed(4);
      const cache = variant === "pitched" ? this.pitchedCache : this.normalCache;
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
      const channels = [];
      for (let index = 0; index < decoded.numberOfChannels; index += 1) {
        channels.push(Float32Array.from(decoded.getChannelData(index)));
      }
      const stretched = stretchPreservePitch(channels, decoded.sampleRate, rate);
      const buffer = this.context.createBuffer(
        stretched.length,
        stretched[0].length,
        decoded.sampleRate
      );
      stretched.forEach((channel, index) => {
        buffer.getChannelData(index).set(channel);
      });
      cache.set(key, buffer);
      return buffer;
    }
    playBuffered(queued) {
      if (!this.context || this.muted || queued.length === 0) {
        return;
      }
      const start = () => {
        if (!this.bufferMix || !this.context || !this.master) {
          queued.forEach((item) => this.playNow(item.variant, item.durationMs));
          return;
        }
        const when = this.context.currentTime + 5e-3;
        const waiting = [];
        queued.forEach((item) => {
          const buffer = this.bufferFor(item.variant, item.durationMs);
          if (!buffer) {
            waiting.push(item);
            return;
          }
          const source = this.context.createBufferSource();
          source.buffer = buffer;
          source.connect(this.master);
          source.onended = () => {
            this.liveSources.delete(source);
            source.disconnect();
          };
          this.liveSources.add(source);
          source.start(when);
        });
        if (waiting.length > 0) {
          this.pendingAfterDecode.push(...waiting);
        }
        this.setUnlocked(true);
      };
      if (this.context.state === "running") {
        start();
        return;
      }
      const resumed = this.context.resume();
      if (resumed?.then) {
        resumed.then(start).catch(() => this.failBufferMix());
        return;
      }
      start();
    }
    destroy() {
      this.removeActivationListeners();
      this.listeners.clear();
      this.pendingPlays = [];
      this.pendingAfterDecode = [];
      this.flushingPlays = false;
      this.bufferMix = false;
      this.liveSources.forEach((source) => {
        try {
          source.stop();
        } catch {
        }
        source.disconnect();
      });
      this.liveSources.clear();
      this.context?.close?.();
      this.context = null;
      this.master = null;
      this.limiter = null;
      const stopVoice = (voice) => {
        if (voice.busyTimer) {
          clearTimeout(voice.busyTimer);
        }
        voice.sound.pause();
      };
      this.voices.splice(0).forEach(stopVoice);
      this.pitchedVoices.splice(0).forEach(stopVoice);
      this.template?.pause();
      this.pitchedTemplate?.pause();
      this.template = null;
      this.pitchedTemplate = null;
    }
  };

  // src/platform/flap-clock.js
  var jobs = /* @__PURE__ */ new Set();
  var timer = null;
  var timerDue = Infinity;
  var arm = () => {
    let soonest = Infinity;
    jobs.forEach((job) => {
      if (!job.cancelled && job.due < soonest) {
        soonest = job.due;
      }
    });
    if (soonest === Infinity) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      timerDue = Infinity;
      return;
    }
    if (timer !== null && Math.abs(timerDue - soonest) < 1) {
      return;
    }
    if (timer !== null) {
      clearTimeout(timer);
    }
    timerDue = soonest;
    timer = setTimeout(run, Math.max(0, soonest - performance.now()));
  };
  var run = () => {
    timer = null;
    timerDue = Infinity;
    const now = performance.now();
    const due = [];
    jobs.forEach((job) => {
      if (job.cancelled) {
        jobs.delete(job);
        return;
      }
      if (job.due <= now) {
        due.push(job);
      }
    });
    try {
      due.forEach((job) => {
        jobs.delete(job);
        if (!job.cancelled) {
          job.fire(now);
        }
      });
    } finally {
      arm();
    }
  };
  var scheduleFlapStepAt = (due, fire) => {
    const job = {
      due: Number(due),
      fire,
      cancelled: false,
      cancel() {
        this.cancelled = true;
        jobs.delete(this);
      }
    };
    jobs.add(job);
    arm();
    return job;
  };
  var scheduleFlapStep = (delay, fire) => scheduleFlapStepAt(
    performance.now() + Math.max(0, Number(delay) || 0),
    fire
  );
  var nextFlapDeadline = (startedAt, duration) => startedAt + Math.max(1, duration);

  // src/platform/displays.js
  var scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 0);
  };
  var prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clearTimer = (owner, property) => {
    const timer2 = owner[property];
    if (timer2 == null) {
      return;
    }
    if (typeof timer2.cancel === "function") {
      timer2.cancel();
    } else {
      window.clearTimeout(timer2);
    }
    owner[property] = null;
  };
  var FLIP_CLASS = "is-flipping";
  var FLIP_CLASS_ALT = "is-flipping-b";
  var TOP_FLIP_FRAMES = [
    { transform: "rotateX(0deg)" },
    { transform: "rotateX(-90deg)" }
  ];
  var BOTTOM_FLIP_FRAMES = [
    { transform: "rotateX(90deg)" },
    { transform: "rotateX(0deg)" }
  ];
  var flapHalf = (element, marker) => {
    const halves = element.children;
    for (let index = 0; index < halves.length; index += 1) {
      if (halves[index].className.includes(marker)) {
        return halves[index];
      }
    }
    return null;
  };
  var restartFlapAnimation = (element, duration) => {
    clearFlapAnimation(element);
    const top = flapHalf(element, "top-current");
    const bottom = flapHalf(element, "bottom-next");
    const half = Math.max(1, duration / 2);
    if (!top || !bottom || typeof top.animate !== "function") {
      element._flapAlt = !element._flapAlt;
      element.style.setProperty("--flap-half-duration", `${half}ms`);
      element.classList.add(element._flapAlt ? FLIP_CLASS_ALT : FLIP_CLASS);
      return;
    }
    element._flapAnims = [
      top.animate(TOP_FLIP_FRAMES, {
        duration: half,
        easing: "ease-in",
        fill: "both"
      }),
      bottom.animate(BOTTOM_FLIP_FRAMES, {
        duration: half,
        delay: half,
        easing: "ease-out",
        fill: "both"
      })
    ];
  };
  var clearFlapAnimation = (element) => {
    element.classList.remove(FLIP_CLASS, FLIP_CLASS_ALT);
    element.style.removeProperty("--flap-half-duration");
    if (element._flapAnims) {
      element._flapAnims.forEach((animation) => animation.cancel());
      element._flapAnims = null;
    }
  };
  var SplitFlapDisplay = class {
    constructor(element, {
      audio: audio2 = null,
      ownsAudio = null,
      maxLength = STATION_CHARACTER_COUNT,
      sequence = STATION_FLAP_SEQUENCE,
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.audio = audio2 || new SplitFlapAudio();
      this.ownsAudio = ownsAudio ?? !audio2;
      this.maxLength = maxLength;
      this.sequence = sequence;
      this.timing = normalizeFlapTiming(timing);
      this.characters = [];
      this.defaultValue = element.dataset.text || "";
      this.value = "";
      this.reducedMotion = prefersReducedMotion();
      this.initialize("");
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      return { ...this.timing };
    }
    normalize(value) {
      return String(value ?? "").toLocaleUpperCase("cs-CZ");
    }
    charactersFor(value) {
      return Array.from(formatStationName(value, {
        maxLength: this.maxLength,
        sequence: this.sequence
      })).concat(Array(this.maxLength).fill(" ")).slice(0, this.maxLength);
    }
    glyphFor(character) {
      return character === " " ? "\xA0" : character;
    }
    createHalf(className, character) {
      const half = document.createElement("span");
      const timeHalfClass = className.replace("flap-half", "time-flap-half");
      half.className = `flap-half ${className} time-flap-half ${timeHalfClass}`;
      const glyph = document.createElement("span");
      glyph.className = "flap-glyph time-flap-content";
      const glyphText = document.createElement("span");
      glyphText.className = "flap-glyph-text time-flap-value";
      glyphText.textContent = this.glyphFor(character);
      glyph.appendChild(glyphText);
      half.appendChild(glyph);
      return half;
    }
    renderCharacter(element, current, next) {
      const texts = element._flapTexts;
      const currentGlyph = this.glyphFor(current);
      const nextGlyph = this.glyphFor(next);
      texts[0].textContent = currentGlyph;
      texts[1].textContent = nextGlyph;
      texts[2].textContent = currentGlyph;
      texts[3].textContent = nextGlyph;
    }
    createCharacter(current, next) {
      const character = document.createElement("span");
      character.className = "flap-character";
      character.setAttribute("aria-hidden", "true");
      const texts = [
        "flap-half--top-current",
        "flap-half--top-next",
        "flap-half--bottom-current",
        "flap-half--bottom-next"
      ].map((className) => {
        const half = this.createHalf(className, " ");
        character.appendChild(half);
        return half.querySelector(".flap-glyph-text");
      });
      character._flapTexts = texts;
      this.renderCharacter(character, current, next);
      return character;
    }
    initialize(value) {
      const target = this.charactersFor(value);
      this.value = target.join("").trim();
      this.characters = [];
      this.element.replaceChildren();
      target.forEach((character) => {
        const element = this.createCharacter(" ", " ");
        const state = {
          element,
          value: " ",
          timer: null,
          sequence: 0
        };
        this.characters.push(state);
        this.element.appendChild(element);
        if (this.reducedMotion) {
          this.renderCharacter(element, character, character);
          state.value = character;
        } else {
          this.flip(state, character);
        }
      });
      this.updateLabel();
    }
    updateLabel() {
      this.element.setAttribute("aria-label", this.value.trim());
    }
    nextCharacter(current, target) {
      const currentIndex = this.sequence.indexOf(current);
      const targetIndex = this.sequence.indexOf(target);
      const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
      if (safeCurrentIndex === targetIndex) {
        return target;
      }
      return this.sequence[(safeCurrentIndex + 1) % this.sequence.length];
    }
    flip(state, target, delay = 0, tickNow = performance.now()) {
      state.sequence += 1;
      const sequence = state.sequence;
      clearTimer(state, "timer");
      clearFlapAnimation(state.element);
      this.advance(state, target, sequence, delay, tickNow);
    }
    advance(state, target, sequence, delay = 0, tickNow = performance.now()) {
      if (sequence !== state.sequence || state.value === target) {
        return;
      }
      const startStep = (startedAt = tickNow) => {
        if (sequence !== state.sequence || state.value === target) {
          return;
        }
        const current = state.value;
        const next = this.nextCharacter(current, target);
        clearFlapAnimation(state.element);
        this.renderCharacter(state.element, current, next);
        if (this.reducedMotion) {
          this.renderCharacter(state.element, next, next);
          state.value = next;
          state.timer = null;
          this.advance(state, target, sequence);
          return;
        }
        const flipDuration = getFlapDuration(this.timing);
        restartFlapAnimation(state.element, flipDuration);
        if (!this.audio.muted) {
          this.audio.play(void 0, flipDuration);
        }
        state.timer = scheduleFlapStepAt(
          nextFlapDeadline(startedAt, flipDuration),
          (nextTick) => {
            if (sequence !== state.sequence) {
              return;
            }
            state.value = next;
            state.timer = null;
            if (state.value === target) {
              clearFlapAnimation(state.element);
              this.renderCharacter(state.element, next, next);
              return;
            }
            this.advance(state, target, sequence, 0, nextTick);
          }
        );
      };
      if (delay > 0) {
        state.timer = scheduleFlapStep(delay, (startedAt) => startStep(startedAt));
        return;
      }
      startStep(tickNow);
    }
    set(value) {
      const target = this.charactersFor(value);
      this.value = target.join("").trim();
      this.updateLabel();
      const tickNow = performance.now();
      this.characters.forEach((state, index) => {
        this.flip(state, target[index], 0, tickNow);
      });
      return this.value;
    }
    setImmediate(value) {
      const target = this.charactersFor(value);
      this.value = target.join("").trim();
      this.updateLabel();
      this.characters.forEach((state, index) => {
        state.sequence += 1;
        clearTimer(state, "timer");
        clearFlapAnimation(state.element);
        this.renderCharacter(state.element, target[index], target[index]);
        state.value = target[index];
      });
    }
    getValue() {
      return this.value;
    }
    isSettled() {
      const target = this.charactersFor(this.value);
      return this.characters.every(
        (state, index) => state.value === target[index] && state.timer === null
      );
    }
    destroy() {
      this.characters.forEach((state) => {
        state.sequence += 1;
        clearTimer(state, "timer");
      });
      this.characters = [];
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var DelayFlapDisplay = class {
    constructor(element, values = DELAY_VALUES, {
      audio: audio2 = null,
      ownsAudio = null,
      timing = FLAP_TIMING_DEFAULTS,
      applyDelayOffset = DELAY_OFFSET_DEFAULT
    } = {}) {
      this.element = element;
      this.values = values;
      this.audio = audio2 || new SplitFlapAudio();
      this.ownsAudio = ownsAudio ?? !audio2;
      this.timing = normalizeFlapTiming(timing);
      this.applyDelayOffset = normalizeDelayOffset(applyDelayOffset);
      this.sourceValue = "";
      this.defaultValue = element.dataset.delay || "";
      this.currentValue = "";
      this.targetValue = "";
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion();
      this.render("", "");
      this.updateLabel();
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      return { ...this.timing };
    }
    parse(value) {
      if (value === "" || value === null || value === void 0) {
        return "";
      }
      const numericValue = parseDelayMinutes(value);
      if (numericValue === null) {
        throw new RangeError(
          `Neplatn\xE9 zpo\u017Ed\u011Bn\xED "${value}". Zadejte nez\xE1porn\xE9 minuty.`
        );
      }
      return getDisplayedDelay(
        numericValue,
        this.values,
        this.applyDelayOffset
      );
    }
    setDelayOffset(enabled) {
      const nextValue = normalizeDelayOffset(enabled);
      if (nextValue === this.applyDelayOffset) {
        return this.applyDelayOffset;
      }
      this.applyDelayOffset = nextValue;
      this.set(this.sourceValue);
      return this.applyDelayOffset;
    }
    ensureFaces() {
      if (this.faces) {
        return;
      }
      this.element.replaceChildren();
      this.faces = [
        "delay-flap-half--top-current",
        "delay-flap-half--top-next",
        "delay-flap-half--bottom-current",
        "delay-flap-half--bottom-next"
      ].map((className) => {
        const half = document.createElement("span");
        half.className = `delay-flap-half ${className}`;
        const content = document.createElement("span");
        content.className = "delay-flap-content";
        const number = document.createElement("span");
        number.className = "delay-flap-number";
        const unit = document.createElement("span");
        unit.className = "delay-flap-unit";
        unit.textContent = "min";
        content.append(number, unit);
        half.appendChild(content);
        this.element.appendChild(half);
        return { number, unit };
      });
    }
    paintFace(face, value) {
      const blank = value === "";
      face.number.classList.toggle("is-blank", blank);
      face.unit.classList.toggle("is-blank", blank);
      face.number.textContent = blank ? "" : String(value);
      face.unit.textContent = blank ? "" : "min";
    }
    render(current, next) {
      this.ensureFaces();
      this.paintFace(this.faces[0], current);
      this.paintFace(this.faces[1], next);
      this.paintFace(this.faces[2], current);
      this.paintFace(this.faces[3], next);
    }
    updateLabel() {
      this.element.setAttribute(
        "aria-label",
        this.targetValue === "" ? "Bez me\u0161kania" : `Me\u0161kanie ${this.targetValue} min\xFAt`
      );
    }
    set(value) {
      this.sourceValue = value;
      const next = this.parse(value);
      const sequence = ++this.sequence;
      this.targetValue = next;
      clearTimer(this, "timer");
      clearFlapAnimation(this.element);
      this.updateLabel();
      if (this.currentValue === next) {
        this.render(next, next);
        this.currentValue = next;
        return this.currentValue;
      }
      this.advance(sequence);
      return this.targetValue;
    }
    setImmediate(value) {
      this.sourceValue = value;
      const next = this.parse(value);
      this.sequence += 1;
      clearTimer(this, "timer");
      this.targetValue = next;
      this.currentValue = next;
      clearFlapAnimation(this.element);
      this.render(next, next);
      this.updateLabel();
    }
    clear() {
      return this.set("");
    }
    advanceToBlank(sequence) {
      this.advance(sequence);
    }
    advance(sequence, tickNow = performance.now()) {
      if (sequence !== this.sequence || this.currentValue === this.targetValue) {
        return;
      }
      const currentIndex = this.values.indexOf(this.currentValue);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const next = this.values[(safeCurrentIndex + 1) % this.values.length];
      clearFlapAnimation(this.element);
      this.render(this.currentValue, next);
      if (this.reducedMotion) {
        this.render(next, next);
        this.currentValue = next;
        scheduleFrame(() => this.advance(sequence));
        return;
      }
      const flipDuration = getFlapDuration(this.timing);
      const startedAt = typeof tickNow === "number" ? tickNow : performance.now();
      restartFlapAnimation(this.element, flipDuration);
      if (!this.audio.muted) {
        this.audio.play("pitched", flipDuration);
      }
      this.timer = scheduleFlapStepAt(
        nextFlapDeadline(startedAt, flipDuration),
        (nextTick) => {
          if (sequence !== this.sequence) {
            return;
          }
          this.currentValue = next;
          this.timer = null;
          if (this.currentValue === this.targetValue) {
            clearFlapAnimation(this.element);
            this.render(next, next);
            return;
          }
          this.advance(sequence, nextTick);
        }
      );
    }
    getValue() {
      return this.targetValue;
    }
    isSettled() {
      return this.currentValue === this.targetValue && this.timer === null;
    }
    destroy() {
      this.sequence += 1;
      clearTimer(this, "timer");
      this.faces = null;
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var TrainFlapDisplay = class {
    constructor(element, types = TRAIN_TYPES, {
      audio: audio2 = null,
      ownsAudio = null,
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.types = types;
      this.audio = audio2 || new SplitFlapAudio();
      this.ownsAudio = ownsAudio ?? !audio2;
      this.timing = normalizeFlapTiming(timing);
      this.defaultValue = element.dataset.type || element.dataset.src || "";
      this.defaultSource = element.dataset.src || this.defaultValue;
      this.currentIndex = 0;
      this.targetIndex = 0;
      this.source = "";
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion();
      this.render(this.types[0], this.types[0]);
      this.updateLabel();
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      return { ...this.timing };
    }
    setTypes(types) {
      if (!Array.isArray(types) || types.length === 0) {
        return this.types;
      }
      const current = this.types[this.currentIndex];
      this.types = types;
      const nextIndex = current ? this.types.findIndex((type) => type.name === current.name) : 0;
      const index = nextIndex === -1 ? 0 : nextIndex;
      this.sequence += 1;
      clearTimer(this, "timer");
      this.currentIndex = index;
      this.targetIndex = index;
      clearFlapAnimation(this.element);
      this.render(this.types[index], this.types[index]);
      this.updateLabel();
      return this.types;
    }
    indexFor(value) {
      if (value === "" || value === null || value === void 0) {
        return 0;
      }
      const match = findTrainType(value, this.types);
      const index = match ? this.types.indexOf(match) : -1;
      return index === -1 ? 0 : index;
    }
    ensureFaces() {
      if (this.faces) {
        return;
      }
      this.element.replaceChildren();
      this.faces = [
        "train-flap-half--top-current",
        "train-flap-half--top-next",
        "train-flap-half--bottom-current",
        "train-flap-half--bottom-next"
      ].map((className) => {
        const half = document.createElement("span");
        half.className = `train-flap-half ${className}`;
        half.setAttribute("aria-hidden", "true");
        this.element.appendChild(half);
        return {
          half,
          kind: "empty",
          image: null,
          textWrap: null,
          main: null,
          suffix: null
        };
      });
    }
    paintFace(face, type) {
      face.half.style.setProperty("--train-flap-background", type.background);
      face.half.style.setProperty("--train-flap-foreground", type.foreground);
      const imageUrl = trainTypeImageUrl(type.source);
      if (imageUrl) {
        if (face.kind !== "image") {
          face.kind = "image";
          const content = document.createElement("span");
          content.className = "train-flap-content train-flap-content--image";
          face.half.replaceChildren(content);
          face.content = content;
          face.source = "";
          face.image = null;
          face.textWrap = null;
          face.main = null;
          face.suffix = null;
        }
        if (face.source !== imageUrl) {
          face.source = imageUrl;
          face.content.style.backgroundImage = `url("${imageUrl}")`;
        }
        return;
      }
      if (!type.text) {
        if (face.kind !== "empty") {
          face.kind = "empty";
          face.half.replaceChildren();
          face.image = null;
          face.textWrap = null;
          face.main = null;
          face.suffix = null;
        }
        return;
      }
      if (face.kind !== "text") {
        face.kind = "text";
        const content = document.createElement("span");
        content.className = "train-flap-content";
        const textWrap = document.createElement("span");
        textWrap.className = "train-flap-text";
        const main = document.createElement("span");
        main.className = "train-flap-main";
        textWrap.appendChild(main);
        content.appendChild(textWrap);
        face.half.replaceChildren(content);
        face.image = null;
        face.textWrap = textWrap;
        face.main = main;
        face.suffix = null;
      }
      face.main.textContent = type.text;
      if (type.suffix) {
        if (!face.suffix) {
          face.suffix = document.createElement("span");
          face.suffix.className = "train-flap-suffix";
          face.textWrap.appendChild(face.suffix);
        }
        face.suffix.textContent = type.suffix;
      } else if (face.suffix) {
        face.suffix.remove();
        face.suffix = null;
      }
    }
    render(currentType, nextType) {
      this.ensureFaces();
      this.paintFace(this.faces[0], currentType);
      this.paintFace(this.faces[1], nextType);
      this.paintFace(this.faces[2], currentType);
      this.paintFace(this.faces[3], nextType);
    }
    updateLabel() {
      const currentType = this.types[this.currentIndex];
      this.element.setAttribute(
        "aria-label",
        currentType.name || "Bez typu vlaku"
      );
    }
    advance(sequence, tickNow = performance.now()) {
      if (sequence !== this.sequence || this.currentIndex === this.targetIndex) {
        return;
      }
      const nextIndex = (this.currentIndex + 1) % this.types.length;
      const currentType = this.types[this.currentIndex];
      const nextType = this.types[nextIndex];
      clearFlapAnimation(this.element);
      this.render(currentType, nextType);
      if (this.reducedMotion) {
        this.render(nextType, nextType);
        this.currentIndex = nextIndex;
        this.source = nextType.source || "";
        this.updateLabel();
        scheduleFrame(() => this.advance(sequence));
        return;
      }
      const flipDuration = getFlapDuration(this.timing);
      restartFlapAnimation(this.element, flipDuration);
      if (!this.audio.muted) {
        this.audio.play("pitched", flipDuration);
      }
      this.timer = scheduleFlapStepAt(
        nextFlapDeadline(tickNow, flipDuration),
        (nextTick) => {
          if (sequence !== this.sequence) {
            return;
          }
          this.currentIndex = nextIndex;
          this.source = nextType.source || "";
          this.timer = null;
          this.updateLabel();
          if (this.currentIndex === this.targetIndex) {
            clearFlapAnimation(this.element);
            this.render(nextType, nextType);
            return;
          }
          this.advance(sequence, nextTick);
        }
      );
    }
    set(value) {
      const targetIndex = this.indexFor(value);
      this.targetIndex = targetIndex;
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      clearFlapAnimation(this.element);
      this.render(this.types[this.currentIndex], this.types[this.currentIndex]);
      this.advance(sequence);
      return this.types[targetIndex].name;
    }
    setImmediate(value) {
      const targetIndex = this.indexFor(value);
      this.sequence += 1;
      clearTimer(this, "timer");
      this.currentIndex = targetIndex;
      this.targetIndex = targetIndex;
      this.source = this.types[targetIndex].source || "";
      clearFlapAnimation(this.element);
      this.render(this.types[targetIndex], this.types[targetIndex]);
      this.updateLabel();
    }
    clear() {
      this.set("");
    }
    getValue() {
      return this.types[this.currentIndex].name;
    }
    isSettled() {
      return this.currentIndex === this.targetIndex && this.timer === null;
    }
    destroy() {
      this.sequence += 1;
      clearTimer(this, "timer");
      this.faces = null;
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var SequentialNumericFlap = class {
    constructor(element, minimum, maximum, {
      audio: audio2 = null,
      ownsAudio = null,
      timing = FLAP_TIMING_DEFAULTS,
      includeBlank = true
    } = {}) {
      this.element = element;
      this.minimum = minimum;
      this.maximum = maximum;
      this.includeBlank = includeBlank !== false;
      this.audio = audio2 || new SplitFlapAudio();
      this.ownsAudio = ownsAudio ?? !audio2;
      this.timing = normalizeFlapTiming(timing);
      this.currentValue = "";
      this.targetValue = "";
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion();
      this.render(this.currentValue, this.currentValue);
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      return { ...this.timing };
    }
    parse(value) {
      const numericValue = Number(value);
      if (!Number.isInteger(numericValue) || numericValue < this.minimum || numericValue > this.maximum) {
        throw new RangeError(
          `Hodnota ${value} nen\xED v rozsahu ${this.minimum}-${this.maximum}.`
        );
      }
      return numericValue;
    }
    ensureFaces() {
      if (this.faces) {
        return;
      }
      this.element.replaceChildren();
      this.faces = [
        "time-flap-half--top-current",
        "time-flap-half--top-next",
        "time-flap-half--bottom-current",
        "time-flap-half--bottom-next"
      ].map((className) => {
        const half = document.createElement("span");
        half.className = `time-flap-half ${className}`;
        const content = document.createElement("span");
        content.className = "time-flap-content";
        const number = document.createElement("span");
        number.className = "time-flap-value";
        content.appendChild(number);
        half.appendChild(content);
        this.element.appendChild(half);
        return number;
      });
    }
    render(current, next) {
      this.ensureFaces();
      const currentText = current === "" ? "" : String(current);
      const nextText = next === "" ? "" : String(next);
      this.faces[0].textContent = currentText;
      this.faces[1].textContent = nextText;
      this.faces[2].textContent = currentText;
      this.faces[3].textContent = nextText;
    }
    set(value) {
      const nextTarget = this.parse(value);
      this.targetValue = nextTarget;
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      clearFlapAnimation(this.element);
      this.advance(sequence);
      return nextTarget;
    }
    setImmediate(value) {
      const nextTarget = this.parse(value);
      this.sequence += 1;
      clearTimer(this, "timer");
      this.targetValue = nextTarget;
      this.currentValue = nextTarget;
      clearFlapAnimation(this.element);
      this.render(nextTarget, nextTarget);
    }
    clear() {
      this.targetValue = "";
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      clearFlapAnimation(this.element);
      this.advance(sequence);
    }
    clearImmediate() {
      this.sequence += 1;
      clearTimer(this, "timer");
      this.currentValue = "";
      this.targetValue = "";
      clearFlapAnimation(this.element);
      this.render("", "");
    }
    advance(sequence, tickNow = performance.now()) {
      if (sequence !== this.sequence || this.currentValue === this.targetValue) {
        return;
      }
      let next;
      if (this.currentValue === "") {
        next = this.minimum;
      } else if (this.currentValue === this.maximum) {
        next = this.includeBlank ? "" : this.minimum;
      } else {
        next = this.currentValue + 1;
      }
      const current = this.currentValue;
      clearFlapAnimation(this.element);
      this.render(current, next);
      if (this.reducedMotion) {
        this.render(next, next);
        this.currentValue = next;
        scheduleFrame(() => this.advance(sequence));
        return;
      }
      const flipDuration = getFlapDuration(this.timing);
      restartFlapAnimation(this.element, flipDuration);
      if (!this.audio.muted) {
        this.audio.play(void 0, flipDuration);
      }
      this.timer = scheduleFlapStepAt(
        nextFlapDeadline(tickNow, flipDuration),
        (nextTick) => {
          if (sequence !== this.sequence) {
            return;
          }
          this.currentValue = next;
          this.timer = null;
          if (this.currentValue === this.targetValue) {
            clearFlapAnimation(this.element);
            this.render(next, next);
            return;
          }
          this.advance(sequence, nextTick);
        }
      );
    }
    getValue() {
      return this.currentValue;
    }
    isSettled() {
      return this.currentValue === this.targetValue && this.timer === null;
    }
    destroy() {
      this.sequence += 1;
      clearTimer(this, "timer");
      this.faces = null;
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var DepartureTimeDisplay = class {
    constructor(element, {
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS,
      label = "Odjezd",
      includeBlank = true
    } = {}) {
      this.element = element;
      this.label = label || "Odjezd";
      this.defaultHours = Number(element.dataset.hours);
      this.defaultMinutes = Number(element.dataset.minutes);
      const flapOptions = { audio: audio2, timing, includeBlank };
      this.hour = new SequentialNumericFlap(
        element.querySelector(".time-hour-flap"),
        0,
        23,
        flapOptions
      );
      this.minuteTens = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[0],
        0,
        5,
        flapOptions
      );
      this.minuteOnes = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[1],
        0,
        9,
        flapOptions
      );
      const secondFlaps = element.querySelectorAll(".time-second-flap");
      this.secondTens = secondFlaps.length >= 2 ? new SequentialNumericFlap(secondFlaps[0], 0, 5, flapOptions) : null;
      this.secondOnes = secondFlaps.length >= 2 ? new SequentialNumericFlap(secondFlaps[1], 0, 9, flapOptions) : null;
      this.element.setAttribute("aria-label", this.label);
    }
    setTiming(timing) {
      const normalized = normalizeFlapTiming(timing);
      this.hour.setTiming(normalized);
      this.minuteTens.setTiming(normalized);
      this.minuteOnes.setTiming(normalized);
      this.secondTens?.setTiming(normalized);
      this.secondOnes?.setTiming(normalized);
      return normalized;
    }
    parseTime(hours, minutes, seconds) {
      if (minutes === void 0 && typeof hours === "string") {
        const match = hours.trim().match(/^(\d{1,2})[.:](\d{2})$/);
        if (!match) {
          throw new TypeError("\u010Cas odjezdu mus\xED m\xEDt form\xE1t HH.MM.");
        }
        hours = Number(match[1]);
        minutes = Number(match[2]);
      }
      hours = Number(hours);
      minutes = Number(minutes);
      if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        throw new RangeError("\u010Cas odjezdu mus\xED b\xFDt mezi 00.00 a 23.59.");
      }
      if (!this.secondTens || seconds === void 0) {
        return { hours, minutes, seconds: null };
      }
      seconds = Number(seconds);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
        throw new RangeError("Vte\u0159iny mus\xED b\xFDt mezi 0 a 59.");
      }
      return { hours, minutes, seconds };
    }
    updateLabel(hours, minutes, seconds) {
      const clock = `${hours}.${String(minutes).padStart(2, "0")}`;
      this.element.setAttribute(
        "aria-label",
        seconds === null || seconds === void 0 ? `${this.label} ${clock}` : `${this.label} ${clock}.${String(seconds).padStart(2, "0")}`
      );
    }
    applySeconds(time, immediate) {
      if (!this.secondTens || time.seconds === null) {
        return;
      }
      const tens = Math.floor(time.seconds / 10);
      const ones = time.seconds % 10;
      if (immediate) {
        this.secondTens.setImmediate(tens);
        this.secondOnes.setImmediate(ones);
        return;
      }
      this.secondTens.set(tens);
      this.secondOnes.set(ones);
    }
    set(hours, minutes, seconds) {
      const time = this.parseTime(hours, minutes, seconds);
      this.hour.set(time.hours);
      this.minuteTens.set(Math.floor(time.minutes / 10));
      this.minuteOnes.set(time.minutes % 10);
      this.applySeconds(time, false);
      this.updateLabel(time.hours, time.minutes, time.seconds);
      return time;
    }
    setImmediate(hours, minutes, seconds) {
      const time = this.parseTime(hours, minutes, seconds);
      this.hour.setImmediate(time.hours);
      this.minuteTens.setImmediate(Math.floor(time.minutes / 10));
      this.minuteOnes.setImmediate(time.minutes % 10);
      this.applySeconds(time, true);
      this.updateLabel(time.hours, time.minutes, time.seconds);
    }
    clear() {
      this.hour.clear();
      this.minuteTens.clear();
      this.minuteOnes.clear();
      this.secondTens?.clear();
      this.secondOnes?.clear();
      this.element.setAttribute("aria-label", this.label);
    }
    clearImmediate() {
      this.hour.clearImmediate();
      this.minuteTens.clearImmediate();
      this.minuteOnes.clearImmediate();
      this.secondTens?.clearImmediate();
      this.secondOnes?.clearImmediate();
      this.element.setAttribute("aria-label", this.label);
    }
    getValue() {
      const values = [
        this.hour.getValue(),
        this.minuteTens.getValue(),
        this.minuteOnes.getValue()
      ];
      const secondValues = this.secondTens ? [this.secondTens.getValue(), this.secondOnes.getValue()] : [];
      if (values.concat(secondValues).every((value) => value === "")) {
        return null;
      }
      const time = {
        hours: values[0] === "" ? 0 : values[0],
        minutes: (values[1] === "" ? 0 : values[1]) * 10 + (values[2] === "" ? 0 : values[2])
      };
      if (this.secondTens) {
        time.seconds = (secondValues[0] === "" ? 0 : secondValues[0]) * 10 + (secondValues[1] === "" ? 0 : secondValues[1]);
      }
      return time;
    }
    isSettled() {
      return this.hour.isSettled() && this.minuteTens.isSettled() && this.minuteOnes.isSettled() && (this.secondTens?.isSettled() ?? true) && (this.secondOnes?.isSettled() ?? true);
    }
    destroy() {
      this.hour.destroy();
      this.minuteTens.destroy();
      this.minuteOnes.destroy();
      this.secondTens?.destroy();
      this.secondOnes?.destroy();
      this.element.replaceChildren();
    }
  };

  // stanice/brno-hlavni-nadrazi.json
  var brno_hlavni_nadrazi_default = {
    version: 1,
    name: "Brno hlavn\xED n\xE1dra\u017E\xED",
    platforms: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6"
    ],
    tracks: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "6a",
      "11a",
      "701"
    ],
    sectors: [
      "A",
      "B",
      "C",
      "D",
      "E"
    ],
    sectorRanges: [
      "A-B",
      "A-C",
      "A-D",
      "B-C",
      "B-D",
      "B-E",
      "C-D",
      "C-E",
      "D-E"
    ],
    numberStyles: [
      {
        id: "default",
        label: "default",
        background: "var(--flap-background)",
        foreground: "var(--flap-foreground)"
      },
      {
        id: "red",
        label: "red",
        background: "#D80300",
        foreground: "#fff"
      },
      {
        id: "sp",
        label: "sp",
        background: "#1e3c69",
        foreground: "#fff"
      },
      {
        id: "intercity",
        label: "intercity",
        background: "#fff",
        foreground: "#D80300"
      }
    ],
    trainTypes: [
      {
        name: "",
        text: "",
        suffix: "",
        source: "",
        label: "",
        background: "var(--flap-background)",
        foreground: "var(--flap-foreground)",
        numberStyle: "default",
        aliases: []
      },
      {
        name: "Os",
        text: "Os",
        suffix: "",
        source: "",
        label: "",
        background: "var(--flap-background)",
        foreground: "#fff",
        numberStyle: "default",
        aliases: []
      },
      {
        name: "Mim. Os",
        text: "Mim. Os",
        suffix: "",
        source: "",
        label: "",
        background: "var(--flap-background)",
        foreground: "#fff",
        numberStyle: "default",
        aliases: []
      },
      {
        name: "R",
        text: "R",
        suffix: "",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      },
      {
        name: "Mim. R",
        text: "Mim. R",
        suffix: "",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      },
      {
        name: "Ex",
        text: "Ex",
        suffix: "",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      },
      {
        name: "Ex l\u016F\u017Ek.",
        text: "Ex",
        suffix: "l\u016F\u017Ek.",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      },
      {
        name: "Sp",
        text: "Sp",
        suffix: "",
        source: "",
        label: "",
        background: "#1e3c69",
        foreground: "#fff",
        numberStyle: "sp",
        aliases: []
      },
      {
        name: "EuroNight",
        text: "EN",
        suffix: "",
        source: "",
        label: "EuroNight (EN)",
        background: "#1e3c69",
        foreground: "#fff",
        numberStyle: "sp",
        aliases: [
          "EN"
        ]
      },
      {
        name: "Intercity",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/intercity.svg",
        label: "Intercity (IC)",
        background: "#fff",
        foreground: "#CC3333",
        numberStyle: "intercity",
        aliases: [
          "IC"
        ]
      },
      {
        name: "Eurocity",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/EuroCity_Logo.svg",
        label: "Eurocity (EC)",
        background: "#fff",
        foreground: "#000",
        numberStyle: "intercity",
        aliases: [
          "EC"
        ]
      },
      {
        name: "SuperCity",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/supercity.svg",
        label: "SuperCity (SC)",
        background: "#fff",
        foreground: "#F1B504",
        numberStyle: "intercity",
        aliases: [
          "SC"
        ]
      },
      {
        name: "rj",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/Railjet_logo.svg",
        label: "Railjet (rj)",
        background: "#fff",
        foreground: "#D80300",
        numberStyle: "intercity",
        aliases: [
          "railjet"
        ]
      },
      {
        name: "nj",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/nightjet.svg",
        label: "NightJet (nj)",
        background: "#1e3c69",
        foreground: "#fff",
        numberStyle: "sp",
        aliases: [
          "NightJet"
        ]
      },
      {
        name: "ODKLON",
        text: "ODKLON",
        suffix: "",
        source: "",
        label: "",
        background: "#FFD800",
        foreground: "#000",
        numberStyle: "default",
        aliases: []
      },
      {
        name: "RJ",
        text: "",
        suffix: "",
        source: "images/typy-vlaku/regiojet.svg",
        label: "RegioJet (RJ)",
        background: "#F1B504",
        foreground: "#000",
        numberStyle: "intercity",
        aliases: [
          "regiojet"
        ]
      },
      {
        name: "Z\xC1JEZD",
        text: "Z\xC1JEZD",
        suffix: "",
        source: "",
        label: "",
        background: "var(--flap-background)",
        foreground: "#fff",
        numberStyle: "default",
        aliases: []
      },
      {
        name: "\u010CEDOK",
        text: "\u010CEDOK",
        suffix: "",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      },
      {
        name: "ROH",
        text: "ROH",
        suffix: "",
        source: "",
        label: "",
        background: "#D80300",
        foreground: "#fff",
        numberStyle: "red",
        aliases: []
      }
    ]
  };

  // src/platform/station-profile.js
  var STATION_PROFILE_STORAGE_KEY = "pragotron.stationProfile.v1";
  var STATION_PROFILE_VERSION = 1;
  var MAX_LIST = 80;
  var MAX_TYPES = 40;
  var MAX_STYLES = 12;
  var MAX_TEXT = 32;
  var clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
  var cleanToken = (value) => clean(value).replace(/[–—−]/g, "-").replace(/\s*-\s*/g, "-").slice(0, MAX_TEXT);
  var uniqueTokens = (values, limit = MAX_LIST) => {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(values) ? values : []).forEach((value) => {
      const token = cleanToken(value);
      const key = token.toLocaleLowerCase("cs-CZ");
      if (!token || seen.has(key) || result.length >= limit) {
        return;
      }
      seen.add(key);
      result.push(token);
    });
    return result;
  };
  var linesFrom = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value ?? "").split(/\r?\n/);
  };
  var isCssColor = (value) => {
    const text = clean(value);
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) || /^var\(--[a-z0-9-]+\)$/i.test(text) || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(text);
  };
  var colorOr = (value, fallback) => isCssColor(value) ? clean(value) : fallback;
  var slug = (value, fallback) => {
    const text = clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("cs-CZ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
    return text || fallback;
  };
  var blankTrainType = () => ({
    name: "",
    text: "",
    suffix: "",
    source: "",
    label: "",
    background: "var(--flap-background)",
    foreground: "var(--flap-foreground)",
    numberStyle: "default",
    aliases: []
  });
  var createDefaultStationProfile = () => normalizeStationProfile(brno_hlavni_nadrazi_default);
  var normalizeTrainType = (value, styles) => {
    const source = value && typeof value === "object" ? value : {};
    const name = cleanToken(source.name);
    const styleIds = new Set(styles.map((style) => style.id));
    const aliases = uniqueTokens(
      Array.isArray(source.aliases) ? source.aliases : String(source.aliases || "").split(/[,;]/),
      12
    ).filter((alias) => alias.toLocaleLowerCase("cs-CZ") !== name.toLocaleLowerCase("cs-CZ"));
    return {
      name,
      text: cleanToken(source.text).slice(0, 16),
      suffix: cleanToken(source.suffix).slice(0, 12),
      source: normalizeTrainTypeSource(source.source),
      label: clean(source.label).slice(0, 40),
      background: colorOr(source.background, "var(--flap-background)"),
      foreground: colorOr(source.foreground, "var(--flap-foreground)"),
      numberStyle: styleIds.has(clean(source.numberStyle)) ? clean(source.numberStyle) : "default",
      aliases
    };
  };
  var normalizeStationProfile = (value) => {
    const source = value && typeof value === "object" ? value : null;
    if (!source) {
      return null;
    }
    const fallbackStyles = Array.isArray(brno_hlavni_nadrazi_default.numberStyles) ? brno_hlavni_nadrazi_default.numberStyles : [];
    const numberStyles = [];
    const seenStyles = /* @__PURE__ */ new Set();
    (Array.isArray(source.numberStyles) ? source.numberStyles : fallbackStyles).forEach((style) => {
      const id = slug(style?.id, "") || slug(style?.label, "");
      if (!id || seenStyles.has(id) || numberStyles.length >= MAX_STYLES) {
        return;
      }
      seenStyles.add(id);
      numberStyles.push({
        id,
        label: id,
        background: colorOr(
          style.background,
          id === "default" ? "var(--flap-background)" : "#111111"
        ),
        foreground: colorOr(style.foreground, "#ffffff")
      });
    });
    if (!seenStyles.has("default")) {
      numberStyles.unshift({
        id: "default",
        label: "default",
        background: "var(--flap-background)",
        foreground: "var(--flap-foreground)"
      });
    }
    const trainTypes = [];
    const seenTypes = /* @__PURE__ */ new Set();
    (Array.isArray(source.trainTypes) ? source.trainTypes : []).forEach((type) => {
      const normalized = normalizeTrainType(type, numberStyles);
      const key = normalized.name;
      if (!normalized.name || seenTypes.has(key) || trainTypes.length >= MAX_TYPES) {
        return;
      }
      seenTypes.add(key);
      trainTypes.push(normalized);
    });
    const platforms = uniqueTokens(linesFrom(source.platforms));
    const tracks = uniqueTokens(linesFrom(source.tracks));
    const sectors = uniqueTokens(linesFrom(source.sectors), 40);
    if (platforms.length === 0 || tracks.length === 0 || trainTypes.length === 0) {
      return null;
    }
    return {
      version: STATION_PROFILE_VERSION,
      name: clean(source.name).slice(0, 80) || "Profil stanice",
      platforms,
      tracks,
      sectors,
      sectorRanges: uniqueTokens(linesFrom(source.sectorRanges), 80).filter((value2) => !sectors.some(
        (sector) => sector.toLocaleLowerCase("cs-CZ") === value2.toLocaleLowerCase("cs-CZ")
      )),
      numberStyles,
      trainTypes: [blankTrainType(), ...trainTypes]
    };
  };
  var activeProfile = null;
  var storage = () => {
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  };
  var readStoredStationProfile = () => {
    try {
      const raw = storage()?.getItem(STATION_PROFILE_STORAGE_KEY);
      return raw ? normalizeStationProfile(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  };
  var getActiveStationProfile = () => {
    if (!activeProfile) {
      activeProfile = readStoredStationProfile() || createDefaultStationProfile();
    }
    return activeProfile;
  };
  var setActiveStationProfile = (value, { persist = true } = {}) => {
    const next = normalizeStationProfile(value);
    if (!next) {
      return null;
    }
    activeProfile = next;
    if (persist) {
      try {
        storage()?.setItem(
          STATION_PROFILE_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
      }
    }
    return activeProfile;
  };
  var sectorAtoms = (label, profile = getActiveStationProfile()) => {
    const value = cleanToken(label);
    if (!value) {
      return [];
    }
    const parts = value.split("-").filter(Boolean);
    if (parts.length === 2) {
      const from = profile.sectors.findIndex(
        (sector) => sector.toLocaleLowerCase("cs-CZ") === parts[0].toLocaleLowerCase("cs-CZ")
      );
      const to = profile.sectors.findIndex(
        (sector) => sector.toLocaleLowerCase("cs-CZ") === parts[1].toLocaleLowerCase("cs-CZ")
      );
      if (from !== -1 && to !== -1) {
        const start = Math.min(from, to);
        const end = Math.max(from, to);
        return profile.sectors.slice(start, end + 1);
      }
    }
    return [value];
  };
  var sectorsOverlap = (boardSector, departureSector, profile = getActiveStationProfile()) => {
    const boardAtoms = sectorAtoms(boardSector, profile).map((sector) => sector.toLocaleLowerCase("cs-CZ"));
    const departureAtoms = sectorAtoms(departureSector, profile).map((sector) => sector.toLocaleLowerCase("cs-CZ"));
    return departureAtoms.some((sector) => boardAtoms.includes(sector));
  };

  // src/platform/lenses.js
  var LENS_COLORS = Object.freeze({
    green: Object.freeze({
      label: "Zelen\xE1",
      glass: "#245c4a",
      light: "#35e995",
      core: "#5af3aa"
    }),
    yellow: Object.freeze({
      label: "\u017Dlut\xE1",
      glass: "#6b4311",
      light: "#ff9d1c",
      core: "#ffc04a"
    }),
    red: Object.freeze({
      label: "\u010Cerven\xE1",
      glass: "#702528",
      light: "#ff443c",
      core: "#ff694f"
    }),
    blue: Object.freeze({
      label: "Modr\xE1",
      glass: "#123f78",
      light: "#167ed9",
      core: "#4aa8f2"
    }),
    coolWhite: Object.freeze({
      label: "Studen\xE1 b\xEDl\xE1",
      glass: "#74838b",
      light: "#effaff",
      core: "#d7f1f5"
    })
  });
  var LENS_DEFAULTS = Object.freeze({
    color: "green",
    enabled: true,
    blinking: true,
    blinkInterval: 0.4,
    blinkDelay: 0
  });
  var LENS_BLINK_INTERVAL_MIN = 0.1;
  var LENS_BLINK_INTERVAL_MAX = 1.5;
  var LENS_PREDEPARTURE_SECONDS_MIN = 0;
  var LENS_PREDEPARTURE_SECONDS_MAX = 300;
  var LENS_PREDEPARTURE_SECONDS_STEP = 10;
  var LENS_PREDEPARTURE_DEFAULTS = Object.freeze({
    enabled: true,
    seconds: 90
  });
  var resolveBlinkInterval = (setting, fallback) => {
    const value = Number.isFinite(Number(setting?.blinkInterval)) ? Number(setting.blinkInterval) : Number(setting?.blinkPeriod);
    return Number.isFinite(value) ? Math.min(
      LENS_BLINK_INTERVAL_MAX,
      Math.max(LENS_BLINK_INTERVAL_MIN, value)
    ) : fallback;
  };
  var parseLensColors = (value) => {
    const tokens = Array.isArray(value) ? value : String(value ?? "").split(/[,;/|]/);
    const colors = [];
    tokens.forEach((token) => {
      const name = String(token ?? "").trim();
      if (LENS_COLORS[name] && colors.length < 2) {
        colors.push(name);
      }
    });
    if (colors.length === 0) {
      return null;
    }
    return [colors[0], colors[1] || colors[0]];
  };
  var LENS_COLOR_STORAGE_KEY = "pragotron.board.lensColors.v1";
  var readLensColorOverride = (location = globalThis.location) => {
    try {
      const params = new URLSearchParams(location?.search || "");
      if (!params.has("lenses")) {
        return null;
      }
      return parseLensColors(params.get("lenses"));
    } catch {
      return null;
    }
  };
  var clearStoredLensColors = (storage3) => {
    try {
      storage3?.removeItem(LENS_COLOR_STORAGE_KEY);
    } catch {
    }
  };
  var readInitialLensColors = (location = globalThis.location, storage3 = globalThis.sessionStorage) => {
    const override = readLensColorOverride(location);
    clearStoredLensColors(storage3);
    return override;
  };
  var resolveColor = (setting, fallback) => {
    const candidates = [
      setting?.color,
      setting?.glassColor,
      setting?.lightColor
    ];
    return candidates.find(
      (value) => typeof value === "string" && LENS_COLORS[value]
    ) || fallback;
  };
  var positiveModulo = (value, divisor) => (value % divisor + divisor) % divisor;
  var lensBlinkEntries = /* @__PURE__ */ new Map();
  var lensBlinkFrame = 0;
  var prefersReducedMotion2 = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  var lensBlinkOpacity = (phase) => phase < LENS_DEFAULTS.blinkInterval ? "0.95" : "0";
  var paintLensBlinks = () => {
    lensBlinkFrame = 0;
    const now = Date.now();
    for (const [light, entry] of lensBlinkEntries) {
      if (!light.isConnected) {
        lensBlinkEntries.delete(light);
        continue;
      }
      const opacity = lensBlinkOpacity(getLensBlinkPhase({
        now,
        lensIndex: entry.lensIndex,
        rowIndex: entry.rowIndex,
        synchronizeRows: entry.synchronizeRows
      }));
      if (light.style.opacity !== opacity) {
        light.style.opacity = opacity;
      }
    }
    if (lensBlinkEntries.size > 0 && typeof window.requestAnimationFrame === "function") {
      lensBlinkFrame = window.requestAnimationFrame(paintLensBlinks);
    }
  };
  var syncLensBlink = (lens, light, {
    now,
    lensIndex,
    rowIndex,
    synchronizeRows,
    active
  }) => {
    const canShareClock = active && !prefersReducedMotion2() && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function";
    if (!canShareClock) {
      lensBlinkEntries.delete(light);
      light.style.opacity = "";
      lens.classList.remove("is-blink-synced");
      return;
    }
    lensBlinkEntries.set(light, {
      lensIndex,
      rowIndex,
      synchronizeRows
    });
    lens.classList.add("is-blink-synced");
    light.style.opacity = lensBlinkOpacity(getLensBlinkPhase({
      now,
      lensIndex,
      rowIndex,
      synchronizeRows
    }));
    if (!lensBlinkFrame) {
      lensBlinkFrame = window.requestAnimationFrame(paintLensBlinks);
    }
  };
  var getLensBlinkPhase = ({
    now = Date.now(),
    lensIndex = 0,
    rowIndex = 0,
    synchronizeRows = true
  } = {}) => {
    const interval = LENS_DEFAULTS.blinkInterval;
    const period = interval * 2;
    const globalPhase = positiveModulo(Number(now) / 1e3, period);
    const lensOffset = Math.abs(Number(lensIndex) || 0) * interval;
    const rowOffset = synchronizeRows ? 0 : Math.abs(Number(rowIndex) || 0) % 2 * interval;
    return positiveModulo(globalPhase + lensOffset + rowOffset, period);
  };
  var normalizePreDeparture = (setting = {}) => {
    const source = setting?.preDeparture || setting;
    const enabled = typeof source?.enabled === "boolean" ? source.enabled : typeof setting?.preDepartureEnabled === "boolean" ? setting.preDepartureEnabled : LENS_PREDEPARTURE_DEFAULTS.enabled;
    const rawSeconds = source?.seconds ?? setting?.preDepartureSeconds ?? LENS_PREDEPARTURE_DEFAULTS.seconds;
    const numericSeconds = Number(rawSeconds);
    const seconds = Number.isFinite(numericSeconds) ? Math.round(
      Math.min(
        LENS_PREDEPARTURE_SECONDS_MAX,
        Math.max(LENS_PREDEPARTURE_SECONDS_MIN, numericSeconds)
      ) / LENS_PREDEPARTURE_SECONDS_STEP
    ) * LENS_PREDEPARTURE_SECONDS_STEP : LENS_PREDEPARTURE_DEFAULTS.seconds;
    return { enabled, seconds };
  };
  var createDefaultLensState = (count = 2, overrides = {}) => {
    const numericCount = Math.max(1, Math.floor(Number(count) || 2));
    const sharedOverrides = { ...overrides };
    const preDeparture = normalizePreDeparture(sharedOverrides);
    const normalizedOverrides = {
      ...sharedOverrides,
      color: resolveColor(sharedOverrides, LENS_DEFAULTS.color)
    };
    delete normalizedOverrides.preDeparture;
    delete normalizedOverrides.preDepartureEnabled;
    delete normalizedOverrides.preDepartureSeconds;
    delete normalizedOverrides.glassColor;
    delete normalizedOverrides.lightColor;
    delete normalizedOverrides.blinkPeriod;
    delete normalizedOverrides.blinkInterval;
    delete normalizedOverrides.synchronizeRows;
    const blinkInterval = LENS_DEFAULTS.blinkInterval;
    return {
      lenses: Array.from({ length: numericCount }, (_, index) => ({
        ...LENS_DEFAULTS,
        ...normalizedOverrides,
        blinkInterval,
        blinkDelay: index * blinkInterval
      })),
      preDeparture,
      synchronizeRows: sharedOverrides.synchronizeRows !== false
    };
  };
  var createEmptyLensState = (count = 2) => createDefaultLensState(
    count,
    {
      enabled: false,
      preDeparture: {
        enabled: false,
        seconds: LENS_PREDEPARTURE_DEFAULTS.seconds
      }
    }
  );
  var clamp = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
  };
  var cloneLens = (setting, fallback, index) => ({
    color: resolveColor(setting, fallback.color),
    enabled: typeof setting?.enabled === "boolean" ? setting.enabled : fallback.enabled,
    blinking: typeof setting?.blinking === "boolean" ? setting.blinking : fallback.blinking,
    blinkInterval: resolveBlinkInterval(setting, fallback.blinkInterval),
    blinkDelay: clamp(
      setting?.blinkDelay,
      0,
      30,
      fallback.blinkDelay
    )
  });
  var synchronizeLensTiming = (lenses) => {
    const blinkInterval = LENS_DEFAULTS.blinkInterval;
    return lenses.map((lens, index) => ({
      ...lens,
      blinkInterval,
      blinkDelay: index * blinkInterval
    }));
  };
  var LensDisplay = class {
    constructor(element, {
      count = 2,
      defaultState,
      rowIndex = 0,
      ...defaults
    } = {}) {
      if (!element) {
        throw new TypeError("LensDisplay vy\u017Eaduje DOM element.");
      }
      this.element = element;
      this.count = Math.max(1, Math.floor(Number(count) || 2));
      this.rowIndex = Math.max(0, Math.floor(Number(rowIndex) || 0));
      this.defaults = {
        ...LENS_DEFAULTS,
        ...defaults,
        color: resolveColor(defaults, LENS_DEFAULTS.color),
        blinkInterval: resolveBlinkInterval(
          defaults,
          LENS_DEFAULTS.blinkInterval
        )
      };
      delete this.defaults.glassColor;
      delete this.defaults.lightColor;
      delete this.defaults.blinkPeriod;
      const defaultOverrides = { ...defaults };
      if (!Object.prototype.hasOwnProperty.call(defaults, "blinkDelay")) {
        delete defaultOverrides.blinkDelay;
      }
      this.defaultState = defaultState || createDefaultLensState(this.count, defaultOverrides);
      this.state = this.normalize(this.defaultState);
      this.preDepartureActive = true;
      this.render();
    }
    normalize(value) {
      if (value === "" || value === null || value === void 0) {
        return {
          lenses: synchronizeLensTiming(
            Array.from(
              { length: this.count },
              (_, index) => cloneLens(
                {
                  ...this.defaults,
                  enabled: false,
                  blinking: false
                },
                this.defaults,
                index
              )
            )
          ),
          preDeparture: normalizePreDeparture({
            enabled: false,
            seconds: LENS_PREDEPARTURE_DEFAULTS.seconds
          }),
          synchronizeRows: true
        };
      }
      const source = Array.isArray(value) ? { lenses: value } : value;
      const values = Array.isArray(source?.lenses) ? source.lenses : [source];
      return {
        lenses: synchronizeLensTiming(
          Array.from(
            { length: this.count },
            (_, index) => cloneLens(
              values[index] || values[0] || {},
              this.defaults,
              index
            )
          )
        ),
        preDeparture: normalizePreDeparture(source),
        synchronizeRows: source?.synchronizeRows !== false
      };
    }
    renderLens(setting, index, now = Date.now()) {
      const lens = document.createElement("span");
      const color = LENS_COLORS[setting.color];
      lens.className = "lens";
      lens.dataset.lensIndex = String(index);
      lens.setAttribute("aria-hidden", "true");
      lens.style.setProperty("--lens-glass-color", color.glass);
      lens.style.setProperty("--lens-light-color", color.light);
      lens.style.setProperty("--lens-light-core-color", color.core);
      lens.style.setProperty(
        "--lens-blink-duration",
        `${LENS_DEFAULTS.blinkInterval * 2}s`
      );
      lens.style.setProperty(
        "--lens-blink-delay",
        `${-getLensBlinkPhase({
          now,
          lensIndex: index,
          rowIndex: this.rowIndex,
          synchronizeRows: this.state.synchronizeRows
        })}s`
      );
      const preDepartureActive = !this.state.preDeparture.enabled || this.preDepartureActive;
      const blinking = setting.enabled && setting.blinking && preDepartureActive;
      lens.classList.toggle(
        "is-on",
        setting.enabled && preDepartureActive
      );
      lens.classList.toggle("is-blinking", blinking);
      const lightElement = document.createElement("span");
      lightElement.className = "lens-light";
      if (blinking && !prefersReducedMotion2() && typeof window.requestAnimationFrame === "function") {
        lens.classList.add("is-blink-synced");
      }
      lens.appendChild(lightElement);
      syncLensBlink(lens, lightElement, {
        now,
        lensIndex: index,
        rowIndex: this.rowIndex,
        synchronizeRows: this.state.synchronizeRows,
        active: blinking
      });
      return lens;
    }
    render() {
      const now = Date.now();
      this.element.replaceChildren(
        ...this.state.lenses.map((setting, index) => this.renderLens(setting, index, now))
      );
      this.element.classList.add("lens-display");
      this.element.setAttribute("role", "img");
      this.element.setAttribute(
        "aria-label",
        `${this.state.lenses.length} signaliza\u010Dn\xEDch \u010Do\u010Dek`
      );
    }
    set(value) {
      this.state = this.normalize(value);
      this.render();
      return this.getValue();
    }
    setImmediate(value) {
      return this.set(value);
    }
    setPreDepartureActive(isActive) {
      const nextValue = Boolean(isActive);
      if (nextValue === this.preDepartureActive && this.element.childElementCount === this.state.lenses.length) {
        return this.preDepartureActive;
      }
      this.preDepartureActive = nextValue;
      this.applyActivity();
      return this.preDepartureActive;
    }
    applyActivity() {
      const lenses = this.element.querySelectorAll(":scope > .lens");
      if (lenses.length !== this.state.lenses.length) {
        this.render();
        return;
      }
      const now = Date.now();
      const preDepartureActive = !this.state.preDeparture.enabled || this.preDepartureActive;
      this.state.lenses.forEach((setting, index) => {
        const lens = lenses[index];
        const blinking = setting.enabled && setting.blinking && preDepartureActive;
        const phase = getLensBlinkPhase({
          now,
          lensIndex: index,
          rowIndex: this.rowIndex,
          synchronizeRows: this.state.synchronizeRows
        });
        lens.style.setProperty(
          "--lens-blink-duration",
          `${LENS_DEFAULTS.blinkInterval * 2}s`
        );
        lens.style.setProperty("--lens-blink-delay", `${-phase}s`);
        lens.classList.toggle(
          "is-on",
          setting.enabled && preDepartureActive
        );
        lens.classList.toggle("is-blinking", blinking);
        const light = lens.querySelector(":scope > .lens-light");
        if (light) {
          syncLensBlink(lens, light, {
            now,
            lensIndex: index,
            rowIndex: this.rowIndex,
            synchronizeRows: this.state.synchronizeRows,
            active: blinking
          });
        }
      });
    }
    clear() {
      return this.set("");
    }
    getValue() {
      return {
        lenses: this.state.lenses.map((setting) => ({ ...setting })),
        preDeparture: { ...this.state.preDeparture },
        synchronizeRows: this.state.synchronizeRows
      };
    }
    isSettled() {
      return true;
    }
    destroy() {
      this.element.replaceChildren();
      this.element.removeAttribute("aria-label");
    }
  };

  // src/platform/runtime.js
  var readPath = (state, path) => {
    const keys = Array.isArray(path) ? path : [path];
    return keys.reduce(
      (value, key) => value === void 0 || value === null ? void 0 : value[key],
      state
    );
  };
  var writePath = (state, path, value) => {
    const keys = Array.isArray(path) ? path : [path];
    let target = state;
    keys.slice(0, -1).forEach((key, index) => {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = typeof keys[index + 1] === "number" ? [] : {};
      }
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
  };
  var ComponentRegistry = class {
    constructor() {
      this.factories = /* @__PURE__ */ new Map();
    }
    register(type, factory) {
      if (!type || typeof factory !== "function") {
        throw new TypeError("Registrace komponenty vy\u017Eaduje typ a factory funkci.");
      }
      this.factories.set(type, factory);
      return this;
    }
    create(type, element, options = {}) {
      const factory = this.factories.get(type);
      if (!factory) {
        throw new Error(`Nezn\xE1m\xFD typ komponenty "${type}".`);
      }
      return factory(element, options);
    }
  };
  var createDefaultRegistry = ({ audio: audio2 = new SplitFlapAudio() } = {}) => {
    const registry = new ComponentRegistry();
    registry.register("split-flap", (element, options) => new SplitFlapDisplay(element, { ...options, audio: audio2 })).register("delay-flap", (element, options) => new DelayFlapDisplay(element, DELAY_VALUES, { ...options, audio: audio2 })).register("train-flap", (element, options) => new TrainFlapDisplay(element, TRAIN_TYPES, { ...options, audio: audio2 })).register("departure-time", (element, options) => new DepartureTimeDisplay(element, { ...options, audio: audio2 })).register("lens-display", (element, options) => new LensDisplay(element, options));
    return registry;
  };
  var BoardRuntime = class {
    constructor({
      root,
      slots,
      registry = createDefaultRegistry(),
      initialState = createEmptyBoardState(),
      flapTiming = FLAP_TIMING_DEFAULTS
    }) {
      if (!root) {
        throw new TypeError("BoardRuntime vy\u017Eaduje root element.");
      }
      this.root = root;
      this.slots = slots;
      this.registry = registry;
      this.initialState = cloneBoardState(initialState);
      this.flapTiming = normalizeFlapTiming(flapTiming);
      this.components = /* @__PURE__ */ new Map();
      this.listeners = /* @__PURE__ */ new Set();
      this.mounted = false;
    }
    mount() {
      if (this.mounted) {
        return this;
      }
      this.slots.forEach((definition) => {
        const element = definition.element || this.root.querySelector(definition.selector || `[data-board-slot="${definition.id}"]`);
        if (!element) {
          throw new Error(`Slot tabule "${definition.id}" nebyl nalezen.`);
        }
        const component = this.registry.create(
          definition.type,
          element,
          definition.type === "lens-display" ? definition.options || {} : {
            ...definition.options || {},
            timing: this.flapTiming
          }
        );
        this.components.set(definition.id, component);
      });
      this.mounted = true;
      this.setState(this.initialState, { immediate: true, notify: false });
      return this;
    }
    setState(state, { immediate = false, notify = true } = {}) {
      if (!this.mounted) {
        this.mount();
      }
      const nextState = cloneBoardState(state);
      this.slots.forEach((definition) => {
        const component = this.components.get(definition.id);
        const value = readPath(nextState, definition.statePath);
        if (immediate && typeof component.setImmediate === "function") {
          if (definition.type === "departure-time") {
            if (value === null) {
              if (typeof component.clearImmediate === "function") {
                component.clearImmediate();
              } else {
                component.clear();
              }
            } else {
              component.setImmediate(
                value.hours,
                value.minutes
              );
            }
          } else {
            component.setImmediate(value ?? "");
          }
          return;
        }
        if (definition.type === "departure-time") {
          if (value === null) {
            component.clear();
          } else {
            component.set(value.hours, value.minutes);
          }
        } else if (value === "" && typeof component.clear === "function") {
          component.clear();
        } else {
          component.set(value ?? "");
        }
      });
      if (notify) {
        this.notify();
      }
      return this.getState();
    }
    getState() {
      const state = createEmptyBoardState();
      this.slots.forEach((definition) => {
        const component = this.components.get(definition.id);
        if (!component || typeof component.getValue !== "function") {
          return;
        }
        writePath(state, definition.statePath, component.getValue());
      });
      return state;
    }
    isSettled() {
      return [...this.components.values()].every(
        (component) => typeof component.isSettled !== "function" || component.isSettled()
      );
    }
    getComponent(id) {
      return this.components.get(id);
    }
    setFlapTiming(timing) {
      this.flapTiming = normalizeFlapTiming(timing);
      this.components.forEach((component) => {
        component.setTiming?.(this.flapTiming);
      });
      return { ...this.flapTiming };
    }
    setDelayOffset(enabled) {
      this.components.forEach((component) => {
        component.setDelayOffset?.(enabled);
      });
      return normalizeDelayOffset(enabled);
    }
    getFlapTiming() {
      return { ...this.flapTiming };
    }
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener mus\xED b\xFDt funkce.");
      }
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      const state = this.getState();
      this.listeners.forEach((listener) => listener(state));
    }
    destroy() {
      this.listeners.clear();
      this.components.forEach((component) => component.destroy?.());
      this.components.clear();
      this.mounted = false;
    }
  };
  var createBoard = (options) => new BoardRuntime(options).mount();

  // src/platform/analog-clock.js
  var DEFAULT_CLOCK_OPTIONS = Object.freeze({
    size: 512,
    sweepingMinutes: false,
    sweepingSeconds: true,
    showNumerals: false,
    brandText: "",
    brandText2: "",
    secondHandEnabled: false,
    showMinuteLines: false
  });
  var AnalogClock = class {
    constructor(element, options = {}) {
      this.element = element;
      this.options = { ...DEFAULT_CLOCK_OPTIONS, ...options };
      this.mounted = false;
    }
    mount() {
      if (this.mounted) {
        return this;
      }
      const jquery = window.jQuery;
      if (!jquery?.fn?.thooClock) {
        throw new Error("AnalogClock vy\u017Eaduje na\u010Dten\xFD jquery.thooClock plugin.");
      }
      jquery(this.element).thooClock(this.options);
      this.mounted = true;
      return this;
    }
    redraw() {
      this.element?.redraw?.();
    }
    transitionNightMode() {
      if (typeof this.element?.transitionNightMode === "function") {
        this.element.transitionNightMode();
        return;
      }
      this.redraw();
    }
    destroy() {
      if (!this.mounted) {
        return;
      }
      this.element?.destroy?.();
      this.mounted = false;
    }
  };

  // src/platform/lighting-state.js
  var clamp2 = (value, minimum, maximum, fallback) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.min(maximum, Math.max(minimum, numericValue)) : fallback;
  };
  var validFade = (fade) => NIGHT_FADE_MODES.some((mode) => mode.value === fade) ? fade : "soft";
  var LEGACY_LIGHT_DEFAULTS = Object.freeze({
    "top-left": { enabled: true, variation: true, intensity: 100, speed: 45, fade: "soft" },
    "top-center": { enabled: true, variation: true, intensity: 85, speed: 60, fade: "slow" },
    "top-right": { enabled: true, variation: true, intensity: 55, speed: 45, fade: "flicker" },
    "bottom-left": { enabled: false, variation: false, intensity: 0, speed: 60, fade: "soft" },
    "bottom-right": { enabled: true, variation: true, intensity: 75, speed: 55, fade: "slow" }
  });
  var PREVIOUS_UNIFORM_DEFAULT = Object.freeze({
    enabled: true,
    variation: true,
    intensity: 100,
    speed: 45,
    fade: "soft"
  });
  var matchesLampSetting = (setting, legacy) => [
    "enabled",
    "variation",
    "intensity",
    "speed",
    "fade"
  ].every((key) => String(setting?.[key]) === String(legacy[key]));
  var isLegacyDefault = (id, setting) => {
    if (!setting || typeof setting !== "object") {
      return false;
    }
    if (matchesLampSetting(setting, PREVIOUS_UNIFORM_DEFAULT)) {
      return true;
    }
    const legacy = LEGACY_LIGHT_DEFAULTS[id];
    return Boolean(legacy) && matchesLampSetting(setting, legacy);
  };
  var cloneLampSetting = (setting) => ({
    id: setting.id,
    label: setting.label,
    enabled: Boolean(setting.enabled),
    variation: Boolean(setting.variation),
    intensity: Math.round(clamp2(setting.intensity, 0, 100, 0)),
    speed: Math.round(clamp2(setting.speed, 1, 120, 60) * 2) / 2,
    fade: validFade(setting.fade)
  });
  var LightingSettings = class {
    constructor({
      lampDefaults = NIGHT_LIGHT_DEFAULTS,
      initialLamps = {},
      initialClock = NIGHT_CLOCK_DEFAULTS
    } = {}) {
      this.lampDefaults = lampDefaults;
      this.settings = new Map(
        lampDefaults.map((defaultSetting) => {
          const storedSetting = initialLamps?.[defaultSetting.id] || {};
          const savedSetting = isLegacyDefault(
            defaultSetting.id,
            storedSetting
          ) ? {} : storedSetting;
          return [
            defaultSetting.id,
            cloneLampSetting({ ...defaultSetting, ...savedSetting })
          ];
        })
      );
      const clock = initialClock || {};
      const clockSource = clock.enabled === true && Number(clock.intensity) === 50 ? {} : clock;
      this.clockSettings = {
        enabled: typeof clockSource.enabled === "boolean" ? clockSource.enabled : NIGHT_CLOCK_DEFAULTS.enabled,
        intensity: Math.round(
          clamp2(
            clockSource.intensity,
            0,
            100,
            NIGHT_CLOCK_DEFAULTS.intensity
          )
        )
      };
    }
    getLampSettings() {
      const result = {};
      this.settings.forEach((setting, id) => {
        result[id] = { ...setting };
      });
      return result;
    }
    getClockSettings() {
      return { ...this.clockSettings };
    }
    updateLamp(id, patch) {
      const current = this.settings.get(id);
      if (!current) {
        throw new Error(`Nezn\xE1m\xE9 sv\u011Btlo "${id}".`);
      }
      const next = cloneLampSetting({ ...current, ...patch, id });
      this.settings.set(id, next);
      return { ...next };
    }
    setLampSettings(settings = {}) {
      this.settings.forEach((setting, id) => {
        if (settings[id]) {
          this.updateLamp(id, settings[id]);
        }
      });
    }
    reset() {
      this.settings = new Map(
        this.lampDefaults.map((setting) => [
          setting.id,
          cloneLampSetting(setting)
        ])
      );
      this.clockSettings = { ...NIGHT_CLOCK_DEFAULTS };
    }
    setClockLight(patch = {}) {
      this.clockSettings = {
        enabled: typeof patch.enabled === "boolean" ? patch.enabled : this.clockSettings.enabled,
        intensity: Math.round(
          clamp2(
            patch.intensity,
            0,
            100,
            this.clockSettings.intensity
          )
        )
      };
      return this.getClockSettings();
    }
  };

  // src/platform/night-lighting.js
  var randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  var NightLighting = class extends LightingSettings {
    constructor({
      root,
      clockBlock = root?.querySelector("#clockBlock"),
      lampDefaults = NIGHT_LIGHT_DEFAULTS,
      initialLamps = {},
      initialClock = NIGHT_CLOCK_DEFAULTS
    } = {}) {
      super({ lampDefaults, initialLamps, initialClock });
      if (!root) {
        throw new TypeError("NightLighting vy\u017Eaduje root element.");
      }
      this.root = root;
      this.document = root.ownerDocument;
      this.clockBlock = clockBlock;
      this.lightElements = new Map(
        Array.from(root.querySelectorAll(".night-light")).map((light) => [
          light.dataset.lightId,
          light
        ])
      );
      this.flickerTimers = /* @__PURE__ */ new Map();
      this.flickerTokens = /* @__PURE__ */ new Map();
      this.visibilityHandler = () => this.handleVisibilityChange();
      this.mounted = false;
    }
    mount() {
      if (this.mounted) {
        return this;
      }
      this.document.addEventListener("visibilitychange", this.visibilityHandler);
      this.handleVisibilityChange();
      this.applyClockVisual();
      this.settings.forEach((setting) => this.applyLampVisual(setting));
      this.root.classList.add("night-lighting-ready");
      this.mounted = true;
      return this;
    }
    handleVisibilityChange() {
      this.root.classList.toggle("page-hidden", this.document.hidden);
      this.syncFlicker();
    }
    setNightMode(isNight) {
      this.root.classList.toggle("night-mode", Boolean(isNight));
      this.syncFlicker();
    }
    isNightMode() {
      return this.root.classList.contains("night-mode");
    }
    updateLamp(id, patch) {
      const next = super.updateLamp(id, patch);
      this.applyLampVisual(next);
      return next;
    }
    reset() {
      super.reset();
      this.settings.forEach((setting) => this.applyLampVisual(setting));
      this.applyClockVisual();
    }
    setClockLight(patch = {}) {
      const settings = super.setClockLight(patch);
      this.applyClockVisual();
      return settings;
    }
    applyClockVisual() {
      if (!this.clockBlock) {
        return;
      }
      this.clockBlock.style.setProperty(
        "--clock-light-intensity",
        this.clockSettings.enabled ? String(this.clockSettings.intensity / 100) : "0"
      );
      this.clockBlock.style.setProperty(
        "--clock-light-enabled",
        this.clockSettings.enabled ? "1" : "0"
      );
    }
    applyLampVisual(setting) {
      const light = this.lightElements.get(setting.id);
      if (!light) {
        return;
      }
      light.style.setProperty(
        "--lamp-opacity",
        setting.enabled && setting.intensity > 0 ? String(setting.intensity / 100) : "0"
      );
      light.style.setProperty("--lamp-cycle", `${setting.speed}s`);
      light.dataset.fade = setting.fade;
      light.classList.toggle(
        "is-off",
        !setting.enabled || setting.intensity === 0
      );
      light.classList.toggle(
        "is-steady",
        !setting.variation || setting.fade === "none"
      );
      this.updateFlicker(setting);
    }
    stopFlicker(light) {
      const id = light.dataset.lightId;
      const timer2 = this.flickerTimers.get(id);
      this.flickerTokens.set(id, (this.flickerTokens.get(id) || 0) + 1);
      if (timer2 !== void 0) {
        this.document.defaultView.clearTimeout(timer2);
        this.flickerTimers.delete(id);
      }
      light.style.removeProperty("--lamp-flicker-brightness");
      light.style.removeProperty("--lamp-flicker-opacity");
      light.style.removeProperty("--lamp-flicker-transition");
    }
    updateFlicker(setting) {
      const light = this.lightElements.get(setting.id);
      if (!light) {
        return;
      }
      this.stopFlicker(light);
      const reducedMotion = this.document.defaultView.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (this.document.hidden || !this.isNightMode() || !setting.enabled || setting.intensity <= 0 || !setting.variation || setting.fade !== "flicker" || reducedMotion) {
        return;
      }
      const token = (this.flickerTokens.get(setting.id) || 0) + 1;
      this.flickerTokens.set(setting.id, token);
      const flicker = () => {
        if (this.flickerTokens.get(setting.id) !== token) {
          return;
        }
        const isDip = Math.random() < 0.24;
        light.style.setProperty(
          "--lamp-flicker-brightness",
          String(isDip ? randomBetween(0.72, 0.88) : randomBetween(0.94, 1.03))
        );
        light.style.setProperty(
          "--lamp-flicker-opacity",
          String(isDip ? randomBetween(0.28, 0.46) : randomBetween(0.48, 0.66))
        );
        light.style.setProperty(
          "--lamp-flicker-transition",
          `${randomBetween(90, 360).toFixed(0)}ms`
        );
        const cycleDuration = Math.max(1, setting.speed) * 1e3;
        const delay = cycleDuration * randomBetween(0.08, 0.22);
        this.flickerTimers.set(
          setting.id,
          this.document.defaultView.setTimeout(flicker, Math.max(220, delay))
        );
      };
      flicker();
    }
    syncFlicker() {
      this.settings.forEach((setting) => this.updateFlicker(setting));
    }
    destroy() {
      this.flickerTimers.forEach(
        (timer2) => this.document.defaultView.clearTimeout(timer2)
      );
      this.flickerTimers.clear();
      this.document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.settings.forEach((setting) => {
        const light = this.lightElements.get(setting.id);
        if (light) {
          this.stopFlicker(light);
        }
      });
      this.root.classList.remove("night-lighting-ready");
      this.mounted = false;
    }
  };

  // src/platform/storage.js
  var LocalStorageAdapter = class {
    constructor(key, storage3) {
      this.key = key;
      if (storage3 !== void 0) {
        this.storage = storage3;
        return;
      }
      try {
        this.storage = window.localStorage;
      } catch {
        this.storage = null;
      }
    }
    load() {
      if (!this.storage) {
        return null;
      }
      try {
        const raw = this.storage.getItem(this.key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    save(value) {
      if (!this.storage) {
        return;
      }
      try {
        this.storage.setItem(this.key, JSON.stringify(value));
      } catch {
      }
    }
    clear() {
      if (!this.storage) {
        return;
      }
      try {
        this.storage.removeItem(this.key);
      } catch {
      }
    }
  };

  // src/platform/board-transport.js
  var BOARD_TRANSPORT_CHANNEL = "pragotron.platformTable.channel.v2";
  var BOARD_TRANSPORT_STORAGE_KEY = "pragotron.platformTable.transport.v2";
  var BOARD_HUB_STORAGE_KEY = "pragotron.boardHub.v1";
  var normalizeRelayAddress = (value) => {
    const text = String(value || "").trim();
    const mapped = text.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    const address = mapped ? mapped[1] : text;
    if (!address || address.length > 64) {
      return "";
    }
    if (!/^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(address)) {
      return "";
    }
    return address;
  };
  var loopbackHost = (host) => {
    const text = String(host || "");
    if (text === "localhost" || text.startsWith("localhost:")) {
      return `127.0.0.1${text.slice("localhost".length)}`;
    }
    if (text === "::1" || text === "[::1]") {
      return "127.0.0.1";
    }
    if (text.startsWith("[::1]:")) {
      return `127.0.0.1${text.slice("[::1]".length)}`;
    }
    return text;
  };
  var hubToChannelUrl = (hub, base) => {
    const url = new URL(hub, base);
    if (url.protocol === "https:" || url.protocol === "wss:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:" || url.protocol === "ws:") {
      url.protocol = "ws:";
    } else {
      return "";
    }
    if (url.hostname === "localhost" || url.hostname === "::1") {
      url.hostname = "127.0.0.1";
    }
    url.username = "";
    url.password = "";
    url.pathname = "/api/board-channel";
    url.search = "";
    url.hash = "";
    return url.toString();
  };
  var resolveBoardChannelUrl = (location = globalThis.location) => {
    if (!location || typeof location.protocol !== "string") {
      return "";
    }
    const hubQuery = new URLSearchParams(location.search || "").get("hub")?.trim() || "";
    if (hubQuery) {
      try {
        globalThis.sessionStorage?.setItem(BOARD_HUB_STORAGE_KEY, hubQuery);
      } catch {
      }
      try {
        return hubToChannelUrl(hubQuery, location.href || "http://127.0.0.1");
      } catch {
        return "";
      }
    }
    if (location.protocol === "http:" || location.protocol === "https:") {
      const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${loopbackHost(location.host)}/api/board-channel`;
    }
    let storedHub = "";
    try {
      storedHub = globalThis.sessionStorage?.getItem(BOARD_HUB_STORAGE_KEY) || "";
    } catch {
      storedHub = "";
    }
    if (!storedHub) {
      return "";
    }
    try {
      return hubToChannelUrl(storedHub, "http://127.0.0.1");
    } catch {
      return "";
    }
  };
  var createId = (prefix) => {
    const random = globalThis.crypto?.randomUUID?.();
    return `${prefix}-${random || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  };
  var getStorage = (storage3) => {
    if (storage3 !== void 0) {
      return storage3;
    }
    try {
      return globalThis.window?.localStorage || null;
    } catch {
      return null;
    }
  };
  var BoardTransport = class {
    constructor({
      channelName = BOARD_TRANSPORT_CHANNEL,
      storageKey = BOARD_TRANSPORT_STORAGE_KEY,
      storage: storage3,
      windowRef = globalThis.window,
      boardId = "",
      onLog = null
    } = {}) {
      this.id = createId("client");
      this.boardId = typeof boardId === "string" ? boardId : "";
      this.onLog = typeof onLog === "function" ? onLog : null;
      this.storageKey = storageKey;
      this.storage = getStorage(storage3);
      this.window = windowRef;
      this.listeners = /* @__PURE__ */ new Set();
      this.seenMessages = /* @__PURE__ */ new Set();
      this.channel = null;
      this.socket = null;
      this.socketUrl = "";
      this.socketRetryMs = 1e3;
      this.socketTimer = null;
      this.pendingSocketMessages = [];
      this.localPeers = /* @__PURE__ */ new Map();
      this.deliveryListeners = /* @__PURE__ */ new Set();
      this.closed = false;
      const BroadcastChannelConstructor = this.window?.BroadcastChannel || globalThis.BroadcastChannel;
      if (typeof BroadcastChannelConstructor === "function") {
        try {
          this.channel = new BroadcastChannelConstructor(channelName);
          this.channel.addEventListener(
            "message",
            (event) => this.receive(event.data)
          );
        } catch {
          this.channel = null;
        }
      }
      this.storageHandler = (event) => {
        if (event.key !== this.storageKey || !event.newValue) {
          return;
        }
        try {
          this.receive(JSON.parse(event.newValue));
        } catch {
        }
      };
      this.window?.addEventListener("storage", this.storageHandler);
      this.connectSocket();
    }
    connectSocket() {
      this.socketUrl = resolveBoardChannelUrl();
      if (!this.socketUrl || typeof WebSocket !== "function" || this.closed) {
        return;
      }
      const socket = new WebSocket(this.socketUrl);
      this.socket = socket;
      socket.addEventListener("open", () => {
        if (this.socket !== socket) {
          return;
        }
        this.socketRetryMs = 1e3;
        this.logExchange("spojen\xED nav\xE1z\xE1no", {
          url: this.socketUrl
        });
        const queued = this.pendingSocketMessages.splice(0);
        queued.forEach((text) => {
          try {
            socket.send(text);
          } catch {
            this.pendingSocketMessages.push(text);
          }
        });
      });
      socket.addEventListener("message", (event) => {
        if (this.socket !== socket || typeof event.data !== "string") {
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          const relay = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed.relay : null;
          if (parsed && typeof parsed === "object") {
            delete parsed.relay;
          }
          this.receive(parsed, {
            channel: "network",
            network: normalizeRelayAddress(relay?.localAddress),
            client: normalizeRelayAddress(relay?.remoteAddress)
          });
        } catch {
        }
      });
      const scheduleReconnect = () => {
        if (this.closed || this.socket !== socket) {
          return;
        }
        this.socket = null;
        const delay = this.socketRetryMs;
        this.socketRetryMs = Math.min(delay * 2, 15e3);
        this.logExchange("spojen\xED uzav\u0159eno", {
          url: this.socketUrl,
          dal\u0161\u00EDPokusZaMs: delay
        });
        this.socketTimer = this.window?.setTimeout?.(() => {
          this.socketTimer = null;
          this.connectSocket();
        }, delay) ?? null;
      };
      socket.addEventListener("close", scheduleReconnect);
      socket.addEventListener("error", () => {
        socket.close();
      });
    }
    sendToSocket(message) {
      if (!this.socketUrl) {
        return;
      }
      const text = JSON.stringify(message);
      const socketOpen = typeof WebSocket === "function" ? WebSocket.OPEN : 1;
      if (this.socket?.readyState === socketOpen) {
        try {
          this.socket.send(text);
          return;
        } catch {
        }
      }
      this.pendingSocketMessages.push(text);
      if (this.pendingSocketMessages.length > 50) {
        this.pendingSocketMessages.shift();
      }
    }
    remember(messageId) {
      this.seenMessages.add(messageId);
      if (this.seenMessages.size > 500) {
        const oldest = this.seenMessages.values().next().value;
        this.seenMessages.delete(oldest);
      }
    }
    noteLocalPeer(source) {
      const now = Date.now();
      this.localPeers.set(source, now);
      this.localPeers.forEach((seenAt, peer) => {
        if (now - seenAt > 12e3) {
          this.localPeers.delete(peer);
        }
      });
    }
    isLocalPeer(source) {
      const seenAt = this.localPeers.get(source);
      return typeof seenAt === "number" && Date.now() - seenAt <= 12e3;
    }
    deliveryFor(source, route) {
      if (route?.channel !== "network" || this.isLocalPeer(source)) {
        return { channel: "local" };
      }
      return {
        channel: "network",
        network: route.network || "",
        client: route.client || ""
      };
    }
    receive(message, route = { channel: "local" }) {
      if (!message || message.version !== 2 || typeof message.messageId !== "string" || message.source === this.id) {
        return;
      }
      if (route.channel !== "network") {
        this.noteLocalPeer(message.source);
      }
      const delivery = this.deliveryFor(message.source, route);
      if (this.seenMessages.has(message.messageId)) {
        if (route.channel !== "network") {
          this.deliveryListeners.forEach((listener) => {
            listener(message.source, delivery);
          });
        }
        return;
      }
      if (message.target?.source && message.target.source !== this.id) {
        return;
      }
      if (message.target?.boardId && message.target.boardId !== this.boardId) {
        return;
      }
      this.remember(message.messageId);
      const delivered = {
        ...message,
        delivery
      };
      delete delivered.relay;
      this.logExchange("p\u0159ijato", {
        typ: delivered.type,
        od: delivered.source,
        komu: delivered.target?.source || delivered.target?.boardId || "tato tabule",
        kan\u00E1l: delivery.channel === "network" ? `s\xED\u0165 ${delivery.network || "\u2014"}${delivery.client ? `, po\u010D\xEDta\u010D ${delivery.client}` : ""}` : "lok\xE1ln\u011B",
        requestId: delivered.requestId,
        data: delivered.payload
      });
      this.listeners.forEach((listener) => listener(delivered));
    }
    logExchange(direction, details) {
      const now = /* @__PURE__ */ new Date();
      const stamp = `${now.toLocaleTimeString("cs-CZ", { hour12: false })}.${String(now.getMilliseconds()).padStart(3, "0")}`;
      const line = `[pragotron] ${stamp} ${direction}`;
      console.info(line, details);
      if (this.onLog) {
        try {
          this.onLog(line, details);
        } catch {
        }
      }
    }
    publish(type, payload = {}, requestIdOrOptions) {
      const options = requestIdOrOptions && typeof requestIdOrOptions === "object" ? requestIdOrOptions : { requestId: requestIdOrOptions };
      const requestId = options.requestId || createId("request");
      const message = {
        version: 2,
        messageId: createId("message"),
        requestId,
        source: this.id,
        type,
        payload,
        sentAt: Date.now()
      };
      if (options.target) {
        message.target = {
          ...options.target
        };
      }
      this.remember(message.messageId);
      this.logExchange("odesl\xE1no", {
        typ: type,
        od: this.id,
        komu: message.target?.source || message.target?.boardId || "v\u0161ichni",
        requestId,
        data: payload
      });
      try {
        this.channel?.postMessage(message);
      } catch {
      }
      this.sendToSocket(message);
      const protocol = this.window?.location?.protocol;
      const mirrorToStorage = !this.channel || protocol === "file:";
      if (mirrorToStorage) {
        try {
          this.storage?.setItem(this.storageKey, JSON.stringify(message));
        } catch {
        }
      }
      return requestId;
    }
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener transportu mus\xED b\xFDt funkce.");
      }
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    subscribeDelivery(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener transportu mus\xED b\xFDt funkce.");
      }
      this.deliveryListeners.add(listener);
      return () => this.deliveryListeners.delete(listener);
    }
    close() {
      this.closed = true;
      this.listeners.clear();
      this.deliveryListeners.clear();
      this.localPeers.clear();
      this.pendingSocketMessages = [];
      if (this.socketTimer !== null) {
        this.window?.clearTimeout?.(this.socketTimer);
        this.socketTimer = null;
      }
      this.window?.removeEventListener("storage", this.storageHandler);
      this.channel?.close();
      this.channel = null;
      this.socket?.close();
      this.socket = null;
    }
  };

  // src/platform/board-identity.js
  var BOARD_IDENTITY_STORAGE_KEY = "pragotron.platformTable.boardIdentity.v1";
  var IDENTITY_FIELDS = Object.freeze([
    "platform",
    "track",
    "sector"
  ]);
  var getSessionStorage = (storage3) => {
    if (storage3 !== void 0) {
      return storage3;
    }
    try {
      return globalThis.window?.sessionStorage || null;
    } catch {
      return null;
    }
  };
  var cleanValue = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
  var normalizeBoardIdentity = (value = {}) => ({
    platform: cleanValue(value.platform),
    track: cleanValue(value.track),
    sector: cleanValue(value.sector)
  });
  var getBoardIdentityKey = (identity) => {
    const normalized = normalizeBoardIdentity(identity);
    return JSON.stringify([
      normalized.platform,
      normalized.track,
      normalized.sector
    ]);
  };
  var identitiesMatch = (boardIdentity2, targetIdentity, profile = getActiveStationProfile()) => {
    const board2 = normalizeBoardIdentity(boardIdentity2);
    const target = normalizeBoardIdentity(targetIdentity);
    if (!target.platform || !target.track) {
      return false;
    }
    if (board2.platform !== target.platform || board2.track !== target.track) {
      return false;
    }
    if (!target.sector || !board2.sector) {
      return true;
    }
    return sectorsOverlap(board2.sector, target.sector, profile);
  };
  var loadBoardIdentity = ({
    location = globalThis.window?.location,
    storage: storageOption,
    fallback = {}
  } = {}) => {
    const storage3 = getSessionStorage(storageOption);
    let saved = {};
    try {
      const raw = storage3?.getItem(BOARD_IDENTITY_STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : {};
    } catch {
      saved = {};
    }
    const params = new URLSearchParams(location?.search || "");
    const hasPlatformOrTrackParam = params.has("platform") || params.has("track");
    const hasAnyParam = IDENTITY_FIELDS.some((field) => params.has(field));
    const urlIdentity = hasAnyParam ? {
      platform: params.has("platform") ? params.get("platform") : hasPlatformOrTrackParam ? "" : saved.platform,
      track: params.has("track") ? params.get("track") : hasPlatformOrTrackParam ? "" : saved.track,
      sector: params.has("sector") ? params.get("sector") : hasPlatformOrTrackParam ? "" : saved.sector
    } : null;
    const identity = normalizeBoardIdentity(
      urlIdentity || saved || fallback
    );
    if (urlIdentity) {
      saveBoardIdentity(identity, storage3);
    }
    return identity;
  };
  var saveBoardIdentity = (identity, storageOption) => {
    const storage3 = getSessionStorage(storageOption);
    const normalized = normalizeBoardIdentity(identity);
    try {
      storage3?.setItem(
        BOARD_IDENTITY_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch {
    }
    return normalized;
  };

  // node_modules/sunrise-sunset-js/dist/index.js
  var PI = Math.PI;
  var SUN_RADIUS = 0.26667;
  var REFRACTION_CORRECTION = 0.5667;
  var L_SUBCOUNT = [
    64,
    34,
    20,
    7,
    3,
    1
  ];
  var B_SUBCOUNT = [5, 2];
  var R_SUBCOUNT = [
    40,
    10,
    6,
    2,
    1
  ];
  var INVALID_VALUE = -99999;
  var L_TERMS = [
    [
      [
        175347046,
        0,
        0
      ],
      [
        3341656,
        4.6692568,
        6283.07585
      ],
      [
        34894,
        4.6261,
        12566.1517
      ],
      [
        3497,
        2.7441,
        5753.3849
      ],
      [
        3418,
        2.8289,
        3.5231
      ],
      [
        3136,
        3.6277,
        77713.7715
      ],
      [
        2676,
        4.4181,
        7860.4194
      ],
      [
        2343,
        6.1352,
        3930.2097
      ],
      [
        1324,
        0.7425,
        11506.7698
      ],
      [
        1273,
        2.0371,
        529.691
      ],
      [
        1199,
        1.1096,
        1577.3435
      ],
      [
        990,
        5.233,
        5884.927
      ],
      [
        902,
        2.045,
        26.298
      ],
      [
        857,
        3.508,
        398.149
      ],
      [
        780,
        1.179,
        5223.694
      ],
      [
        753,
        2.533,
        5507.553
      ],
      [
        505,
        4.583,
        18849.228
      ],
      [
        492,
        4.205,
        775.523
      ],
      [
        357,
        2.92,
        0.067
      ],
      [
        317,
        5.849,
        11790.629
      ],
      [
        284,
        1.899,
        796.298
      ],
      [
        271,
        0.315,
        10977.079
      ],
      [
        243,
        0.345,
        5486.778
      ],
      [
        206,
        4.806,
        2544.314
      ],
      [
        205,
        1.869,
        5573.143
      ],
      [
        202,
        2.458,
        6069.777
      ],
      [
        156,
        0.833,
        213.299
      ],
      [
        132,
        3.411,
        2942.463
      ],
      [
        126,
        1.083,
        20.775
      ],
      [
        115,
        0.645,
        0.98
      ],
      [
        103,
        0.636,
        4694.003
      ],
      [
        102,
        0.976,
        15720.839
      ],
      [
        102,
        4.267,
        7.114
      ],
      [
        99,
        6.21,
        2146.17
      ],
      [
        98,
        0.68,
        155.42
      ],
      [
        86,
        5.98,
        161000.69
      ],
      [
        85,
        1.3,
        6275.96
      ],
      [
        85,
        3.67,
        71430.7
      ],
      [
        80,
        1.81,
        17260.15
      ],
      [
        79,
        3.04,
        12036.46
      ],
      [
        75,
        1.76,
        5088.63
      ],
      [
        74,
        3.5,
        3154.69
      ],
      [
        74,
        4.68,
        801.82
      ],
      [
        70,
        0.83,
        9437.76
      ],
      [
        62,
        3.98,
        8827.39
      ],
      [
        61,
        1.82,
        7084.9
      ],
      [
        57,
        2.78,
        6286.6
      ],
      [
        56,
        4.39,
        14143.5
      ],
      [
        56,
        3.47,
        6279.55
      ],
      [
        52,
        0.19,
        12139.55
      ],
      [
        52,
        1.33,
        1748.02
      ],
      [
        51,
        0.28,
        5856.48
      ],
      [
        49,
        0.49,
        1194.45
      ],
      [
        41,
        5.37,
        8429.24
      ],
      [
        41,
        2.4,
        19651.05
      ],
      [
        39,
        6.17,
        10447.39
      ],
      [
        37,
        6.04,
        10213.29
      ],
      [
        37,
        2.57,
        1059.38
      ],
      [
        36,
        1.71,
        2352.87
      ],
      [
        36,
        1.78,
        6812.77
      ],
      [
        33,
        0.59,
        17789.85
      ],
      [
        30,
        0.44,
        83996.85
      ],
      [
        30,
        2.74,
        1349.87
      ],
      [
        25,
        3.16,
        4690.48
      ]
    ],
    [
      [
        628331966747,
        0,
        0
      ],
      [
        206059,
        2.678235,
        6283.07585
      ],
      [
        4303,
        2.6351,
        12566.1517
      ],
      [
        425,
        1.59,
        3.523
      ],
      [
        119,
        5.796,
        26.298
      ],
      [
        109,
        2.966,
        1577.344
      ],
      [
        93,
        2.59,
        18849.23
      ],
      [
        72,
        1.14,
        529.69
      ],
      [
        68,
        1.87,
        398.15
      ],
      [
        67,
        4.41,
        5507.55
      ],
      [
        59,
        2.89,
        5223.69
      ],
      [
        56,
        2.17,
        155.42
      ],
      [
        45,
        0.4,
        796.3
      ],
      [
        36,
        0.47,
        775.52
      ],
      [
        29,
        2.65,
        7.11
      ],
      [
        21,
        5.34,
        0.98
      ],
      [
        19,
        1.85,
        5486.78
      ],
      [
        19,
        4.97,
        213.3
      ],
      [
        17,
        2.99,
        6275.96
      ],
      [
        16,
        0.03,
        2544.31
      ],
      [
        16,
        1.43,
        2146.17
      ],
      [
        15,
        1.21,
        10977.08
      ],
      [
        12,
        2.83,
        1748.02
      ],
      [
        12,
        3.26,
        5088.63
      ],
      [
        12,
        5.27,
        1194.45
      ],
      [
        12,
        2.08,
        4694
      ],
      [
        11,
        0.77,
        553.57
      ],
      [
        10,
        1.3,
        6286.6
      ],
      [
        10,
        4.24,
        1349.87
      ],
      [
        9,
        2.7,
        242.73
      ],
      [
        9,
        5.64,
        951.72
      ],
      [
        8,
        5.3,
        2352.87
      ],
      [
        6,
        2.65,
        9437.76
      ],
      [
        6,
        4.67,
        4690.48
      ]
    ],
    [
      [
        52919,
        0,
        0
      ],
      [
        8720,
        1.0721,
        6283.0758
      ],
      [
        309,
        0.867,
        12566.152
      ],
      [
        27,
        0.05,
        3.52
      ],
      [
        16,
        5.19,
        26.3
      ],
      [
        16,
        3.68,
        155.42
      ],
      [
        10,
        0.76,
        18849.23
      ],
      [
        9,
        2.06,
        77713.77
      ],
      [
        7,
        0.83,
        775.52
      ],
      [
        5,
        4.66,
        1577.34
      ],
      [
        4,
        1.03,
        7.11
      ],
      [
        4,
        3.44,
        5573.14
      ],
      [
        3,
        5.14,
        796.3
      ],
      [
        3,
        6.05,
        5507.55
      ],
      [
        3,
        1.19,
        242.73
      ],
      [
        3,
        6.12,
        529.69
      ],
      [
        3,
        0.31,
        398.15
      ],
      [
        3,
        2.28,
        553.57
      ],
      [
        2,
        4.38,
        5223.69
      ],
      [
        2,
        3.75,
        0.98
      ]
    ],
    [
      [
        289,
        5.844,
        6283.076
      ],
      [
        35,
        0,
        0
      ],
      [
        17,
        5.49,
        12566.15
      ],
      [
        3,
        5.2,
        155.42
      ],
      [
        1,
        4.72,
        3.52
      ],
      [
        1,
        5.3,
        18849.23
      ],
      [
        1,
        5.97,
        242.73
      ]
    ],
    [
      [
        114,
        3.142,
        0
      ],
      [
        8,
        4.13,
        6283.08
      ],
      [
        1,
        3.84,
        12566.15
      ]
    ],
    [[
      1,
      3.14,
      0
    ]]
  ];
  var B_TERMS = [[
    [
      280,
      3.199,
      84334.662
    ],
    [
      102,
      5.422,
      5507.553
    ],
    [
      80,
      3.88,
      5223.69
    ],
    [
      44,
      3.7,
      2352.87
    ],
    [
      32,
      4,
      1577.34
    ]
  ], [[
    9,
    3.9,
    5507.55
  ], [
    6,
    1.73,
    5223.69
  ]]];
  var R_TERMS = [
    [
      [
        100013989,
        0,
        0
      ],
      [
        1670700,
        3.0984635,
        6283.07585
      ],
      [
        13956,
        3.05525,
        12566.1517
      ],
      [
        3084,
        5.1985,
        77713.7715
      ],
      [
        1628,
        1.1739,
        5753.3849
      ],
      [
        1576,
        2.8469,
        7860.4194
      ],
      [
        925,
        5.453,
        11506.77
      ],
      [
        542,
        4.564,
        3930.21
      ],
      [
        472,
        3.661,
        5884.927
      ],
      [
        346,
        0.964,
        5507.553
      ],
      [
        329,
        5.9,
        5223.694
      ],
      [
        307,
        0.299,
        5573.143
      ],
      [
        243,
        4.273,
        11790.629
      ],
      [
        212,
        5.847,
        1577.344
      ],
      [
        186,
        5.022,
        10977.079
      ],
      [
        175,
        3.012,
        18849.228
      ],
      [
        110,
        5.055,
        5486.778
      ],
      [
        98,
        0.89,
        6069.78
      ],
      [
        86,
        5.69,
        15720.84
      ],
      [
        86,
        1.27,
        161000.69
      ],
      [
        65,
        0.27,
        17260.15
      ],
      [
        63,
        0.92,
        529.69
      ],
      [
        57,
        2.01,
        83996.85
      ],
      [
        56,
        5.24,
        71430.7
      ],
      [
        49,
        3.25,
        2544.31
      ],
      [
        47,
        2.58,
        775.52
      ],
      [
        45,
        5.54,
        9437.76
      ],
      [
        43,
        6.01,
        6275.96
      ],
      [
        39,
        5.36,
        4694
      ],
      [
        38,
        2.39,
        8827.39
      ],
      [
        37,
        0.83,
        19651.05
      ],
      [
        37,
        4.9,
        12139.55
      ],
      [
        36,
        1.67,
        12036.46
      ],
      [
        35,
        1.84,
        2942.46
      ],
      [
        33,
        0.24,
        7084.9
      ],
      [
        32,
        0.18,
        5088.63
      ],
      [
        32,
        1.78,
        398.15
      ],
      [
        28,
        1.21,
        6286.6
      ],
      [
        28,
        1.9,
        6279.55
      ],
      [
        26,
        4.59,
        10447.39
      ]
    ],
    [
      [
        103019,
        1.10749,
        6283.07585
      ],
      [
        1721,
        1.0644,
        12566.1517
      ],
      [
        702,
        3.142,
        0
      ],
      [
        32,
        1.02,
        18849.23
      ],
      [
        31,
        2.84,
        5507.55
      ],
      [
        25,
        1.32,
        5223.69
      ],
      [
        18,
        1.42,
        1577.34
      ],
      [
        10,
        5.91,
        10977.08
      ],
      [
        9,
        1.42,
        6275.96
      ],
      [
        9,
        0.27,
        5486.78
      ]
    ],
    [
      [
        4359,
        5.7846,
        6283.0758
      ],
      [
        124,
        5.579,
        12566.152
      ],
      [
        12,
        3.14,
        0
      ],
      [
        9,
        3.63,
        77713.77
      ],
      [
        6,
        1.87,
        5573.14
      ],
      [
        3,
        5.47,
        18849.23
      ]
    ],
    [[
      145,
      4.273,
      6283.076
    ], [
      7,
      3.92,
      12566.15
    ]],
    [[
      4,
      2.56,
      6283.08
    ]]
  ];
  var Y_TERMS = [
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      -2,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      1,
      0,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      -2,
      1,
      0,
      2,
      2
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      -2,
      -1,
      0,
      2,
      2
    ],
    [
      -2,
      0,
      1,
      0,
      0
    ],
    [
      -2,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      -1,
      2,
      2
    ],
    [
      2,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      2,
      0,
      -1,
      2,
      2
    ],
    [
      0,
      0,
      -1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      -2,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      -2,
      2,
      1
    ],
    [
      2,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      2,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      -2,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      -2,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      -1,
      2,
      1
    ],
    [
      0,
      2,
      0,
      0,
      0
    ],
    [
      2,
      0,
      -1,
      0,
      1
    ],
    [
      -2,
      2,
      0,
      2,
      2
    ],
    [
      0,
      1,
      0,
      0,
      1
    ],
    [
      -2,
      0,
      1,
      0,
      1
    ],
    [
      0,
      -1,
      0,
      0,
      1
    ],
    [
      0,
      0,
      2,
      -2,
      0
    ],
    [
      2,
      0,
      -1,
      2,
      1
    ],
    [
      2,
      0,
      1,
      2,
      2
    ],
    [
      0,
      1,
      0,
      2,
      2
    ],
    [
      -2,
      1,
      1,
      0,
      0
    ],
    [
      0,
      -1,
      0,
      2,
      2
    ],
    [
      2,
      0,
      0,
      2,
      1
    ],
    [
      2,
      0,
      1,
      0,
      0
    ],
    [
      -2,
      0,
      2,
      2,
      2
    ],
    [
      -2,
      0,
      1,
      2,
      1
    ],
    [
      2,
      0,
      -2,
      0,
      1
    ],
    [
      2,
      0,
      0,
      0,
      1
    ],
    [
      0,
      -1,
      1,
      0,
      0
    ],
    [
      -2,
      -1,
      0,
      2,
      1
    ],
    [
      -2,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      2,
      2,
      1
    ],
    [
      -2,
      0,
      2,
      0,
      1
    ],
    [
      -2,
      1,
      0,
      2,
      1
    ],
    [
      0,
      0,
      1,
      -2,
      0
    ],
    [
      -1,
      0,
      1,
      0,
      0
    ],
    [
      -2,
      1,
      0,
      0,
      0
    ],
    [
      1,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      1,
      2,
      0
    ],
    [
      0,
      0,
      -2,
      2,
      2
    ],
    [
      -1,
      -1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      0,
      0
    ],
    [
      0,
      -1,
      1,
      2,
      2
    ],
    [
      2,
      -1,
      -1,
      2,
      2
    ],
    [
      0,
      0,
      3,
      2,
      2
    ],
    [
      2,
      -1,
      0,
      2,
      2
    ]
  ];
  var PE_TERMS = [
    [
      -171996,
      -174.2,
      92025,
      8.9
    ],
    [
      -13187,
      -1.6,
      5736,
      -3.1
    ],
    [
      -2274,
      -0.2,
      977,
      -0.5
    ],
    [
      2062,
      0.2,
      -895,
      0.5
    ],
    [
      1426,
      -3.4,
      54,
      -0.1
    ],
    [
      712,
      0.1,
      -7,
      0
    ],
    [
      -517,
      1.2,
      224,
      -0.6
    ],
    [
      -386,
      -0.4,
      200,
      0
    ],
    [
      -301,
      0,
      129,
      -0.1
    ],
    [
      217,
      -0.5,
      -95,
      0.3
    ],
    [
      -158,
      0,
      0,
      0
    ],
    [
      129,
      0.1,
      -70,
      0
    ],
    [
      123,
      0,
      -53,
      0
    ],
    [
      63,
      0,
      0,
      0
    ],
    [
      63,
      0.1,
      -33,
      0
    ],
    [
      -59,
      0,
      26,
      0
    ],
    [
      -58,
      -0.1,
      32,
      0
    ],
    [
      -51,
      0,
      27,
      0
    ],
    [
      48,
      0,
      0,
      0
    ],
    [
      46,
      0,
      -24,
      0
    ],
    [
      -38,
      0,
      16,
      0
    ],
    [
      -31,
      0,
      13,
      0
    ],
    [
      29,
      0,
      0,
      0
    ],
    [
      29,
      0,
      -12,
      0
    ],
    [
      26,
      0,
      0,
      0
    ],
    [
      -22,
      0,
      0,
      0
    ],
    [
      21,
      0,
      -10,
      0
    ],
    [
      17,
      -0.1,
      0,
      0
    ],
    [
      16,
      0,
      -8,
      0
    ],
    [
      -16,
      0.1,
      7,
      0
    ],
    [
      -15,
      0,
      9,
      0
    ],
    [
      -13,
      0,
      7,
      0
    ],
    [
      -12,
      0,
      6,
      0
    ],
    [
      11,
      0,
      0,
      0
    ],
    [
      -10,
      0,
      5,
      0
    ],
    [
      -8,
      0,
      3,
      0
    ],
    [
      7,
      0,
      -3,
      0
    ],
    [
      -7,
      0,
      0,
      0
    ],
    [
      -7,
      0,
      3,
      0
    ],
    [
      -7,
      0,
      3,
      0
    ],
    [
      6,
      0,
      0,
      0
    ],
    [
      6,
      0,
      -3,
      0
    ],
    [
      6,
      0,
      -3,
      0
    ],
    [
      -6,
      0,
      3,
      0
    ],
    [
      -6,
      0,
      3,
      0
    ],
    [
      5,
      0,
      0,
      0
    ],
    [
      -5,
      0,
      3,
      0
    ],
    [
      -5,
      0,
      3,
      0
    ],
    [
      -5,
      0,
      3,
      0
    ],
    [
      4,
      0,
      0,
      0
    ],
    [
      4,
      0,
      0,
      0
    ],
    [
      4,
      0,
      0,
      0
    ],
    [
      -4,
      0,
      0,
      0
    ],
    [
      -4,
      0,
      0,
      0
    ],
    [
      -4,
      0,
      0,
      0
    ],
    [
      3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ],
    [
      -3,
      0,
      0,
      0
    ]
  ];
  function deg2rad(degrees) {
    return PI / 180 * degrees;
  }
  function rad2deg(radians) {
    return 180 / PI * radians;
  }
  function limitDegrees(degrees) {
    let limited = degrees / 360;
    limited = 360 * (limited - Math.floor(limited));
    if (limited < 0) limited += 360;
    return limited;
  }
  function limitDegrees180(degrees) {
    let limited = degrees / 180;
    limited = 180 * (limited - Math.floor(limited));
    if (limited < 0) limited += 180;
    return limited;
  }
  function limitDegrees180pm(degrees) {
    let limited = degrees / 360;
    limited = 360 * (limited - Math.floor(limited));
    if (limited < -180) limited += 360;
    else if (limited > 180) limited -= 360;
    return limited;
  }
  function limitZero2one(value) {
    let limited = value - Math.floor(value);
    if (limited < 0) limited += 1;
    return limited;
  }
  function thirdOrderPolynomial(a, b, c, d, x) {
    return ((a * x + b) * x + c) * x + d;
  }
  function limitMinutes(minutes) {
    let limited = minutes;
    if (limited < -20) limited += 1440;
    else if (limited > 20) limited -= 1440;
    return limited;
  }
  function dayfracToLocalHr(dayfrac, timezone) {
    return 24 * limitZero2one(dayfrac + timezone / 24);
  }
  function fractionalHourToDate(year, month, day, fractionalHour, timezone) {
    if (!isFinite(fractionalHour)) return /* @__PURE__ */ new Date(NaN);
    const localMidnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const utcMilliseconds = Math.round((fractionalHour - timezone) * 36e5);
    return new Date(localMidnightUtc + utcMilliseconds);
  }
  var timeZoneDateTimeFormatters = /* @__PURE__ */ new Map();
  function getTimeZoneDateTimeFormatter(timezoneId) {
    let formatter = timeZoneDateTimeFormatters.get(timezoneId);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezoneId,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });
      timeZoneDateTimeFormatters.set(timezoneId, formatter);
    }
    return formatter;
  }
  function parseDateTimeComponents(date, formatter) {
    const values = /* @__PURE__ */ new Map();
    for (const part of formatter.formatToParts(date)) if (part.type !== "literal") values.set(part.type, part.value);
    return {
      year: parseInt(values.get("year") ?? "0", 10),
      month: parseInt(values.get("month") ?? "0", 10),
      day: parseInt(values.get("day") ?? "0", 10),
      hour: parseInt(values.get("hour") ?? "0", 10),
      minute: parseInt(values.get("minute") ?? "0", 10),
      second: parseInt(values.get("second") ?? "0", 10) + date.getUTCMilliseconds() / 1e3
    };
  }
  function getOffsetHoursFromComponents(date, components) {
    const wholeSeconds = Math.floor(components.second);
    const milliseconds = Math.round((components.second - wholeSeconds) * 1e3);
    return (Date.UTC(components.year, components.month - 1, components.day, components.hour, components.minute, wholeSeconds, milliseconds) - date.getTime()) / 36e5;
  }
  function julianDay(year, month, day, hour, minute, second, deltaUt1, timezone) {
    let y = year;
    let m = month;
    const dayDecimal = day + (hour - timezone + (minute + (second + deltaUt1) / 60) / 60) / 24;
    if (m < 3) {
      m += 12;
      y--;
    }
    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayDecimal - 1524.5;
    if (jd > 2299160) {
      const a = Math.floor(y / 100);
      jd += 2 - a + Math.floor(a / 4);
    }
    return jd;
  }
  function julianCentury(jd) {
    return (jd - 2451545) / 36525;
  }
  function julianEphemerisDay(jd, deltaT) {
    return jd + deltaT / 86400;
  }
  function julianEphemerisCentury(jde) {
    return (jde - 2451545) / 36525;
  }
  function julianEphemerisMillennium(jce) {
    return jce / 10;
  }
  function extractLocalDateComponents(date) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds() + date.getMilliseconds() / 1e3,
      timezone: -date.getTimezoneOffset() / 60
    };
  }
  function extractFixedOffsetDateComponents(date, timezone) {
    const shifted = new Date(date.getTime() + timezone * 36e5);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds() + shifted.getUTCMilliseconds() / 1e3
    };
  }
  function extractTimeZoneDateComponents(date, timezoneId) {
    return parseDateTimeComponents(date, getTimeZoneDateTimeFormatter(timezoneId));
  }
  function resolveDateTimeComponents(date, timezone, timezoneId) {
    if (timezone !== void 0) return {
      ...extractFixedOffsetDateComponents(date, timezone),
      timezone
    };
    if (timezoneId) try {
      const components = extractTimeZoneDateComponents(date, timezoneId);
      return {
        ...components,
        timezone: getOffsetHoursFromComponents(date, components)
      };
    } catch {
    }
    return extractLocalDateComponents(date);
  }
  function earthPeriodicTermSummation(terms, count, jme) {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += terms[i][0] * Math.cos(terms[i][1] + terms[i][2] * jme);
    return sum;
  }
  function earthValues(termSum, count, jme) {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += termSum[i] * Math.pow(jme, i);
    sum /= 1e8;
    return sum;
  }
  function earthHeliocentricLongitude(jme) {
    const sum = [];
    for (let i = 0; i < 6; i++) sum[i] = earthPeriodicTermSummation(L_TERMS[i], L_SUBCOUNT[i], jme);
    return limitDegrees(rad2deg(earthValues(sum, 6, jme)));
  }
  function earthHeliocentricLatitude(jme) {
    const sum = [];
    for (let i = 0; i < 2; i++) sum[i] = earthPeriodicTermSummation(B_TERMS[i], B_SUBCOUNT[i], jme);
    return rad2deg(earthValues(sum, 2, jme));
  }
  function earthRadiusVector(jme) {
    const sum = [];
    for (let i = 0; i < 5; i++) sum[i] = earthPeriodicTermSummation(R_TERMS[i], R_SUBCOUNT[i], jme);
    return earthValues(sum, 5, jme);
  }
  function geocentricLongitude(l) {
    let theta = l + 180;
    if (theta >= 360) theta -= 360;
    return theta;
  }
  function geocentricLatitude(b) {
    return -b;
  }
  function aberrationCorrection(r) {
    return -20.4898 / (3600 * r);
  }
  function apparentSunLongitude(theta, deltaPsi, deltaTau) {
    return theta + deltaPsi + deltaTau;
  }
  function geocentricRightAscension(lamda, epsilon, beta) {
    const lamdaRad = deg2rad(lamda);
    const epsilonRad = deg2rad(epsilon);
    return limitDegrees(rad2deg(Math.atan2(Math.sin(lamdaRad) * Math.cos(epsilonRad) - Math.tan(deg2rad(beta)) * Math.sin(epsilonRad), Math.cos(lamdaRad))));
  }
  function geocentricDeclination(beta, epsilon, lamda) {
    const betaRad = deg2rad(beta);
    const epsilonRad = deg2rad(epsilon);
    return rad2deg(Math.asin(Math.sin(betaRad) * Math.cos(epsilonRad) + Math.cos(betaRad) * Math.sin(epsilonRad) * Math.sin(deg2rad(lamda))));
  }
  function sunMeanLongitude(jme) {
    return limitDegrees(280.4664567 + jme * (360007.6982779 + jme * (0.03032028 + jme * (1 / 49931 + jme * (-1 / 15300 + jme * (-1 / 2e6))))));
  }
  function sunEquatorialHorizontalParallax(r) {
    return 8.794 / (3600 * r);
  }
  function meanElongationMoonSun(jce) {
    return thirdOrderPolynomial(1 / 189474, -19142e-7, 445267.11148, 297.85036, jce);
  }
  function meanAnomalySun(jce) {
    return thirdOrderPolynomial(-1 / 3e5, -1603e-7, 35999.05034, 357.52772, jce);
  }
  function meanAnomalyMoon(jce) {
    return thirdOrderPolynomial(1 / 56250, 86972e-7, 477198.867398, 134.96298, jce);
  }
  function argumentLatitudeMoon(jce) {
    return thirdOrderPolynomial(1 / 327270, -36825e-7, 483202.017538, 93.27191, jce);
  }
  function ascendingLongitudeMoon(jce) {
    return thirdOrderPolynomial(1 / 45e4, 20708e-7, -1934.136261, 125.04452, jce);
  }
  function xyTermSummation(i, x) {
    let sum = 0;
    for (let j = 0; j < 5; j++) sum += x[j] * Y_TERMS[i][j];
    return sum;
  }
  function nutationLongitudeAndObliquity(jce, x) {
    let sumPsi = 0;
    let sumEpsilon = 0;
    for (let i = 0; i < 63; i++) {
      const xyTermSum = deg2rad(xyTermSummation(i, x));
      sumPsi += (PE_TERMS[i][0] + jce * PE_TERMS[i][1]) * Math.sin(xyTermSum);
      sumEpsilon += (PE_TERMS[i][2] + jce * PE_TERMS[i][3]) * Math.cos(xyTermSum);
    }
    return {
      delPsi: sumPsi / 36e6,
      delEpsilon: sumEpsilon / 36e6
    };
  }
  function eclipticMeanObliquity(jme) {
    const u = jme / 10;
    return 84381.448 + u * (-4680.93 + u * (-1.55 + u * (1999.25 + u * (-51.38 + u * (-249.67 + u * (-39.05 + u * (7.12 + u * (27.87 + u * (5.79 + u * 2.45)))))))));
  }
  function eclipticTrueObliquity(deltaEpsilon, epsilon0) {
    return deltaEpsilon + epsilon0 / 3600;
  }
  function greenwichMeanSiderealTime(jd, jc) {
    return limitDegrees(280.46061837 + 360.98564736629 * (jd - 2451545) + jc * jc * (387933e-9 - jc / 3871e4));
  }
  function greenwichSiderealTime(nu0, deltaPsi, epsilon) {
    return nu0 + deltaPsi * Math.cos(deg2rad(epsilon));
  }
  function observerHourAngle(nu, longitude, alphaDeg) {
    return limitDegrees(nu + longitude - alphaDeg);
  }
  function rightAscensionParallaxAndTopocentricDec(latitude, elevation, xi, h, delta) {
    const latRad = deg2rad(latitude);
    const xiRad = deg2rad(xi);
    const hRad = deg2rad(h);
    const deltaRad = deg2rad(delta);
    const u = Math.atan(0.99664719 * Math.tan(latRad));
    const y = 0.99664719 * Math.sin(u) + elevation * Math.sin(latRad) / 6378140;
    const x = Math.cos(u) + elevation * Math.cos(latRad) / 6378140;
    const deltaAlphaRad = Math.atan2(-x * Math.sin(xiRad) * Math.sin(hRad), Math.cos(deltaRad) - x * Math.sin(xiRad) * Math.cos(hRad));
    const deltaPrime = rad2deg(Math.atan2((Math.sin(deltaRad) - y * Math.sin(xiRad)) * Math.cos(deltaAlphaRad), Math.cos(deltaRad) - x * Math.sin(xiRad) * Math.cos(hRad)));
    return {
      deltaAlpha: rad2deg(deltaAlphaRad),
      deltaPrime
    };
  }
  function topocentricRightAscension(alphaDeg, deltaAlpha) {
    return alphaDeg + deltaAlpha;
  }
  function topocentricLocalHourAngle(h, deltaAlpha) {
    return h - deltaAlpha;
  }
  function topocentricElevationAngle(latitude, deltaPrime, hPrime) {
    const latRad = deg2rad(latitude);
    const deltaPrimeRad = deg2rad(deltaPrime);
    return rad2deg(Math.asin(Math.sin(latRad) * Math.sin(deltaPrimeRad) + Math.cos(latRad) * Math.cos(deltaPrimeRad) * Math.cos(deg2rad(hPrime))));
  }
  function atmosphericRefractionCorrection(pressure, temperature, atmosphericRefraction, e0) {
    let delE = 0;
    if (e0 >= -1 * (0.26667 + atmosphericRefraction)) delE = pressure / 1010 * (283 / (273 + temperature)) * (1.02 / (60 * Math.tan(deg2rad(e0 + 10.3 / (e0 + 5.11)))));
    return delE;
  }
  function topocentricElevationAngleCorrected(e0, deltaE) {
    return e0 + deltaE;
  }
  function topocentricZenithAngle(e) {
    return 90 - e;
  }
  function topocentricAzimuthAngleAstro(hPrime, latitude, deltaPrime) {
    const hPrimeRad = deg2rad(hPrime);
    const latRad = deg2rad(latitude);
    return limitDegrees(rad2deg(Math.atan2(Math.sin(hPrimeRad), Math.cos(hPrimeRad) * Math.sin(latRad) - Math.tan(deg2rad(deltaPrime)) * Math.cos(latRad))));
  }
  function topocentricAzimuthAngle(azimuthAstro) {
    return limitDegrees(azimuthAstro + 180);
  }
  function surfaceIncidenceAngle(zenith, azimuthAstro, azimuthRotation, slope) {
    const zenithRad = deg2rad(zenith);
    const slopeRad = deg2rad(slope);
    return rad2deg(Math.acos(Math.cos(zenithRad) * Math.cos(slopeRad) + Math.sin(slopeRad) * Math.sin(zenithRad) * Math.cos(deg2rad(azimuthAstro - azimuthRotation))));
  }
  function sunHourAngleAtRiseSet(latitude, deltaZero, h0Prime) {
    const latitudeRad = deg2rad(latitude);
    const deltaZeroRad = deg2rad(deltaZero);
    const argument = (Math.sin(deg2rad(h0Prime)) - Math.sin(latitudeRad) * Math.sin(deltaZeroRad)) / (Math.cos(latitudeRad) * Math.cos(deltaZeroRad));
    if (Math.abs(argument) <= 1) return limitDegrees180(rad2deg(Math.acos(argument)));
    return INVALID_VALUE;
  }
  function approxSunTransitTime(alphaZero, longitude, nu) {
    return (alphaZero - longitude - nu) / 360;
  }
  function approxSunRiseAndSet(mRts, h0) {
    const h0Dfrac = h0 / 360;
    mRts[1] = limitZero2one(mRts[0] - h0Dfrac);
    mRts[2] = limitZero2one(mRts[0] + h0Dfrac);
    mRts[0] = limitZero2one(mRts[0]);
  }
  function rtsAlphaDeltaPrime(ad, n) {
    let a = ad[1] - ad[0];
    let b = ad[2] - ad[1];
    if (Math.abs(a) >= 2) a = limitZero2one(a);
    if (Math.abs(b) >= 2) b = limitZero2one(b);
    return ad[1] + n * (a + b + (b - a) * n) / 2;
  }
  function rtsSunAltitude(latitude, deltaPrime, hPrime) {
    const latitudeRad = deg2rad(latitude);
    const deltaPrimeRad = deg2rad(deltaPrime);
    return rad2deg(Math.asin(Math.sin(latitudeRad) * Math.sin(deltaPrimeRad) + Math.cos(latitudeRad) * Math.cos(deltaPrimeRad) * Math.cos(deg2rad(hPrime))));
  }
  function sunRiseAndSet(mRts, hRts, deltaPrime, latitude, hPrime, h0Prime, sun) {
    return mRts[sun] + (hRts[sun] - h0Prime) / (360 * Math.cos(deg2rad(deltaPrime[sun])) * Math.cos(deg2rad(latitude)) * Math.sin(deg2rad(hPrime[sun])));
  }
  function equationOfTime(m, alpha, delPsi, epsilon) {
    return limitMinutes(4 * (m - 57183e-7 - alpha + delPsi * Math.cos(deg2rad(epsilon))));
  }
  function calculateEotAndSunRiseTransitSet(spa, calculateRaDec) {
    const h0Prime = -1 * (SUN_RADIUS + spa.atmosphericRefraction);
    const sunRtsJd = julianDay(spa.year, spa.month, spa.day, 0, 0, 0, 0, 0);
    const nu = calculateRaDec(sunRtsJd, spa.deltaT).nu;
    const eot = equationOfTime(sunMeanLongitude(spa.jme), spa.alpha, spa.delPsi, spa.epsilon);
    const alpha = [];
    const delta = [];
    for (let i = 0; i < 3; i++) {
      const result = calculateRaDec(sunRtsJd + i - 1, spa.deltaT);
      alpha[i] = result.alpha;
      delta[i] = result.delta;
    }
    const mRts = [];
    mRts[0] = approxSunTransitTime(alpha[1], spa.longitude, nu);
    const h0 = sunHourAngleAtRiseSet(spa.latitude, delta[1], h0Prime);
    const polar = h0 === INVALID_VALUE;
    if (polar) mRts[0] = limitZero2one(mRts[0]);
    else approxSunRiseAndSet(mRts, h0);
    const nuRts = [];
    const hPrime = [];
    const alphaPrime = [];
    const deltaPrime = [];
    const hRts = [];
    const rtsCount = polar ? 1 : 3;
    for (let i = 0; i < rtsCount; i++) {
      nuRts[i] = nu + 360.985647 * mRts[i];
      const n = mRts[i] + spa.deltaT / 86400;
      alphaPrime[i] = rtsAlphaDeltaPrime(alpha, n);
      deltaPrime[i] = rtsAlphaDeltaPrime(delta, n);
      hPrime[i] = limitDegrees180pm(nuRts[i] + spa.longitude - alphaPrime[i]);
      hRts[i] = rtsSunAltitude(spa.latitude, deltaPrime[i], hPrime[i]);
    }
    const sta = hRts[0];
    const suntransit = dayfracToLocalHr(mRts[0] - hPrime[0] / 360, spa.timezone);
    if (polar) return {
      sunrise: INVALID_VALUE,
      suntransit,
      sunset: INVALID_VALUE,
      srha: INVALID_VALUE,
      ssha: INVALID_VALUE,
      sta,
      eot
    };
    const srha = hPrime[1];
    const ssha = hPrime[2];
    return {
      sunrise: dayfracToLocalHr(sunRiseAndSet(mRts, hRts, deltaPrime, spa.latitude, hPrime, h0Prime, 1), spa.timezone),
      suntransit,
      sunset: dayfracToLocalHr(sunRiseAndSet(mRts, hRts, deltaPrime, spa.latitude, hPrime, h0Prime, 2), spa.timezone),
      srha,
      ssha,
      sta,
      eot
    };
  }
  function createSpaData() {
    return {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
      deltaUt1: 0,
      deltaT: 67,
      timezone: 0,
      longitude: 0,
      latitude: 0,
      elevation: 0,
      pressure: 1013,
      temperature: 15,
      slope: 0,
      azimuthRotation: 0,
      atmosphericRefraction: REFRACTION_CORRECTION,
      timezoneId: "",
      function: 3,
      jd: 0,
      jc: 0,
      jde: 0,
      jce: 0,
      jme: 0,
      l: 0,
      b: 0,
      r: 0,
      theta: 0,
      beta: 0,
      x0: 0,
      x1: 0,
      x2: 0,
      x3: 0,
      x4: 0,
      delPsi: 0,
      delEpsilon: 0,
      epsilon0: 0,
      epsilon: 0,
      delTau: 0,
      lamda: 0,
      nu0: 0,
      nu: 0,
      alpha: 0,
      delta: 0,
      h: 0,
      xi: 0,
      delAlpha: 0,
      deltaPrime: 0,
      alphaPrime: 0,
      hPrime: 0,
      e0: 0,
      delE: 0,
      e: 0,
      eot: 0,
      srha: 0,
      ssha: 0,
      sta: 0,
      zenith: 0,
      azimuthAstro: 0,
      azimuth: 0,
      incidence: 0,
      suntransit: 0,
      sunrise: 0,
      sunset: 0
    };
  }
  function validateInputs(spa) {
    if (spa.year < -2e3 || spa.year > 6e3) return 1;
    if (spa.month < 1 || spa.month > 12) return 2;
    if (spa.day < 1 || spa.day > 31) return 3;
    if (spa.hour < 0 || spa.hour > 24) return 4;
    if (spa.minute < 0 || spa.minute > 59) return 5;
    if (spa.second < 0 || spa.second >= 60) return 6;
    if (spa.pressure < 0 || spa.pressure > 5e3) return 12;
    if (spa.temperature <= -273 || spa.temperature > 6e3) return 13;
    if (spa.deltaUt1 <= -1 || spa.deltaUt1 >= 1) return 17;
    if (spa.hour === 24 && spa.minute > 0) return 5;
    if (spa.hour === 24 && spa.second > 0) return 6;
    if (Math.abs(spa.deltaT) > 8e3) return 7;
    if (Math.abs(spa.timezone) > 18) return 8;
    if (Math.abs(spa.longitude) > 180) return 9;
    if (Math.abs(spa.latitude) > 90) return 10;
    if (Math.abs(spa.atmosphericRefraction) > 5) return 16;
    if (spa.elevation < -65e5) return 11;
    return 0;
  }
  function calculateGeocentricSunRaAndDec(spa) {
    spa.jc = julianCentury(spa.jd);
    spa.jde = julianEphemerisDay(spa.jd, spa.deltaT);
    spa.jce = julianEphemerisCentury(spa.jde);
    spa.jme = julianEphemerisMillennium(spa.jce);
    spa.l = earthHeliocentricLongitude(spa.jme);
    spa.b = earthHeliocentricLatitude(spa.jme);
    spa.r = earthRadiusVector(spa.jme);
    spa.theta = geocentricLongitude(spa.l);
    spa.beta = geocentricLatitude(spa.b);
    spa.x0 = meanElongationMoonSun(spa.jce);
    spa.x1 = meanAnomalySun(spa.jce);
    spa.x2 = meanAnomalyMoon(spa.jce);
    spa.x3 = argumentLatitudeMoon(spa.jce);
    spa.x4 = ascendingLongitudeMoon(spa.jce);
    const x = [
      spa.x0,
      spa.x1,
      spa.x2,
      spa.x3,
      spa.x4
    ];
    const nutation = nutationLongitudeAndObliquity(spa.jce, x);
    spa.delPsi = nutation.delPsi;
    spa.delEpsilon = nutation.delEpsilon;
    spa.epsilon0 = eclipticMeanObliquity(spa.jme);
    spa.epsilon = eclipticTrueObliquity(spa.delEpsilon, spa.epsilon0);
    spa.delTau = aberrationCorrection(spa.r);
    spa.lamda = apparentSunLongitude(spa.theta, spa.delPsi, spa.delTau);
    spa.nu0 = greenwichMeanSiderealTime(spa.jd, spa.jc);
    spa.nu = greenwichSiderealTime(spa.nu0, spa.delPsi, spa.epsilon);
    spa.alpha = geocentricRightAscension(spa.lamda, spa.epsilon, spa.beta);
    spa.delta = geocentricDeclination(spa.beta, spa.epsilon, spa.lamda);
  }
  function calculateRaDecForJd(jd, deltaT) {
    const jc = julianCentury(jd);
    const jce = julianEphemerisCentury(julianEphemerisDay(jd, deltaT));
    const jme = julianEphemerisMillennium(jce);
    const l = earthHeliocentricLongitude(jme);
    const b = earthHeliocentricLatitude(jme);
    const r = earthRadiusVector(jme);
    const theta = geocentricLongitude(l);
    const beta = geocentricLatitude(b);
    const nutation = nutationLongitudeAndObliquity(jce, [
      meanElongationMoonSun(jce),
      meanAnomalySun(jce),
      meanAnomalyMoon(jce),
      argumentLatitudeMoon(jce),
      ascendingLongitudeMoon(jce)
    ]);
    const epsilon0 = eclipticMeanObliquity(jme);
    const epsilon = eclipticTrueObliquity(nutation.delEpsilon, epsilon0);
    const delTau = aberrationCorrection(r);
    const lamda = apparentSunLongitude(theta, nutation.delPsi, delTau);
    const nu = greenwichSiderealTime(greenwichMeanSiderealTime(jd, jc), nutation.delPsi, epsilon);
    return {
      alpha: geocentricRightAscension(lamda, epsilon, beta),
      delta: geocentricDeclination(beta, epsilon, lamda),
      nu
    };
  }
  function spaCalculate(spa) {
    const result = validateInputs(spa);
    if (result !== 0) return result;
    spa.jd = julianDay(spa.year, spa.month, spa.day, spa.hour, spa.minute, spa.second, spa.deltaUt1, spa.timezone);
    calculateGeocentricSunRaAndDec(spa);
    spa.h = observerHourAngle(spa.nu, spa.longitude, spa.alpha);
    spa.xi = sunEquatorialHorizontalParallax(spa.r);
    const parallax = rightAscensionParallaxAndTopocentricDec(spa.latitude, spa.elevation, spa.xi, spa.h, spa.delta);
    spa.delAlpha = parallax.deltaAlpha;
    spa.deltaPrime = parallax.deltaPrime;
    spa.alphaPrime = topocentricRightAscension(spa.alpha, spa.delAlpha);
    spa.hPrime = topocentricLocalHourAngle(spa.h, spa.delAlpha);
    spa.e0 = topocentricElevationAngle(spa.latitude, spa.deltaPrime, spa.hPrime);
    spa.delE = atmosphericRefractionCorrection(spa.pressure, spa.temperature, spa.atmosphericRefraction, spa.e0);
    spa.e = topocentricElevationAngleCorrected(spa.e0, spa.delE);
    spa.zenith = topocentricZenithAngle(spa.e);
    spa.azimuthAstro = topocentricAzimuthAngleAstro(spa.hPrime, spa.latitude, spa.deltaPrime);
    spa.azimuth = topocentricAzimuthAngle(spa.azimuthAstro);
    if (spa.function === 1 || spa.function === 3) spa.incidence = surfaceIncidenceAngle(spa.zenith, spa.azimuthAstro, spa.azimuthRotation, spa.slope);
    if (spa.function === 2 || spa.function === 3) {
      const rts = calculateEotAndSunRiseTransitSet(spa, calculateRaDecForJd);
      spa.sunrise = rts.sunrise;
      spa.suntransit = rts.suntransit;
      spa.sunset = rts.sunset;
      spa.srha = rts.srha;
      spa.ssha = rts.ssha;
      spa.sta = rts.sta;
      spa.eot = rts.eot;
    }
    return 0;
  }
  function initSpaFromDate(date, latitude, longitude, options = {}) {
    const spa = createSpaData();
    const dateTime = resolveDateTimeComponents(date, options.timezone, options.timezoneId);
    spa.year = dateTime.year;
    spa.month = dateTime.month;
    spa.day = dateTime.day;
    spa.hour = dateTime.hour;
    spa.minute = dateTime.minute;
    spa.second = dateTime.second;
    spa.timezone = dateTime.timezone;
    spa.timezoneId = options.timezoneId ?? "";
    spa.latitude = latitude;
    spa.longitude = longitude;
    spa.elevation = options.elevation ?? 0;
    spa.pressure = options.pressure ?? 1013;
    spa.temperature = options.temperature ?? 15;
    spa.deltaUt1 = options.deltaUt1 ?? 0;
    spa.deltaT = options.deltaT ?? 67;
    spa.slope = options.slope ?? 0;
    spa.azimuthRotation = options.azimuthRotation ?? 0;
    spa.atmosphericRefraction = options.atmosphericRefraction ?? 0.5667;
    spa.function = 3;
    return spa;
  }
  function isValidSunTime(time) {
    return time !== -99999 && isFinite(time) && time >= 0;
  }
  function getSunrise(latitude, longitude, date = /* @__PURE__ */ new Date(), options) {
    const spa = initSpaFromDate(date, latitude, longitude, options);
    if (spaCalculate(spa) !== 0 || !isValidSunTime(spa.sunrise)) return null;
    return fractionalHourToDate(spa.year, spa.month, spa.day, spa.sunrise, spa.timezone);
  }
  function getSunset(latitude, longitude, date = /* @__PURE__ */ new Date(), options) {
    const spa = initSpaFromDate(date, latitude, longitude, options);
    if (spaCalculate(spa) !== 0 || !isValidSunTime(spa.sunset)) return null;
    return fractionalHourToDate(spa.year, spa.month, spa.day, spa.sunset, spa.timezone);
  }

  // src/platform/sun-schedule.js
  var BRATISLAVA_SUN_LOCATION = Object.freeze({
    name: "Bratislava",
    latitude: 48.1486,
    longitude: 17.1077,
    timezoneId: "Europe/Bratislava"
  });
  var FALLBACK_REFRESH_MS = 15 * 60 * 1e3;
  var MINIMUM_TIMER_DELAY_MS = 1e3;
  var isValidDate = (value) => value instanceof Date && Number.isFinite(value.getTime());
  var getCalculationDate = (value) => isValidDate(value) ? new Date(value.getTime()) : /* @__PURE__ */ new Date();
  var getOptions = (location) => location.timezoneId ? { timezoneId: location.timezoneId } : void 0;
  var calculateSunSchedule = (date = /* @__PURE__ */ new Date(), location = BRATISLAVA_SUN_LOCATION) => {
    const current = getCalculationDate(date);
    const options = getOptions(location);
    const sunrise = getSunrise(
      location.latitude,
      location.longitude,
      current,
      options
    );
    const sunset = getSunset(
      location.latitude,
      location.longitude,
      current,
      options
    );
    let isNight;
    if (isValidDate(sunrise) && isValidDate(sunset)) {
      isNight = current < sunrise || current >= sunset;
    } else if (isValidDate(sunrise)) {
      isNight = current < sunrise;
    } else if (isValidDate(sunset)) {
      isNight = current >= sunset;
    } else {
      isNight = true;
    }
    return {
      date: current,
      sunrise: isValidDate(sunrise) ? sunrise : null,
      sunset: isValidDate(sunset) ? sunset : null,
      isNight
    };
  };
  var addCalendarDay = (date) => {
    const nextDate = new Date(date.getTime());
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  };
  var SunSchedule = class {
    constructor({
      location = BRATISLAVA_SUN_LOCATION,
      onChange = () => {
      },
      timerApi = globalThis.window
    } = {}) {
      this.location = location;
      this.onChange = onChange;
      this.timerApi = timerApi || globalThis;
      this.timer = null;
      this.running = false;
      this.currentIsNight = null;
    }
    getState(date = /* @__PURE__ */ new Date()) {
      return calculateSunSchedule(date, this.location);
    }
    start() {
      if (this.running) {
        return this;
      }
      this.running = true;
      this.update();
      return this;
    }
    stop() {
      this.running = false;
      this.currentIsNight = null;
      if (this.timer !== null) {
        this.timerApi.clearTimeout(this.timer);
        this.timer = null;
      }
    }
    update(date = /* @__PURE__ */ new Date()) {
      if (!this.running) {
        return;
      }
      const state = this.getState(date);
      if (state.isNight !== this.currentIsNight) {
        this.currentIsNight = state.isNight;
        this.onChange(state.isNight, state);
      }
      this.scheduleNextBoundary(state);
    }
    scheduleNextBoundary(state) {
      if (!this.running) {
        return;
      }
      if (this.timer !== null) {
        this.timerApi.clearTimeout(this.timer);
        this.timer = null;
      }
      const now = state.date.getTime();
      const tomorrow = this.getState(addCalendarDay(state.date));
      const boundaries = [
        state.sunrise,
        state.sunset,
        tomorrow.sunrise,
        tomorrow.sunset
      ].filter(isValidDate).map((boundary) => boundary.getTime()).filter((time) => time > now).sort((first, second) => first - second);
      const nextBoundary = boundaries[0];
      const delay = nextBoundary === void 0 ? FALLBACK_REFRESH_MS : Math.max(
        MINIMUM_TIMER_DELAY_MS,
        nextBoundary - now + 50
      );
      this.timer = this.timerApi.setTimeout(() => {
        this.timer = null;
        this.update();
      }, delay);
    }
    destroy() {
      this.stop();
    }
  };

  // src/platform/live-departures.js
  var LIVE_SOURCE_ORIGIN = "https://provoz.spravazeleznic.cz";
  var LIVE_SOURCE_PATH = "/tabule/Pages/StationTable.aspx";
  var LIVE_STATION_DEFAULTS = Object.freeze({
    name: "Brno hlavn\xED n\xE1dra\u017E\xED",
    key: "455",
    sourceUrl: `${LIVE_SOURCE_ORIGIN}${LIVE_SOURCE_PATH}?Key=455`
  });
  var LIVE_SERVER_DEFAULT_PORT = 4787;
  var LIVE_SERVER_FALLBACK_PORTS = Object.freeze([
    LIVE_SERVER_DEFAULT_PORT,
    5174,
    3847,
    18787
  ]);
  var SOURCE_TRAIN_TYPES = Object.freeze([
    "Mim. Os",
    "Mim. R",
    "\u010CEDOK",
    "Eurocity",
    "Intercity",
    "SuperCity",
    "NightJet",
    "Nightjet",
    "Ex l\xF4\u017Ek.",
    "Ex miest.",
    "EuroNight",
    "railjet",
    "Railjet",
    "regiojet",
    "RegioJet",
    "Ex",
    "rj",
    "RJ",
    "EC",
    "IC",
    "EN",
    "NJ",
    "nj",
    "SC",
    "sc",
    "Os",
    "Sp",
    "R miest.",
    "ROH",
    "R"
  ]);
  var HTML_ENTITIES = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  });
  var LIVE_SCRAPER_SCHEMA = Object.freeze({
    id: "sprava-zeleznic",
    name: "Spr\xE1va \u017Eeleznic",
    description: "Odjezdy z tabule Spr\xE1vy \u017Eeleznic.",
    controls: Object.freeze({
      watch: true,
      stop: true
    }),
    parameters: Object.freeze([
      Object.freeze({
        id: "source",
        label: "Adresa tabule S\u017D",
        type: "url",
        format: "sz-station-url",
        default: LIVE_STATION_DEFAULTS.sourceUrl,
        help: "Stejn\xFD form\xE1t StationTable.aspx?Key=\u2026. V\xFDchoz\xED je Brno hlavn\xED n\xE1dra\u017E\xED (Key=455).",
        showStation: true
      })
    ])
  });

  // src/templates/platformTable.js
  var PLATFORM_TABLE_TEMPLATE = Object.freeze({
    id: "pragotron-platform-table",
    rootSelector: "#tabule",
    slots: Object.freeze([
      Object.freeze({
        id: "stationOne",
        type: "split-flap",
        selector: '[data-board-slot="stationOne"]',
        statePath: Object.freeze(["stations", 0])
      }),
      Object.freeze({
        id: "stationTwo",
        type: "split-flap",
        selector: '[data-board-slot="stationTwo"]',
        statePath: Object.freeze(["stations", 1])
      }),
      Object.freeze({
        id: "train",
        type: "train-flap",
        selector: '[data-board-slot="train"]',
        statePath: "train"
      }),
      Object.freeze({
        id: "departureTime",
        type: "departure-time",
        selector: '[data-board-slot="departureTime"]',
        statePath: "departureTime"
      }),
      Object.freeze({
        id: "delay",
        type: "delay-flap",
        selector: '[data-board-slot="delay"]',
        statePath: "delay"
      }),
      Object.freeze({
        id: "lenses",
        type: "lens-display",
        selector: '[data-board-slot="lenses"]',
        statePath: "lenses",
        options: Object.freeze({
          count: 2
        })
      })
    ])
  });

  // src/demos/platformTableBoard.js
  var STORAGE_KEY = "pragotron.platformTable.state.v2";
  var LEGACY_STORAGE_KEY = "pragotron.platformTable.state.v1";
  var documentRef = document;
  var storage2 = new LocalStorageAdapter(STORAGE_KEY);
  var legacyStorage = new LocalStorageAdapter(LEGACY_STORAGE_KEY);
  var currentState = storage2.load();
  var legacyState = currentState ? null : legacyStorage.load();
  var savedState = currentState || legacyState || {};
  if (!currentState && legacyState) {
    storage2.save({
      ...legacyState,
      version: 2
    });
  }
  var savedSettings = savedState.settings || savedState;
  var boardIdentity = loadBoardIdentity();
  var transport = new BoardTransport({
    boardId: getBoardIdentityKey(boardIdentity)
  });
  var appliedRevision = 0;
  var automaticNightMode = savedSettings?.autoNightMode === true;
  var delayOffset = normalizeDelayOffset(
    savedSettings?.delayOffset ?? DELAY_OFFSET_DEFAULT
  );
  var heartbeatTimer = null;
  var commandQueue = Promise.resolve();
  var boardLensColors = readInitialLensColors();
  var forgetSessionKey = (key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
    }
  };
  forgetSessionKey("pragotron.board.lighting.v1");
  var boardLightingCustom = false;
  var withBoardLensColors = (state) => {
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
  var paintBoardLensColors = () => {
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
  var createEmptyDisplayState = () => ({
    ...createEmptyBoardState(),
    lenses: createEmptyLensState()
  });
  var normalizeIncomingBoardState = (state) => {
    const source = state && typeof state === "object" ? state : {};
    const stations = Array.isArray(source.stations) ? source.stations : [source.stationOne, source.stationTwo];
    return {
      ...source,
      stations: [stations[0] || "", stations[1] || ""]
    };
  };
  var isValidBoardState = (state) => {
    const departureTime = state?.departureTime;
    const validTime = departureTime === null || Number.isInteger(Number(departureTime?.hours)) && Number(departureTime.hours) >= 0 && Number(departureTime.hours) <= 23 && Number.isInteger(Number(departureTime?.minutes)) && Number(departureTime.minutes) >= 0 && Number(departureTime.minutes) <= 59;
    const validStations = Array.isArray(state?.stations) && state.stations.length >= 2 && state.stations.slice(0, 2).every(
      (station) => typeof station === "string" && station.length <= 14
    );
    return validStations && getActiveStationProfile().trainTypes.some(
      (type) => type.name === state.train
    ) && parseDelayMinutes(state.delay) !== null && validTime;
  };
  var audio = new SplitFlapAudio();
  forgetSessionKey("pragotron.board.flapTiming.v1");
  var boardFlapTimingCustom = false;
  var storedStationProfile = readStoredStationProfile();
  if (storedStationProfile) {
    setActiveStationProfile(storedStationProfile, { persist: false });
  }
  var board = createBoard({
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
    board.getComponent("train")?.setTypes?.(storedStationProfile.trainTypes);
  }
  var lensDisplay = board.getComponent("lenses");
  var lensActivationTimer = null;
  var lensActivationToken = 0;
  var lensAnimationStartedAt = Date.now();
  var currentDisplayState = createEmptyDisplayState();
  var identificationActive = false;
  var normalLensState = null;
  paintBoardLensColors();
  var operationalPreDepartureActive = true;
  var cancelLensActivation = () => {
    lensActivationToken += 1;
    if (lensActivationTimer !== null) {
      window.clearTimeout(lensActivationTimer);
      lensActivationTimer = null;
    }
  };
  var setLensPreDepartureActive = (isActive) => {
    operationalPreDepartureActive = Boolean(isActive);
    lensDisplay.setPreDepartureActive(isActive);
    lensAnimationStartedAt = Date.now();
  };
  var getEffectiveDeparture = (state) => getEffectiveDepartureDate(
    state?.departureTime,
    state?.delay,
    /* @__PURE__ */ new Date(),
    delayOffset
  );
  var scheduleLensActivation = (state) => {
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
    const activationTime = departure.getTime() - preDeparture.seconds * 1e3;
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
  var cloneLensState = (value) => {
    const fallback = createDefaultLensState();
    return {
      lenses: Array.isArray(value?.lenses) ? value.lenses.map((lens, index) => {
        const fallbackLens = fallback.lenses[index] || fallback.lenses[0];
        return {
          ...fallbackLens,
          ...lens,
          blinkInterval: fallbackLens.blinkInterval,
          blinkDelay: index * fallbackLens.blinkInterval
        };
      }) : fallback.lenses.map((lens) => ({ ...lens })),
      preDeparture: {
        ...fallback.preDeparture,
        ...value?.preDeparture || {}
      },
      synchronizeRows: value?.synchronizeRows !== false
    };
  };
  var applyIdentificationLensState = () => {
    const source = normalLensState || currentDisplayState.lenses || createEmptyLensState();
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
    lensDisplay.setPreDepartureActive(true);
  };
  var setIdentificationActive = (forceOn) => {
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
      normalLensState || currentDisplayState.lenses || createEmptyLensState()
    );
    normalLensState = null;
    scheduleLensActivation(currentDisplayState);
    return identificationActive;
  };
  var setBoardState = (state, options = {}) => {
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
  var screenElement = documentRef.querySelector("#skrin");
  audio.bindUserActivation(screenElement || documentRef);
  var nightLighting = new NightLighting({
    root: screenElement,
    clockBlock: documentRef.querySelector("#clockBlock")
  }).mount();
  var analogClock = new AnalogClock(
    documentRef.querySelector("#pragotronAnalogClock")
  );
  try {
    analogClock.mount();
  } catch (error) {
    console.warn("Analogov\xE9 hodiny se nepoda\u0159ilo inicializovat.", error);
  }
  var setNightMode = (isNight) => {
    nightLighting.setNightMode(isNight);
    analogClock.transitionNightMode();
  };
  var persistNightModeState = () => {
    const currentState2 = storage2.load() || {};
    const modeState = {
      nightMode: nightLighting.isNightMode(),
      autoNightMode: automaticNightMode
    };
    storage2.save({
      ...currentState2,
      ...modeState,
      settings: {
        ...currentState2.settings || {},
        ...modeState
      }
    });
  };
  var publishBoardMode = () => {
    transport.publish("board:mode", {
      nightMode: nightLighting.isNightMode(),
      autoNightMode: automaticNightMode
    });
  };
  var sunSchedule = new SunSchedule({
    onChange: (isNight) => {
      if (!automaticNightMode) {
        return;
      }
      setNightMode(isNight);
      persistNightModeState();
      publishBoardMode();
    }
  });
  var syncAutomaticNightMode = () => {
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
  var handleVisibilityChange = () => {
    if (!documentRef.hidden) {
      syncAutomaticNightMode();
    }
  };
  documentRef.addEventListener("visibilitychange", handleVisibilityChange);
  var applyStationProfile = (value) => {
    const profile = setActiveStationProfile(value);
    if (profile) {
      board.getComponent("train")?.setTypes?.(profile.trainTypes);
    }
    return profile;
  };
  var applySettings = ({
    lamps,
    clockLight,
    nightMode,
    autoNightMode,
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
    if (typeof nextDelayOffset === "boolean") {
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
    if (typeof autoNightMode === "boolean") {
      automaticNightMode = autoNightMode;
    }
    if (typeof nightMode === "boolean" && !automaticNightMode) {
      setNightMode(nightMode);
    }
    syncAutomaticNightMode();
  };
  var waitForBoardToSettle = () => new Promise((resolve) => {
    const check = () => {
      if (board.isSettled()) {
        resolve();
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
  var getBoardLensColors = () => {
    const lenses = (normalLensState || lensDisplay.getValue())?.lenses || [];
    return [
      boardLensColors?.[0] || lenses[0]?.color || "green",
      boardLensColors?.[1] || lenses[1]?.color || lenses[0]?.color || "green"
    ];
  };
  var getLensPresenceState = () => ({
    ...normalLensState || lensDisplay.getValue(),
    preDepartureActive: normalLensState ? operationalPreDepartureActive : lensDisplay.preDepartureActive,
    animationStartedAt: lensAnimationStartedAt
  });
  var acknowledge = (message, payload = {}) => {
    transport.publish("command:ack", {
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
  var publishReady = () => {
    transport.publish("board:ready", {
      page: "platformTable",
      boardId: getBoardIdentityKey(boardIdentity),
      identity: boardIdentity,
      instanceId: transport.id,
      configured: Boolean(boardIdentity.platform && boardIdentity.track),
      capabilities: [
        "apply-board",
        "reset-board",
        "reset-all",
        "identify-lenses"
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
      userAgent: String(globalThis.navigator?.userAgent || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 400)
    });
  };
  var publishHeartbeat = () => {
    transport.publish("board:heartbeat", {
      page: "platformTable",
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
      userAgent: String(globalThis.navigator?.userAgent || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 400)
    });
  };
  audio.subscribe(() => {
    publishHeartbeat();
  });
  var handleCommand = async (message) => {
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
      const isTargetedAction = action === "apply-board" || action === "reset-board";
      const isIdentificationAction = action === "identify-lenses";
      const isAudioMuteAction = action === "set-audio-muted";
      const isAudioVolumeAction = action === "set-audio-volume";
      const isLensColorAction = action === "set-lens-colors";
      const isLightingAction = action === "set-lighting";
      const isFlapTimingAction = action === "set-flap-timing";
      if (isTargetedAction) {
        if (!message.payload?.target || !identitiesMatch(boardIdentity, message.payload.target)) {
          return;
        }
      }
      if ((isIdentificationAction || isAudioMuteAction || isAudioVolumeAction || isLensColorAction || isLightingAction || isFlapTimingAction) && message.target?.source !== transport.id) {
        return;
      }
      if (![
        "apply-board",
        "reset-board",
        "reset-all",
        "identify-lenses",
        "set-audio-muted",
        "set-audio-volume",
        "set-lens-colors",
        "set-lighting",
        "set-flap-timing"
      ].includes(action)) {
        throw new Error("Nezn\xE1m\xE1 akce tabule.");
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
        if (lamps && typeof lamps === "object") {
          nightLighting.setLampSettings(lamps);
        }
        if (clockLight && typeof clockLight === "object") {
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
          throw new Error("Neplatn\xE1 barva \u010Do\u010Dek.");
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
      if (Number.isFinite(Number(revision)) && Number(revision) <= appliedRevision) {
        acknowledge(message, { ok: true });
        return;
      }
      if (settings) {
        applySettings(settings);
      }
      if (action === "apply-board" || action === "reset-board") {
        const nextState = normalizeIncomingBoardState(
          state || createEmptyDisplayState()
        );
        if (!isValidBoardState(nextState)) {
          throw new Error("Neplatn\xE1 data odjezdov\xE9 tabule.");
        }
        setBoardState(nextState, { immediate });
        if (!immediate) {
          await waitForBoardToSettle();
        }
      } else if (action === "reset-all") {
        setBoardState(createEmptyDisplayState(), { immediate: true });
      }
      if (Number.isFinite(Number(revision))) {
        appliedRevision = Number(revision);
      }
      acknowledge(message, { ok: true });
    } catch (error) {
      acknowledge(message, {
        ok: false,
        error: error instanceof Error ? error.message : "Tabuli se nepoda\u0159ilo aktualizovat."
      });
    }
  };
  transport.subscribe((message) => {
    if (message.type === "station-profile") {
      applyStationProfile(
        message.payload?.stationProfile || message.payload
      );
      return;
    }
    if (message.type === "manage:hello" || message.type === "manage:discover") {
      publishReady();
      return;
    }
    if (message.type === "board:command") {
      if (message.payload?.action === "identify-lenses" || message.payload?.action === "set-audio-muted" || message.payload?.action === "set-audio-volume" || message.payload?.action === "set-lens-colors" || message.payload?.action === "set-lighting" || message.payload?.action === "set-flap-timing") {
        void handleCommand(message);
      } else {
        commandQueue = commandQueue.then(() => handleCommand(message));
      }
      return;
    }
    if (message.type === "board:settings") {
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
  heartbeatTimer = window.setInterval(publishHeartbeat, 4e3);
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
      const message = `Identita tabule nastavena: n\xE1stupi\u0161t\u011B ${boardIdentity.platform || "\u2014"}, kolej ${boardIdentity.track || "\u2014"}, sektor ${boardIdentity.sector || "cel\xE1 kolej"}.`;
      console.info(message);
      publishReady();
      return {
        ...boardIdentity,
        message
      };
    },
    destroy: () => {
      cancelLensActivation();
      documentRef.removeEventListener("visibilitychange", handleVisibilityChange);
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
})();
