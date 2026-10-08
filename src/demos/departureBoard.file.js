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
  var DEPARTURE_BOARD_ROW_COUNT_DEFAULT = 12;
  var DEPARTURE_BOARD_ROW_COUNT_MIN = 1;
  var DEPARTURE_BOARD_ROW_COUNT_MAX = 24;
  var normalizeDepartureBoardRowCount = (value) => clampInteger(
    value,
    DEPARTURE_BOARD_ROW_COUNT_MIN,
    DEPARTURE_BOARD_ROW_COUNT_MAX,
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT
  );
  var DEPARTURE_BOARD_LOGO_CUSTOM_ID = "custom";
  var DEPARTURE_BOARD_LOGO_DEFAULT = "sprzel";
  var DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH = 8e4;
  var DEPARTURE_BOARD_LOGO_PRESETS = Object.freeze([
    {
      id: "cd",
      src: "images/CD_logo.svg",
      label: "\u010CD"
    },
    {
      id: "sprzel",
      src: "images/sprzel.svg",
      label: "Spr\xE1va \u017Eeleznic"
    },
    {
      id: "sprzel-white",
      src: "images/sprzel_bile.svg",
      label: "Spr\xE1va \u017Eeleznic b\xEDl\xE9"
    },
    {
      id: "pragotron",
      src: "images/pragotron_bile.svg",
      label: "Pragotron"
    }
  ]);
  var normalizeDepartureBoardLogoId = (value) => {
    if (value === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
      return DEPARTURE_BOARD_LOGO_CUSTOM_ID;
    }
    return DEPARTURE_BOARD_LOGO_PRESETS.some((item) => item.id === value) ? value : DEPARTURE_BOARD_LOGO_DEFAULT;
  };
  var normalizeCustomBoardLogoSvg = (value) => {
    const text = String(value ?? "").trim();
    if (!text || text.length > DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH || !/<svg[\s>]/i.test(text) || /<script/i.test(text) || /\bon\w+\s*=/i.test(text)) {
      return "";
    }
    return text;
  };
  var getDepartureBoardLogoLabel = (value, fallback = DEPARTURE_BOARD_LOGO_DEFAULT) => {
    const logoId = normalizeDepartureBoardLogoId(value ?? fallback);
    if (logoId === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
      return "Vlastn\xED logo";
    }
    return DEPARTURE_BOARD_LOGO_PRESETS.find((item) => item.id === logoId)?.label || "Logo";
  };
  var getDepartureBoardLogoSrc = (value, customSvg = "", fallback = DEPARTURE_BOARD_LOGO_DEFAULT) => {
    const logoId = normalizeDepartureBoardLogoId(value ?? fallback);
    if (logoId === DEPARTURE_BOARD_LOGO_CUSTOM_ID) {
      const svg = normalizeCustomBoardLogoSvg(customSvg);
      return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
    }
    return DEPARTURE_BOARD_LOGO_PRESETS.find((item) => item.id === logoId)?.src || "";
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
  var hasPositiveDelay = (delay) => {
    const actualDelay = parseDelayMinutes(delay);
    return Number.isFinite(actualDelay) && actualDelay > 0;
  };
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
    const recentUndelayed = !hasPositiveDelay(delay) && minutesSinceClock(clock, reference) <= RECENT_DEPARTURE_GRACE_MS;
    if (date.getTime() < reference.getTime() && !recentUndelayed) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };
  var getDepartureSortTimestamp = (departureTime, delay, now = /* @__PURE__ */ new Date(), applyOffset = DELAY_OFFSET_DEFAULT) => {
    const hours = Number(departureTime?.hours);
    const minutes = Number(departureTime?.minutes);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      return Number.POSITIVE_INFINITY;
    }
    const reference = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(reference.getTime())) {
      return Number.POSITIVE_INFINITY;
    }
    const date = new Date(reference.getTime());
    date.setSeconds(0, 0);
    date.setHours(hours, minutes, 0, 0);
    const actualDelay = parseDelayMinutes(delay);
    const hasDelay = Number.isFinite(actualDelay) && actualDelay > 0;
    if (!hasDelay && minutesSinceClock(date, reference) > RECENT_DEPARTURE_GRACE_MS) {
      date.setDate(date.getDate() + 1);
    }
    return date.getTime();
  };
  var compareDeparturesByTime = (first, second, now = /* @__PURE__ */ new Date(), applyOffset = DELAY_OFFSET_DEFAULT) => {
    const firstTime = getDepartureSortTimestamp(
      first?.departureTime,
      first?.delay,
      now,
      applyOffset
    );
    const secondTime = getDepartureSortTimestamp(
      second?.departureTime,
      second?.delay,
      now,
      applyOffset
    );
    return firstTime - secondTime || String(first?.id || "").localeCompare(String(second?.id || ""));
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
      source: "images/intercity.svg",
      label: "Intercity (IC)",
      background: "#fff",
      foreground: "#CC3333"
    },
    {
      name: "Eurocity",
      source: "images/EuroCity_Logo.svg",
      label: "Eurocity (EC)",
      background: "#fff",
      foreground: "#000"
    },
    {
      name: "rj",
      source: "images/railjet.svg",
      label: "Railjet (rj)",
      background: "#D80300",
      foreground: "#fff"
    },
    {
      name: "RJ",
      source: "images/regiojet.svg",
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
      source: "images/nightjet.svg",
      label: "NightJet (nj)",
      background: "#1e3c69",
      foreground: "#fff"
    },
    {
      name: "SuperCity",
      source: "images/supercity.svg",
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
  var getTrainNumberCardStyle = (train) => {
    const name = String(train ?? "");
    const normalized = name.toLocaleLowerCase("cs-CZ");
    if (name === "Intercity" || name === "Eurocity" || name === "IC" || name === "EC" || name === "SuperCity" || normalized === "sc") {
      return "intercity";
    }
    if (name === "Sp" || normalized === "nj" || normalized === "nightjet") {
      return "sp";
    }
    if (name === "R" || name === "R miest." || name === "Mim. R" || name === "Ex" || name.startsWith("Ex ") || name === "\u010CEDOK" || name === "ROH" || normalized === "rj" || normalized === "railjet" || normalized === "regiojet") {
      return "red";
    }
    return "default";
  };
  var NIGHT_FADE_MODES = Object.freeze([
    { value: "none", label: "Bez pohas\xEDn\xE1n\xED (st\xE1l\xFD svit)" },
    { value: "soft", label: "Jemn\xE9 kol\xEDs\xE1n\xED" },
    { value: "slow", label: "Pomal\xE9 pohas\xEDn\xE1n\xED" },
    { value: "flicker", label: "Nepravideln\xE9 poblik\xE1v\xE1n\xED" }
  ]);
  var NIGHT_LIGHT_BASE_DEFAULTS = Object.freeze({
    enabled: true,
    variation: true,
    intensity: 100,
    speed: 45,
    fade: "soft"
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
    intensity: 50
  });

  // src/platform/audio.js
  var soundUrl = (fileName) => typeof document === "undefined" ? fileName : new URL(fileName, document.baseURI).href;
  var DEFAULT_SOUND_URL = soundUrl("split-flap.wav");
  var PITCHED_SOUND_URL = soundUrl("split-flap_pitched_down.wav");
  var FLAP_SOUND_DURATION_MS = 170;
  var FLAP_SOUND_POOL_SIZE = 48;
  var AUDIO_MUTE_STORAGE_KEY = "pragotron.board.audioMuted.v1";
  var readStoredMute = () => {
    try {
      return globalThis.sessionStorage?.getItem(AUDIO_MUTE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  };
  var writeStoredMute = (muted) => {
    try {
      globalThis.sessionStorage?.setItem(
        AUDIO_MUTE_STORAGE_KEY,
        muted ? "1" : "0"
      );
    } catch {
    }
  };
  var SplitFlapAudio = class {
    constructor(source = DEFAULT_SOUND_URL) {
      this.template = typeof Audio === "function" ? new Audio(source) : null;
      this.pitchedTemplate = typeof Audio === "function" ? new Audio(PITCHED_SOUND_URL) : null;
      this.unlocked = false;
      this.muted = readStoredMute();
      this.activationTarget = null;
      this.activationHandler = null;
      this.listeners = /* @__PURE__ */ new Set();
      this.voices = [];
      this.pitchedVoices = [];
      this.pendingPlays = [];
      this.flushingPlays = false;
      [this.template, this.pitchedTemplate].forEach((template) => {
        if (template) {
          template.preload = "auto";
        }
      });
      this.fillPool(this.voices, this.template);
      this.fillPool(this.pitchedVoices, this.pitchedTemplate);
    }
    fillPool(pool, template) {
      if (!template) {
        return;
      }
      while (pool.length < FLAP_SOUND_POOL_SIZE) {
        const sound = template.cloneNode();
        sound.preload = "auto";
        sound.preservesPitch = true;
        const voice = { sound, busy: false };
        const release = () => {
          voice.busy = false;
        };
        sound.addEventListener("ended", release);
        sound.addEventListener("error", release);
        pool.push(voice);
      }
    }
    claimVoice(pool) {
      for (let index = 0; index < pool.length; index += 1) {
        if (!pool[index].busy) {
          return pool[index];
        }
      }
      return null;
    }
    getState() {
      return {
        available: Boolean(this.template),
        unlocked: this.unlocked,
        muted: this.muted
      };
    }
    setMuted(value) {
      const nextValue = Boolean(value);
      if (nextValue === this.muted) {
        return this.muted;
      }
      this.muted = nextValue;
      writeStoredMute(nextValue);
      this.listeners.forEach((listener) => listener(this.getState()));
      return this.muted;
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
      this.pendingPlays.push({ variant, durationMs });
      if (this.flushingPlays) {
        return;
      }
      this.flushingPlays = true;
      const flush = () => {
        this.flushingPlays = false;
        const queued = this.pendingPlays.splice(0);
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
      const duration = Number(durationMs);
      if (Number.isFinite(duration) && duration > 0) {
        sound.playbackRate = Math.min(
          16,
          Math.max(0.0625, FLAP_SOUND_DURATION_MS / duration)
        );
      }
      const release = () => {
        voice.busy = false;
      };
      try {
        if (sound.ended || sound.paused) {
          if (sound.currentTime !== 0) {
            sound.currentTime = 0;
          }
        }
      } catch {
      }
      try {
        const playback = sound.play();
        if (playback?.then) {
          playback.then(() => this.setUnlocked(true)).catch(release);
        } else {
          this.setUnlocked(true);
        }
      } catch {
        release();
      }
    }
    destroy() {
      this.removeActivationListeners();
      this.listeners.clear();
      this.pendingPlays = [];
      this.flushingPlays = false;
      this.voices.splice(0).forEach((voice) => voice.sound.pause());
      this.pitchedVoices.splice(0).forEach((voice) => voice.sound.pause());
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
        fill: "forwards"
      }),
      bottom.animate(BOTTOM_FLIP_FRAMES, {
        duration: half,
        delay: half,
        easing: "ease-out",
        fill: "forwards"
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
      audio: audio2 = new SplitFlapAudio(),
      maxLength = STATION_CHARACTER_COUNT,
      sequence = STATION_FLAP_SEQUENCE,
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.audio = audio2;
      this.ownsAudio = audio2 instanceof SplitFlapAudio;
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
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS,
      applyDelayOffset = DELAY_OFFSET_DEFAULT
    } = {}) {
      this.element = element;
      this.values = values;
      this.audio = audio2;
      this.ownsAudio = audio2 instanceof SplitFlapAudio;
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
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.types = types;
      this.audio = audio2;
      this.ownsAudio = audio2 instanceof SplitFlapAudio;
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
    indexFor(value) {
      if (value === "" || value === null || value === void 0) {
        return 0;
      }
      const match = findTrainType(value, this.types);
      const index = match ? this.types.indexOf(match) : -1;
      if (index === -1) {
        throw new RangeError(
          `Nepodporovan\xFD typ vlaku "${value}". Povolen\xE9 typy: ${this.types.map((type) => type.name || "(pr\xE1zdn\xE9)").join(", ")}`
        );
      }
      return index;
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
      if (type.source) {
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
        if (face.source !== type.source) {
          face.source = type.source;
          face.content.style.backgroundImage = `url("${type.source}")`;
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
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.minimum = minimum;
      this.maximum = maximum;
      this.audio = audio2;
      this.ownsAudio = audio2 instanceof SplitFlapAudio;
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
      } else {
        next = this.currentValue === this.maximum ? "" : this.currentValue + 1;
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
      label = "Odjezd"
    } = {}) {
      this.element = element;
      this.label = label || "Odjezd";
      this.defaultHours = Number(element.dataset.hours);
      this.defaultMinutes = Number(element.dataset.minutes);
      this.hour = new SequentialNumericFlap(
        element.querySelector(".time-hour-flap"),
        0,
        23,
        { audio: audio2, timing }
      );
      this.minuteTens = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[0],
        0,
        5,
        { audio: audio2, timing }
      );
      this.minuteOnes = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[1],
        0,
        9,
        { audio: audio2, timing }
      );
      this.element.setAttribute("aria-label", this.label);
    }
    setTiming(timing) {
      const normalized = normalizeFlapTiming(timing);
      this.hour.setTiming(normalized);
      this.minuteTens.setTiming(normalized);
      this.minuteOnes.setTiming(normalized);
      return normalized;
    }
    parseTime(hours, minutes) {
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
      return { hours, minutes };
    }
    updateLabel(hours, minutes) {
      this.element.setAttribute(
        "aria-label",
        `${this.label} ${hours}.${String(minutes).padStart(2, "0")}`
      );
    }
    set(hours, minutes) {
      const time = this.parseTime(hours, minutes);
      this.hour.set(time.hours);
      this.minuteTens.set(Math.floor(time.minutes / 10));
      this.minuteOnes.set(time.minutes % 10);
      this.updateLabel(time.hours, time.minutes);
      return time;
    }
    setImmediate(hours, minutes) {
      const time = this.parseTime(hours, minutes);
      this.hour.setImmediate(time.hours);
      this.minuteTens.setImmediate(Math.floor(time.minutes / 10));
      this.minuteOnes.setImmediate(time.minutes % 10);
      this.updateLabel(time.hours, time.minutes);
    }
    clear() {
      this.hour.clear();
      this.minuteTens.clear();
      this.minuteOnes.clear();
      this.element.setAttribute("aria-label", this.label);
    }
    clearImmediate() {
      this.hour.clearImmediate();
      this.minuteTens.clearImmediate();
      this.minuteOnes.clearImmediate();
      this.element.setAttribute("aria-label", this.label);
    }
    getValue() {
      const values = [
        this.hour.getValue(),
        this.minuteTens.getValue(),
        this.minuteOnes.getValue()
      ];
      if (values.every((value) => value === "")) {
        return null;
      }
      return {
        hours: values[0] === "" ? 0 : values[0],
        minutes: (values[1] === "" ? 0 : values[1]) * 10 + (values[2] === "" ? 0 : values[2])
      };
    }
    isSettled() {
      return this.hour.isSettled() && this.minuteTens.isSettled() && this.minuteOnes.isSettled();
    }
    destroy() {
      this.hour.destroy();
      this.minuteTens.destroy();
      this.minuteOnes.destroy();
      this.element.replaceChildren();
    }
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
        `${setting.blinkInterval * 2}s`
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
      lens.classList.toggle(
        "is-on",
        setting.enabled && preDepartureActive
      );
      lens.classList.toggle(
        "is-blinking",
        setting.enabled && setting.blinking && preDepartureActive
      );
      const lightElement = document.createElement("span");
      lightElement.className = "lens-light";
      lens.appendChild(lightElement);
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
      const preDepartureActive = !this.state.preDeparture.enabled || this.preDepartureActive;
      this.state.lenses.forEach((setting, index) => {
        const lens = lenses[index];
        lens.classList.toggle(
          "is-on",
          setting.enabled && preDepartureActive
        );
        lens.classList.toggle(
          "is-blinking",
          setting.enabled && setting.blinking && preDepartureActive
        );
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

  // src/platform/departure-board.js
  var SHIFT_PAUSE_MS = 1e3;
  var ROW_SETTLE_CHECK_MS = 40;
  var createDepartureRowElement = (index) => {
    const row = document.createElement("tr");
    row.dataset.departureRow = String(index + 1);
    row.innerHTML = [
      '<td><div class="lens-display departure-row-lenses" data-departure-slot="lenses" aria-label="\u010Co\u010Dky"></div></td>',
      '<td><div class="train-flap-display" data-departure-slot="train" aria-label="Typ vlaku"></div></td>',
      '<td><div class="train-number-display" data-departure-slot="trainNumber" aria-label="\u010C\xEDslo vlaku"></div></td>',
      '<td><div class="flap-display" data-departure-slot="stationOne"></div></td>',
      '<td><div class="flap-display" data-departure-slot="stationTwo"></div></td>',
      '<td><div class="departure-time-display" data-departure-slot="departureTime" data-hours="0" data-minutes="0">',
      '<div class="time-flap time-hour-flap"></div>',
      '<span class="time-separator" aria-hidden="true">.</span>',
      '<div class="time-minute-group">',
      '<div class="time-flap time-minute-flap"></div>',
      '<div class="time-flap time-minute-flap"></div>',
      "</div></div></td>",
      '<td><div class="delay-flap-display" data-departure-slot="delay"></div></td>',
      '<td><div class="flap-display" data-departure-slot="platform"></div></td>',
      '<td><div data-departure-slot="track"></div></td>',
      '<td><div data-departure-slot="sector"></div></td>'
    ].join("");
    return row;
  };
  var scheduleFrame2 = (callback) => {
    if (typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 0);
  };
  var prefersReducedMotion2 = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clearTimer2 = (owner, property) => {
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
  var createCatalogCards = (values) => values.map((value) => ({
    key: value || "blank",
    value,
    background: "var(--flap-background)",
    foreground: "var(--flap-foreground)"
  }));
  var TRACK_CARDS = createCatalogCards(DEPARTURE_TRACK_VALUES);
  var PLATFORM_CARDS = createCatalogCards(DEPARTURE_PLATFORM_VALUES);
  var SECTOR_CARDS = createCatalogCards(DEPARTURE_SECTOR_VALUES);
  var findCard = (cards, key) => cards.find((card) => card.key === key) || cards[0];
  var cloneLensState = (value) => {
    const fallback = createDefaultLensState();
    const source = value && typeof value === "object" ? value : fallback;
    return {
      lenses: Array.isArray(source.lenses) ? source.lenses.map((lens, index) => ({
        ...fallback.lenses[index],
        ...lens,
        blinkInterval: LENS_DEFAULTS.blinkInterval,
        blinkDelay: index * LENS_DEFAULTS.blinkInterval
      })) : fallback.lenses.map((lens) => ({ ...lens })),
      preDeparture: {
        ...fallback.preDeparture,
        ...source.preDeparture || {}
      },
      synchronizeRows: source.synchronizeRows !== false
    };
  };
  var toIdentificationLensState = (value) => {
    const source = cloneLensState(value);
    return {
      ...source,
      lenses: source.lenses.map((lens) => ({
        ...lens,
        enabled: true,
        blinking: false
      })),
      preDeparture: {
        ...source.preDeparture,
        enabled: false
      }
    };
  };
  var findCatalogValue = (values, value) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    return values.find((candidate) => candidate === raw) || values.find(
      (candidate) => candidate.toLocaleLowerCase("cs-CZ") === raw.toLocaleLowerCase("cs-CZ")
    ) || "";
  };
  var normalizeDepartureTime = (value) => {
    if (value && typeof value === "object") {
      const hours = Number(value.hours);
      const minutes = Number(value.minutes);
      if (Number.isInteger(hours) && hours >= 0 && hours <= 23 && Number.isInteger(minutes) && minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
    if (typeof value === "string") {
      const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
      const hours = Number(match?.[1]);
      const minutes = Number(match?.[2]);
      if (match && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
    return null;
  };
  var normalizeDeparture = (value) => {
    const source = value?.state && typeof value.state === "object" ? {
      ...value,
      ...value.state,
      target: value.target || value.state.target
    } : value || {};
    const target = {
      platform: source.target?.platform || source.platform,
      track: source.target?.track || source.track,
      sector: source.target?.sector || source.sector
    };
    const track = findCatalogValue(
      DEPARTURE_TRACK_VALUES,
      target.track
    );
    target.platform = findCatalogValue(
      DEPARTURE_PLATFORM_VALUES,
      target.platform
    );
    const sector = findCatalogValue(
      DEPARTURE_SECTOR_VALUES,
      target.sector
    );
    const departureTime = normalizeDepartureTime(source.departureTime);
    const parsedDelay = parseDelayMinutes(source.delay);
    return {
      id: String(value?.id || source.id || JSON.stringify([
        target.platform || "",
        track,
        sector
      ])),
      stations: [
        formatStationName(
          source.stations?.[0] || source.stationOne || ""
        ),
        formatStationName(
          source.stations?.[1] || source.stationTwo || ""
        )
      ],
      train: (() => {
        const resolved = resolveCanonicalTrainType(
          source.train,
          source.operator
        );
        return TRAIN_TYPES.some((type) => type.name === resolved) ? resolved : "";
      })(),
      trainNumber: /^\d{1,4}$/.test(String(source.trainNumber || "")) ? String(source.trainNumber) : "",
      delay: parsedDelay === null ? "" : parsedDelay,
      departureTime,
      target: {
        platform: String(target.platform || "").trim(),
        track,
        sector
      },
      lenses: cloneLensState(source.lenses),
      preDepartureActive: value?.preDepartureActive !== false
    };
  };
  var sortDepartures = (departures2, now = /* @__PURE__ */ new Date(), applyOffset = DELAY_OFFSET_DEFAULT) => departures2.map(normalizeDeparture).sort(
    (first, second) => compareDeparturesByTime(first, second, now, applyOffset)
  );
  var rowSnapshot = (departure) => departure ? {
    id: departure.id,
    stations: [...departure.stations],
    train: departure.train,
    trainNumber: departure.trainNumber,
    delay: departure.delay,
    departureTime: departure.departureTime ? { ...departure.departureTime } : null,
    target: { ...departure.target },
    lenses: cloneLensState(departure.lenses),
    preDepartureActive: departure.preDepartureActive !== false
  } : null;
  var sameRow = (first, second) => JSON.stringify(rowSnapshot(first)) === JSON.stringify(rowSnapshot(second));
  var sameRowExceptPreDeparture = (first, second) => {
    if (!first || !second) {
      return false;
    }
    const firstSnapshot = rowSnapshot(first);
    const secondSnapshot = rowSnapshot(second);
    firstSnapshot.preDepartureActive = true;
    secondSnapshot.preDepartureActive = true;
    return JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot) && first.preDepartureActive !== second.preDepartureActive;
  };
  var withManagedLensColors = (state, template) => {
    const colors = template?.lenses;
    if (!Array.isArray(colors) || colors.length === 0 || !state?.lenses) {
      return state;
    }
    return {
      ...state,
      lenses: state.lenses.map((lens, index) => ({
        ...lens,
        color: colors[index]?.color || colors[0]?.color || lens.color
      }))
    };
  };
  var setComponentValue = (component, value, immediate) => {
    if (immediate && typeof component.setImmediate === "function") {
      component.setImmediate(value ?? "");
      return;
    }
    if ((value === "" || value === null || value === void 0) && typeof component.clear === "function") {
      component.clear();
      return;
    }
    component.set(value ?? "");
  };
  var CatalogFlapDisplay = class {
    constructor(element, cards, {
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS,
      ownsAudio = audio2 instanceof SplitFlapAudio
    } = {}) {
      if (!element || !Array.isArray(cards) || cards.length === 0) {
        throw new TypeError("CatalogFlapDisplay vy\u017Eaduje element a katalog.");
      }
      this.element = element;
      this.cards = cards;
      this.audio = audio2;
      this.ownsAudio = ownsAudio;
      this.timing = normalizeFlapTiming(timing);
      this.currentIndex = 0;
      this.targetIndex = 0;
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion2();
      this.element.classList.add("catalog-flap");
      this.render(this.cards[0], this.cards[0]);
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      return { ...this.timing };
    }
    indexFor(value) {
      const key = value && typeof value === "object" ? value.key : String(value ?? "") || "blank";
      const index = this.cards.findIndex((card) => card.key === key);
      if (index === -1) {
        throw new RangeError(`Hodnota "${value}" nen\xED v katalogu klapky.`);
      }
      return index;
    }
    ensureFaces() {
      if (this.faces) {
        return;
      }
      this.element.replaceChildren();
      this.faces = [
        "catalog-flap-half--top-current",
        "catalog-flap-half--top-next",
        "catalog-flap-half--bottom-current",
        "catalog-flap-half--bottom-next"
      ].map((className) => {
        const half = document.createElement("span");
        half.className = `catalog-flap-half ${className}`;
        const content = document.createElement("span");
        content.className = "catalog-flap-content";
        half.appendChild(content);
        this.element.appendChild(half);
        return { half, content };
      });
    }
    paintFace(face, card) {
      face.half.style.setProperty(
        "--catalog-flap-background",
        card.background || "var(--flap-background)"
      );
      face.half.style.setProperty(
        "--catalog-flap-foreground",
        card.foreground || "var(--flap-foreground)"
      );
      face.content.textContent = card.value === "" ? "\xA0" : card.value;
    }
    render(current, next) {
      this.ensureFaces();
      this.paintFace(this.faces[0], current);
      this.paintFace(this.faces[1], next);
      this.paintFace(this.faces[2], current);
      this.paintFace(this.faces[3], next);
    }
    set(value) {
      this.targetIndex = this.indexFor(value);
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer2(this, "timer");
      clearFlapAnimation(this.element);
      this.advance(sequence);
      return this.cards[this.targetIndex].value;
    }
    setImmediate(value) {
      const targetIndex = this.indexFor(value);
      this.sequence += 1;
      clearTimer2(this, "timer");
      this.currentIndex = targetIndex;
      this.targetIndex = targetIndex;
      clearFlapAnimation(this.element);
      this.render(this.cards[targetIndex], this.cards[targetIndex]);
    }
    clear() {
      return this.set("");
    }
    clearImmediate() {
      this.setImmediate("");
    }
    advance(sequence, tickNow = performance.now()) {
      if (sequence !== this.sequence || this.currentIndex === this.targetIndex) {
        return;
      }
      const nextIndex = (this.currentIndex + 1) % this.cards.length;
      const current = this.cards[this.currentIndex];
      const next = this.cards[nextIndex];
      clearFlapAnimation(this.element);
      this.render(current, next);
      if (this.reducedMotion) {
        this.render(next, next);
        this.currentIndex = nextIndex;
        scheduleFrame2(() => this.advance(sequence));
        return;
      }
      const flipDuration = this.timing.duration + Math.floor(Math.random() * (this.timing.variation * 2 + 1)) - this.timing.variation;
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
          this.timer = null;
          if (this.currentIndex === this.targetIndex) {
            clearFlapAnimation(this.element);
            this.render(next, next);
            return;
          }
          this.advance(sequence, nextTick);
        }
      );
    }
    getValue() {
      return this.cards[this.currentIndex].value;
    }
    isSettled() {
      return this.currentIndex === this.targetIndex && this.timer === null;
    }
    destroy() {
      this.sequence += 1;
      clearTimer2(this, "timer");
      this.faces = null;
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var TrainNumberDisplay = class {
    constructor(element, {
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS
    } = {}) {
      this.element = element;
      this.audio = audio2;
      this.slots = [];
      this.timing = normalizeFlapTiming(timing);
      this.element.classList.add("train-number-display");
      this.element.replaceChildren();
      for (let index = 0; index < 4; index += 1) {
        const slotElement = document.createElement("span");
        slotElement.className = "train-number-slot";
        this.element.appendChild(slotElement);
        this.slots.push(new CatalogFlapDisplay(
          slotElement,
          TRAIN_NUMBER_FLAP_CARDS,
          {
            audio: audio2,
            timing: this.timing,
            ownsAudio: false
          }
        ));
      }
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      this.slots.forEach((slot) => slot.setTiming(this.timing));
      return { ...this.timing };
    }
    targetCards(value = {}) {
      const number = String(value.number ?? value.trainNumber ?? "").replace(/\D/g, "").slice(-4).padStart(4, " ");
      const style = getTrainNumberCardStyle(value.train);
      return Array.from(number, (digit) => digit === " " ? findCard(TRAIN_NUMBER_FLAP_CARDS, "blank") : findCard(
        TRAIN_NUMBER_FLAP_CARDS,
        `${style}-${digit}`
      ));
    }
    set(value) {
      this.targetCards(value).forEach(
        (card, index) => this.slots[index].set(card)
      );
      return String(value?.number ?? value?.trainNumber ?? "");
    }
    setImmediate(value) {
      this.targetCards(value).forEach(
        (card, index) => this.slots[index].setImmediate(card)
      );
    }
    clear() {
      this.set({ number: "", train: "" });
    }
    clearImmediate() {
      this.setImmediate({ number: "", train: "" });
    }
    getValue() {
      return this.slots.map((slot) => slot.getValue()).join("");
    }
    isSettled() {
      return this.slots.every((slot) => slot.isSettled());
    }
    destroy() {
      this.slots.forEach((slot) => slot.destroy());
      this.slots = [];
      this.element.replaceChildren();
    }
  };
  var DepartureBoardRow = class {
    constructor(element, {
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS,
      rowIndex = 0,
      applyDelayOffset = DELAY_OFFSET_DEFAULT,
      lensColorTemplate = null
    } = {}) {
      this.element = element;
      this.timing = normalizeFlapTiming(timing);
      this.rowIndex = Math.max(0, Math.floor(Number(rowIndex) || 0));
      this.lensColorTemplate = lensColorTemplate;
      this.stationOne = new SplitFlapDisplay(
        element.querySelector('[data-departure-slot="stationOne"]'),
        { audio: audio2, maxLength: 14, timing: this.timing }
      );
      this.train = new TrainFlapDisplay(
        element.querySelector('[data-departure-slot="train"]'),
        void 0,
        { audio: audio2, timing: this.timing }
      );
      this.trainNumber = new TrainNumberDisplay(
        element.querySelector('[data-departure-slot="trainNumber"]'),
        { audio: audio2, timing: this.timing }
      );
      this.stationTwo = new SplitFlapDisplay(
        element.querySelector('[data-departure-slot="stationTwo"]'),
        { audio: audio2, maxLength: 14, timing: this.timing }
      );
      this.departureTime = new DepartureTimeDisplay(
        element.querySelector('[data-departure-slot="departureTime"]'),
        { audio: audio2, timing: this.timing }
      );
      this.delay = new DelayFlapDisplay(
        element.querySelector('[data-departure-slot="delay"]'),
        void 0,
        {
          audio: audio2,
          timing: this.timing,
          applyDelayOffset
        }
      );
      this.platform = new CatalogFlapDisplay(
        element.querySelector('[data-departure-slot="platform"]'),
        PLATFORM_CARDS,
        { audio: audio2, timing: this.timing, ownsAudio: false }
      );
      this.track = new CatalogFlapDisplay(
        element.querySelector('[data-departure-slot="track"]'),
        TRACK_CARDS,
        { audio: audio2, timing: this.timing, ownsAudio: false }
      );
      this.sector = new CatalogFlapDisplay(
        element.querySelector('[data-departure-slot="sector"]'),
        SECTOR_CARDS,
        { audio: audio2, timing: this.timing, ownsAudio: false }
      );
      this.lenses = new LensDisplay(
        element.querySelector('[data-departure-slot="lenses"]'),
        {
          count: 2,
          defaultState: withManagedLensColors(
            createEmptyLensState(),
            this.lensColorTemplate
          ),
          rowIndex: this.rowIndex
        }
      );
      this.components = [
        this.stationOne,
        this.train,
        this.trainNumber,
        this.stationTwo,
        this.departureTime,
        this.delay,
        this.platform,
        this.track,
        this.sector,
        this.lenses
      ];
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      this.components.forEach((component) => component.setTiming?.(this.timing));
      return { ...this.timing };
    }
    setDelayOffset(enabled) {
      return this.delay.setDelayOffset(enabled);
    }
    setPreDepartureActive(isActive) {
      this.lenses.setPreDepartureActive(isActive);
    }
    setLensColorTemplate(template) {
      this.lensColorTemplate = template?.lenses ? template : null;
      const current = this.lenses.getValue();
      this.lenses.set(withManagedLensColors(current, this.lensColorTemplate));
    }
    paintLenses(state, { preDepartureActive = true } = {}) {
      this.lenses.set(withManagedLensColors(state, this.lensColorTemplate));
      this.lenses.setPreDepartureActive(preDepartureActive);
    }
    applyIdentificationLenses() {
      this.lenses.set(toIdentificationLensState(this.lenses.getValue()));
      this.lenses.setPreDepartureActive(true);
    }
    restoreOperationalLenses(departure) {
      this.paintLenses(departure?.lenses || createEmptyLensState(), {
        preDepartureActive: departure?.preDepartureActive !== false
      });
    }
    setData(value, {
      immediate = false,
      preDepartureActive = true,
      identificationActive: identificationActive2 = false
    } = {}) {
      const departure = value ? normalizeDeparture(value) : null;
      setComponentValue(
        this.stationOne,
        departure?.stations[0] || "",
        immediate
      );
      setComponentValue(
        this.train,
        departure?.train || "",
        immediate
      );
      const numberValue = {
        number: departure?.trainNumber || "",
        train: departure?.train || ""
      };
      if (immediate) {
        this.trainNumber.setImmediate(numberValue);
      } else {
        this.trainNumber.set(numberValue);
      }
      setComponentValue(
        this.stationTwo,
        departure?.stations[1] || "",
        immediate
      );
      if (departure?.departureTime) {
        if (immediate) {
          this.departureTime.setImmediate(
            departure.departureTime.hours,
            departure.departureTime.minutes
          );
        } else {
          this.departureTime.set(
            departure.departureTime.hours,
            departure.departureTime.minutes
          );
        }
      } else if (immediate) {
        this.departureTime.clearImmediate();
      } else {
        this.departureTime.clear();
      }
      setComponentValue(
        this.delay,
        departure?.delay ?? "",
        immediate
      );
      setComponentValue(
        this.platform,
        departure?.target.platform || "",
        immediate
      );
      if (immediate) {
        this.track.setImmediate(departure?.target.track || "");
        this.sector.setImmediate(departure?.target.sector || "");
      } else {
        this.track.set(departure?.target.track || "");
        this.sector.set(departure?.target.sector || "");
      }
      if (identificationActive2) {
        this.paintLenses(toIdentificationLensState(
          departure?.lenses || createEmptyLensState()
        ));
        return;
      }
      this.paintLenses(departure?.lenses || createEmptyLensState(), {
        preDepartureActive
      });
    }
    isSettled() {
      return this.components.every(
        (component) => typeof component.isSettled !== "function" || component.isSettled()
      );
    }
    destroy() {
      this.components.forEach((component) => component.destroy?.());
      this.components = [];
    }
  };
  var DepartureBoardDisplay = class {
    constructor(root2, {
      audio: audio2 = new SplitFlapAudio(),
      timing = FLAP_TIMING_DEFAULTS,
      rowSelector = "[data-departure-row]",
      rowCount = DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
      applyDelayOffset = DELAY_OFFSET_DEFAULT,
      lensSettings = null
    } = {}) {
      if (!root2) {
        throw new TypeError("DepartureBoardDisplay vy\u017Eaduje root element.");
      }
      this.root = root2;
      this.audio = audio2;
      this.timing = normalizeFlapTiming(timing);
      this.applyDelayOffset = normalizeDelayOffset(applyDelayOffset);
      this.lensSettings = lensSettings?.lenses ? lensSettings : null;
      this.rowSelector = rowSelector;
      this.rows = [...root2.querySelectorAll(rowSelector)].map(
        (element, index) => new DepartureBoardRow(element, {
          audio: audio2,
          timing: this.timing,
          rowIndex: index,
          applyDelayOffset: this.applyDelayOffset,
          lensColorTemplate: this.lensSettings
        })
      );
      this.displayedRows = Array.from(
        { length: this.rows.length },
        () => null
      );
      this.targetRows = [...this.displayedRows];
      this.processing = false;
      this.queueGeneration = 0;
      this.shiftPausePending = false;
      this.destroyed = false;
      this.waitTimer = null;
      this.waitResolve = null;
      this.identificationActive = false;
      this.root.setAttribute("aria-busy", "false");
      this.setRowCount(rowCount);
    }
    setTiming(timing) {
      this.timing = normalizeFlapTiming(timing);
      this.rows.forEach((row) => row.setTiming(this.timing));
      return { ...this.timing };
    }
    setDelayOffset(enabled) {
      this.applyDelayOffset = normalizeDelayOffset(enabled);
      this.rows.forEach((row) => row.setDelayOffset(this.applyDelayOffset));
      return this.applyDelayOffset;
    }
    setLensSettings(value) {
      this.lensSettings = value?.lenses ? value : null;
      this.rows.forEach((row) => row.setLensColorTemplate(this.lensSettings));
      if (this.identificationActive) {
        this.applyIdentificationLenses();
      }
      return this.lensSettings;
    }
    getRowContainer() {
      return this.root.tBodies?.[0] || this.root.querySelector("tbody") || this.root;
    }
    interruptQueue() {
      this.queueGeneration += 1;
      clearTimer2(this, "waitTimer");
      if (this.waitResolve) {
        const resolve = this.waitResolve;
        this.waitResolve = null;
        resolve();
      }
      this.processing = false;
      this.root.setAttribute("aria-busy", "false");
    }
    setRowCount(count) {
      const nextCount = normalizeDepartureBoardRowCount(count);
      if (nextCount === this.rows.length) {
        return nextCount;
      }
      this.interruptQueue();
      const container = this.getRowContainer();
      while (this.rows.length > nextCount) {
        const row = this.rows.pop();
        this.displayedRows.pop();
        this.targetRows.pop();
        row.destroy();
        row.element.remove();
      }
      while (this.rows.length < nextCount) {
        const index = this.rows.length;
        const element = createDepartureRowElement(index);
        container.appendChild(element);
        this.rows.push(new DepartureBoardRow(element, {
          audio: this.audio,
          timing: this.timing,
          rowIndex: index,
          applyDelayOffset: this.applyDelayOffset,
          lensColorTemplate: this.lensSettings
        }));
        this.displayedRows.push(null);
        this.targetRows.push(null);
      }
      this.rows.forEach((row, index) => {
        row.rowIndex = index;
        row.lenses.rowIndex = index;
        row.element.dataset.departureRow = String(index + 1);
      });
      if (this.identificationActive) {
        this.applyIdentificationLenses();
      }
      return nextCount;
    }
    applyIdentificationLenses() {
      this.rows.forEach((row) => row.applyIdentificationLenses());
    }
    restoreOperationalLenses() {
      this.rows.forEach((row, index) => {
        row.restoreOperationalLenses(this.targetRows[index]);
      });
    }
    setIdentificationActive(forceOn) {
      const nextValue = Boolean(forceOn);
      if (nextValue === this.identificationActive) {
        if (nextValue) {
          this.applyIdentificationLenses();
        }
        return this.identificationActive;
      }
      this.identificationActive = nextValue;
      if (nextValue) {
        this.applyIdentificationLenses();
        return this.identificationActive;
      }
      this.restoreOperationalLenses();
      return this.identificationActive;
    }
    update(departures2, { immediate = false } = {}) {
      const nextRows = sortDepartures(
        Array.isArray(departures2) ? departures2 : [],
        /* @__PURE__ */ new Date(),
        this.applyDelayOffset
      ).slice(0, this.rows.length);
      const paddedRows = [
        ...nextRows,
        ...Array.from(
          { length: this.rows.length - nextRows.length },
          () => null
        )
      ];
      const nextIds = new Set(
        nextRows.map((departure) => departure.id)
      );
      const removedDisplayedRow = this.displayedRows.some(
        (departure) => departure && !nextIds.has(departure.id)
      );
      const displayedRowAssignmentsChanged = this.displayedRows.some(
        (departure, index) => departure && departure.id !== nextRows[index]?.id
      );
      if (removedDisplayedRow || displayedRowAssignmentsChanged) {
        this.shiftPausePending = true;
      }
      this.targetRows = paddedRows;
      if (immediate) {
        this.targetRows.forEach((departure, index) => {
          this.rows[index].setData(departure, {
            immediate: true,
            preDepartureActive: departure?.preDepartureActive !== false,
            identificationActive: this.identificationActive
          });
          this.displayedRows[index] = rowSnapshot(departure);
        });
        this.shiftPausePending = false;
        return;
      }
      this.processQueue();
    }
    findNextChange() {
      for (let index = 0; index < this.rows.length; index += 1) {
        if (!sameRow(this.displayedRows[index], this.targetRows[index])) {
          return index;
        }
      }
      return -1;
    }
    wait(milliseconds) {
      return new Promise((resolve) => {
        this.waitResolve = resolve;
        this.waitTimer = window.setTimeout(() => {
          this.waitTimer = null;
          this.waitResolve = null;
          resolve();
        }, milliseconds);
      });
    }
    waitForRow(row) {
      return new Promise((resolve) => {
        this.waitResolve = resolve;
        const check = () => {
          if (this.destroyed || row.isSettled()) {
            this.waitTimer = null;
            this.waitResolve = null;
            resolve();
            return;
          }
          this.waitTimer = window.setTimeout(check, ROW_SETTLE_CHECK_MS);
        };
        check();
      });
    }
    async processQueue() {
      if (this.processing || this.destroyed) {
        return;
      }
      this.processing = true;
      const generation = this.queueGeneration;
      this.root.setAttribute("aria-busy", "true");
      try {
        while (!this.destroyed && generation === this.queueGeneration) {
          const index = this.findNextChange();
          if (index === -1) {
            break;
          }
          if (this.shiftPausePending) {
            this.shiftPausePending = false;
            await this.wait(SHIFT_PAUSE_MS);
            continue;
          }
          const target = this.targetRows[index];
          if (sameRowExceptPreDeparture(
            this.displayedRows[index],
            target
          )) {
            if (this.identificationActive) {
              this.rows[index].applyIdentificationLenses();
            } else {
              this.rows[index].setPreDepartureActive(
                target.preDepartureActive !== false
              );
            }
            this.displayedRows[index] = rowSnapshot(target);
            continue;
          }
          this.rows[index].setData(target, {
            preDepartureActive: target?.preDepartureActive !== false,
            identificationActive: this.identificationActive
          });
          await this.waitForRow(this.rows[index]);
          if (this.destroyed || generation !== this.queueGeneration) {
            return;
          }
          if (!sameRow(target, this.targetRows[index])) {
            continue;
          }
          this.displayedRows[index] = rowSnapshot(target);
        }
      } finally {
        if (generation === this.queueGeneration) {
          this.processing = false;
          this.root.setAttribute("aria-busy", "false");
        }
      }
    }
    isSettled() {
      return !this.processing && this.findNextChange() === -1;
    }
    getValue() {
      return this.displayedRows.map(
        (departure) => departure ? rowSnapshot(departure) : null
      );
    }
    destroy() {
      this.destroyed = true;
      clearTimer2(this, "waitTimer");
      if (this.waitResolve) {
        const resolve = this.waitResolve;
        this.waitResolve = null;
        resolve();
      }
      this.rows.forEach((row) => row.destroy());
      this.rows = [];
      this.displayedRows = [];
      this.targetRows = [];
      this.identificationActive = false;
      this.root.setAttribute("aria-busy", "false");
    }
  };

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

  // src/platform/lighting-state.js
  var LEGACY_LIGHT_DEFAULTS = Object.freeze({
    "top-left": { enabled: true, variation: true, intensity: 100, speed: 45, fade: "soft" },
    "top-center": { enabled: true, variation: true, intensity: 85, speed: 60, fade: "slow" },
    "top-right": { enabled: true, variation: true, intensity: 55, speed: 45, fade: "flicker" },
    "bottom-left": { enabled: false, variation: false, intensity: 0, speed: 60, fade: "soft" },
    "bottom-right": { enabled: true, variation: true, intensity: 75, speed: 55, fade: "slow" }
  });

  // src/platform/storage.js
  var LocalStorageAdapter = class {
    constructor(key, storage2) {
      this.key = key;
      if (storage2 !== void 0) {
        this.storage = storage2;
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
  var createId = (prefix) => {
    const random = globalThis.crypto?.randomUUID?.();
    return `${prefix}-${random || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  };
  var getStorage = (storage2) => {
    if (storage2 !== void 0) {
      return storage2;
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
      storage: storage2,
      windowRef = globalThis.window,
      boardId = ""
    } = {}) {
      this.id = createId("client");
      this.boardId = typeof boardId === "string" ? boardId : "";
      this.storageKey = storageKey;
      this.storage = getStorage(storage2);
      this.window = windowRef;
      this.listeners = /* @__PURE__ */ new Set();
      this.seenMessages = /* @__PURE__ */ new Set();
      this.channel = null;
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
    }
    remember(messageId) {
      this.seenMessages.add(messageId);
      if (this.seenMessages.size > 500) {
        const oldest = this.seenMessages.values().next().value;
        this.seenMessages.delete(oldest);
      }
    }
    receive(message) {
      if (!message || message.version !== 2 || typeof message.messageId !== "string" || message.source === this.id || this.seenMessages.has(message.messageId)) {
        return;
      }
      if (message.target?.source && message.target.source !== this.id) {
        return;
      }
      if (message.target?.boardId && message.target.boardId !== this.boardId) {
        return;
      }
      this.remember(message.messageId);
      this.listeners.forEach((listener) => listener(message));
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
      try {
        this.channel?.postMessage(message);
      } catch {
      }
      try {
        this.storage?.setItem(this.storageKey, JSON.stringify(message));
      } catch {
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
    close() {
      this.listeners.clear();
      this.window?.removeEventListener("storage", this.storageHandler);
      this.channel?.close();
      this.channel = null;
    }
  };

  // src/platform/board-identity.js
  var IDENTITY_FIELDS = Object.freeze([
    "platform",
    "track",
    "sector"
  ]);
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

  // src/platform/sun-schedule.js
  var BRATISLAVA_SUN_LOCATION = Object.freeze({
    name: "Bratislava",
    latitude: 48.1486,
    longitude: 17.1077,
    timezoneId: "Europe/Bratislava"
  });
  var FALLBACK_REFRESH_MS = 15 * 60 * 1e3;

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

  // src/demos/departureBoard.js
  var STORAGE_KEY = "pragotron.platformTable.state.v2";
  var documentRef = document;
  var storage = new LocalStorageAdapter(STORAGE_KEY);
  var savedState = storage.load() || {};
  var savedSettings = savedState.settings || savedState;
  var savedDesiredStates = savedState.desired && typeof savedState.desired === "object" ? savedState.desired : {};
  var root = documentRef.querySelector("#tabule.departure-board");
  var screen = documentRef.querySelector("#skrin");
  if (!root) {
    throw new Error("Ko\u0159en odjezdov\xE9 tabule nebyl nalezen.");
  }
  var audio = new SplitFlapAudio();
  audio.bindUserActivation(screen || documentRef);
  var initialTiming = normalizeFlapTiming(savedSettings.flapTiming);
  var requestedRowCount = new URLSearchParams(window.location.search).get("rows");
  var urlLocksRowCount = requestedRowCount != null && requestedRowCount !== "";
  var initialRowCount = urlLocksRowCount ? normalizeDepartureBoardRowCount(requestedRowCount) : normalizeDepartureBoardRowCount(
    savedSettings.departureBoardRows ?? DEPARTURE_BOARD_ROW_COUNT_DEFAULT
  );
  var delayOffset = normalizeDelayOffset(
    savedSettings.delayOffset ?? DELAY_OFFSET_DEFAULT
  );
  var boardLogoImage = documentRef.querySelector("#departureBoardLogo");
  var applyBoardLogo = (settings = savedSettings) => {
    if (!boardLogoImage) {
      return;
    }
    const logoId = normalizeDepartureBoardLogoId(
      settings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
    );
    const src = getDepartureBoardLogoSrc(
      logoId,
      settings?.departureBoardLogoSvg || ""
    );
    const label = getDepartureBoardLogoLabel(logoId);
    if (!src) {
      boardLogoImage.hidden = true;
      boardLogoImage.removeAttribute("src");
      boardLogoImage.alt = "";
      return;
    }
    boardLogoImage.hidden = false;
    boardLogoImage.src = src;
    boardLogoImage.alt = label;
  };
  applyBoardLogo();
  var clockRoot = documentRef.querySelector("#departureBoardClock");
  var boardClock = clockRoot ? new DepartureTimeDisplay(clockRoot, {
    audio,
    timing: initialTiming,
    label: "Aktu\xE1ln\xED \u010Das"
  }) : null;
  var boardClockTimer = null;
  var lastBoardClockStamp = "";
  var tickBoardClock = (immediate = false) => {
    if (!boardClock) {
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const stamp = `${now.getHours()}:${now.getMinutes()}`;
    if (stamp === lastBoardClockStamp) {
      return;
    }
    lastBoardClockStamp = stamp;
    if (immediate) {
      boardClock.setImmediate(now.getHours(), now.getMinutes());
      return;
    }
    boardClock.set(now.getHours(), now.getMinutes());
  };
  var scheduleBoardClock = (immediate = false) => {
    tickBoardClock(immediate);
    const now = /* @__PURE__ */ new Date();
    const delay = (60 - now.getSeconds()) * 1e3 - now.getMilliseconds();
    boardClockTimer = window.setTimeout(
      () => scheduleBoardClock(false),
      Math.max(50, delay)
    );
  };
  scheduleBoardClock(true);
  documentRef.addEventListener("visibilitychange", () => {
    if (!documentRef.hidden) {
      lastBoardClockStamp = "";
      tickBoardClock(true);
    }
  });
  var display = new DepartureBoardDisplay(root, {
    audio,
    timing: initialTiming,
    rowCount: initialRowCount,
    applyDelayOffset: delayOffset,
    lensSettings: savedSettings.lenses
  });
  var transport = new BoardTransport();
  var recoverDepartures = (values, desiredStates = savedDesiredStates, { includeMissing = true } = {}) => {
    const candidates = desiredStates && typeof desiredStates === "object" ? Object.values(desiredStates) : [];
    const rawDepartures = Array.isArray(values) ? values : [];
    const recoverDeparture = (departure, desired = null) => {
      const desiredState = desired?.state || {};
      const target = {
        ...desired?.target || {},
        ...departure?.target || {},
        platform: departure?.target?.platform || departure?.platform || desired?.target?.platform || "",
        track: departure?.target?.track || departure?.track || desired?.target?.track || "",
        sector: departure?.target?.sector || departure?.sector || desired?.target?.sector || ""
      };
      return {
        ...desiredState,
        ...departure,
        id: departure?.id || desired?.target && getBoardIdentityKey(desired.target),
        stations: [
          departure?.stations?.[0] || departure?.stationOne || desiredState.stations?.[0] || desiredState.stationOne || "",
          departure?.stations?.[1] || departure?.stationTwo || desiredState.stations?.[1] || desiredState.stationTwo || ""
        ],
        target,
        departureTime: departure?.departureTime || desiredState.departureTime,
        train: departure?.train || desiredState.train || "",
        trainNumber: departure?.trainNumber || desiredState.trainNumber || "",
        delay: departure?.delay ?? desiredState.delay ?? "",
        lenses: departure?.lenses || desiredState.lenses
      };
    };
    const recovered = rawDepartures.map((departure) => {
      const desired = candidates.find(
        (candidate) => candidate?.target && (String(departure?.id || "") === getBoardIdentityKey(candidate.target) || getBoardIdentityKey(departure?.target) === getBoardIdentityKey(candidate.target))
      );
      return recoverDeparture(departure, desired);
    });
    const recoveredIdentities = /* @__PURE__ */ new Set();
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
      candidates.filter(
        (desired) => desired?.action === "apply-board" && desired.target && desired.state?.departureTime
      ).forEach((desired) => {
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
  var getCurrentDesiredStates = () => {
    const currentState = storage.load();
    return currentState?.desired && typeof currentState.desired === "object" ? currentState.desired : savedDesiredStates;
  };
  var persistedDepartures = recoverDepartures(savedState.departures);
  var persistedRevision = Number(savedState.revision) || 0;
  var departures = [];
  var boardTiming = initialTiming;
  var revision = 0;
  var lensActivationTimer = null;
  var heartbeatTimer = null;
  var destroyed = false;
  var removeStorageListener = null;
  var unsubscribeAudio = null;
  var persistencePollTimer = null;
  var helloRetryTimer = null;
  var liveSnapshotReceived = false;
  var identificationActive = false;
  var getSnapshotSignature = (values, timing) => JSON.stringify([values, timing]);
  var snapshotSignature = getSnapshotSignature(departures, boardTiming);
  var scheduleInitialSnapshot = (callback) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(callback);
    } else {
      window.setTimeout(callback, 0);
    }
  };
  var clearLensActivationTimer = () => {
    if (lensActivationTimer !== null) {
      window.clearTimeout(lensActivationTimer);
      lensActivationTimer = null;
    }
  };
  var getPreDepartureActivationTime = (departure) => {
    const preDeparture = departure?.lenses?.preDeparture;
    const lenses = Array.isArray(departure?.lenses?.lenses) ? departure.lenses.lenses : [];
    if (!preDeparture?.enabled || !lenses.some((lens) => lens.enabled && lens.blinking)) {
      return null;
    }
    const departureDate = getEffectiveDepartureDate(
      departure?.departureTime,
      departure?.delay,
      /* @__PURE__ */ new Date(),
      delayOffset
    );
    if (!departureDate) {
      return null;
    }
    return departureDate.getTime() - Number(preDeparture.seconds || 0) * 1e3;
  };
  var getPreDepartureActive = (departure, now = Date.now()) => {
    const activationTime = getPreDepartureActivationTime(departure);
    return activationTime === null || now >= activationTime;
  };
  var getDisplayDepartures = () => {
    const now = Date.now();
    return departures.map((departure) => ({
      ...departure,
      preDepartureActive: getPreDepartureActive(departure, now)
    }));
  };
  var scheduleLensActivation = () => {
    clearLensActivationTimer();
    if (destroyed) {
      return;
    }
    const now = Date.now();
    const nextActivation = departures.map(getPreDepartureActivationTime).filter((value) => value !== null && value > now).sort((first, second) => first - second)[0];
    if (nextActivation === void 0) {
      return;
    }
    lensActivationTimer = window.setTimeout(() => {
      lensActivationTimer = null;
      display.update(getDisplayDepartures());
      scheduleLensActivation();
    }, Math.max(0, nextActivation - now) + 10);
  };
  var updateDisplay = ({ immediate = false } = {}) => {
    display.update(getDisplayDepartures(), { immediate });
    scheduleLensActivation();
  };
  var applyRowCount = (value) => {
    const previous = display.rows.length;
    const nextCount = display.setRowCount(value);
    if (nextCount === previous) {
      return nextCount;
    }
    updateDisplay();
    publishHeartbeat();
    return nextCount;
  };
  var applyBoardSettings = (settings = {}) => {
    const source = settings && typeof settings === "object" ? settings : {};
    if (source.flapTiming) {
      boardTiming = normalizeFlapTiming(source.flapTiming);
      display.setTiming(boardTiming);
      boardClock?.setTiming(boardTiming);
      snapshotSignature = getSnapshotSignature(departures, boardTiming);
    }
    if (source.departureBoardRows != null && !urlLocksRowCount) {
      applyRowCount(source.departureBoardRows);
    }
    if (typeof source.delayOffset === "boolean") {
      const nextOffset = normalizeDelayOffset(source.delayOffset);
      if (nextOffset !== delayOffset) {
        delayOffset = nextOffset;
        display.setDelayOffset(delayOffset);
        updateDisplay();
      }
    }
    if (source.departureBoardLogo != null || source.departureBoardLogoSvg != null) {
      applyBoardLogo(source);
    }
    if (source.lenses) {
      display.setLensSettings(source.lenses);
    }
  };
  var applyDepartureSnapshot = (nextDepartures, nextRevision, { immediate = false, timing = null } = {}) => {
    const numericRevision = Number(nextRevision) || 0;
    if (numericRevision < revision) {
      return false;
    }
    const nextValues = Array.isArray(nextDepartures) ? nextDepartures : [];
    const nextTiming = timing ? normalizeFlapTiming(timing) : boardTiming;
    const nextSignature = getSnapshotSignature(nextValues, nextTiming);
    if (numericRevision === revision && nextSignature === snapshotSignature) {
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
  var publishHello = () => {
    transport.publish("departure-board:hello", {
      page: "departureBoard",
      revision
    });
  };
  var stopHelloRetry = () => {
    if (helloRetryTimer !== null) {
      window.clearInterval(helloRetryTimer);
      helloRetryTimer = null;
    }
  };
  var getPresencePayload = () => ({
    page: "departureBoard",
    boardId: "departure-board",
    instanceId: transport.id,
    configured: true,
    capabilities: [
      "departure-board",
      "departure-snapshot",
      "identify-lenses"
    ],
    appliedRevision: revision,
    rowCount: display.rows.length,
    audio: audio.getState(),
    identificationActive
  });
  var acknowledge = (message, payload = {}) => {
    transport.publish("command:ack", {
      boardId: "departure-board",
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
  var setIdentificationActive = (forceOn) => {
    identificationActive = display.setIdentificationActive(forceOn);
    return identificationActive;
  };
  var handleCommand = (message) => {
    const { action, forceOn, muted } = message.payload || {};
    if (message.target?.source !== transport.id) {
      return;
    }
    if (action === "set-audio-muted") {
      audio.setMuted(muted === true);
      acknowledge(message, {
        ok: true,
        audio: audio.getState()
      });
      publishHeartbeat();
      return;
    }
    if (action !== "identify-lenses") {
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
        error: error instanceof Error ? error.message : "\u010Co\u010Dky se nepoda\u0159ilo p\u0159epnout do identifika\u010Dn\xEDho re\u017Eimu."
      });
    }
  };
  var publishReady = () => {
    transport.publish("board:ready", getPresencePayload());
  };
  var publishHeartbeat = () => {
    transport.publish("board:heartbeat", getPresencePayload());
  };
  transport.subscribe((message) => {
    if (message.type === "manage:departures") {
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
    if (message.type === "board:settings") {
      applyBoardSettings(message.payload);
      return;
    }
    if (message.type === "manage:discover") {
      publishReady();
      publishHello();
      return;
    }
    if (message.type === "board:command") {
      handleCommand(message);
    }
  });
  var storageHandler = (event) => {
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
    }
  };
  window.addEventListener("storage", storageHandler);
  removeStorageListener = () => window.removeEventListener("storage", storageHandler);
  var pollPersistedState = () => {
    const nextState = storage.load();
    if (!nextState || typeof nextState !== "object") {
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
  if (!transport.channel || window.location.protocol === "file:") {
    persistencePollTimer = window.setInterval(pollPersistedState, 1e3);
  }
  unsubscribeAudio = audio.subscribe(() => {
    publishHeartbeat();
  });
  updateDisplay();
  publishReady();
  publishHello();
  var helloAttempts = 0;
  helloRetryTimer = window.setInterval(() => {
    if (liveSnapshotReceived || helloAttempts >= 10) {
      stopHelloRetry();
      return;
    }
    helloAttempts += 1;
    publishHello();
  }, 1e3);
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
  heartbeatTimer = window.setInterval(publishHeartbeat, 4e3);
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
})();
