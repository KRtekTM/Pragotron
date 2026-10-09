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
  var createEmptyBoardState = () => ({
    stations: ["", ""],
    train: "",
    delay: "",
    departureTime: null
  });

  // src/platform/audio.js
  var soundUrl = (fileName) => typeof document === "undefined" ? fileName : new URL(fileName, document.baseURI).href;
  var DEFAULT_SOUND_URL = soundUrl("split-flap.wav");
  var PITCHED_SOUND_URL = soundUrl("split-flap_pitched_down.wav");

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
      const now = Date.now();
      const preDepartureActive = !this.state.preDeparture.enabled || this.preDepartureActive;
      this.state.lenses.forEach((setting, index) => {
        const lens = lenses[index];
        const blinking = setting.enabled && setting.blinking && preDepartureActive;
        if (blinking && !lens.classList.contains("is-blinking")) {
          lens.style.setProperty(
            "--lens-blink-delay",
            `${-getLensBlinkPhase({
              now,
              lensIndex: index,
              rowIndex: this.rowIndex,
              synchronizeRows: this.state.synchronizeRows
            })}s`
          );
        }
        lens.classList.toggle(
          "is-on",
          setting.enabled && preDepartureActive
        );
        lens.classList.toggle("is-blinking", blinking);
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
  var createCatalogCards = (values) => values.map((value) => ({
    key: value || "blank",
    value,
    background: "var(--flap-background)",
    foreground: "var(--flap-foreground)"
  }));
  var TRACK_CARDS = createCatalogCards(DEPARTURE_TRACK_VALUES);
  var PLATFORM_CARDS = createCatalogCards(DEPARTURE_PLATFORM_VALUES);
  var SECTOR_CARDS = createCatalogCards(DEPARTURE_SECTOR_VALUES);

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
  var isLegacyDefault = (id, setting) => {
    const legacy = LEGACY_LIGHT_DEFAULTS[id];
    if (!legacy) {
      return false;
    }
    return ["enabled", "variation", "intensity", "speed", "fade"].every((key) => String(setting?.[key]) === String(legacy[key]));
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
      this.clockSettings = {
        enabled: typeof clock.enabled === "boolean" ? clock.enabled : NIGHT_CLOCK_DEFAULTS.enabled,
        intensity: Math.round(
          clamp2(
            clock.intensity,
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
  var hubToChannelUrl = (hub, base) => {
    const url = new URL(hub, base);
    if (url.protocol === "https:" || url.protocol === "wss:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:" || url.protocol === "ws:") {
      url.protocol = "ws:";
    } else {
      return "";
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
      return `${wsProtocol}//${location.host}/api/board-channel`;
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
      this.listeners.forEach((listener) => listener(delivered));
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
      this.sendToSocket(message);
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
  var formatBoardIdentity = (identity) => {
    const normalized = normalizeBoardIdentity(identity);
    const sector = normalized.sector || "cel\xE1 kolej";
    return `n\xE1stupi\u0161t\u011B ${normalized.platform || "\u2014"}, kolej ${normalized.track || "\u2014"}, sektor ${sector}`;
  };
  var identitiesMatch = (boardIdentity, targetIdentity) => {
    const board = normalizeBoardIdentity(boardIdentity);
    const target = normalizeBoardIdentity(targetIdentity);
    if (!target.platform || !target.track) {
      return false;
    }
    return board.platform === target.platform && board.track === target.track && (!target.sector || board.sector === target.sector);
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
  var LIVE_POLL_INTERVAL_MIN_MS = 3e4;
  var LIVE_POLL_INTERVAL_MAX_MS = 3e5;
  var LIVE_POLL_INTERVAL_STEP_MS = 3e4;
  var LIVE_POLL_INTERVAL_MS = 6e4;
  var normalizeLivePollIntervalMs = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return LIVE_POLL_INTERVAL_MS;
    }
    const clamped = Math.min(
      LIVE_POLL_INTERVAL_MAX_MS,
      Math.max(LIVE_POLL_INTERVAL_MIN_MS, number)
    );
    const steps = Math.round(
      (clamped - LIVE_POLL_INTERVAL_MIN_MS) / LIVE_POLL_INTERVAL_STEP_MS
    );
    return LIVE_POLL_INTERVAL_MIN_MS + steps * LIVE_POLL_INTERVAL_STEP_MS;
  };
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
  var parseLiveSourceUrl = (value) => {
    const text = String(value ?? "").trim();
    if (!text) {
      return {
        sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
        key: LIVE_STATION_DEFAULTS.key,
        valid: true
      };
    }
    try {
      const url = new URL(text);
      const hostMatches = url.hostname.toLowerCase() === "provoz.spravazeleznic.cz";
      const pathMatches = url.pathname.replace(/\/+$/, "").toLowerCase() === LIVE_SOURCE_PATH.toLowerCase();
      const key = (url.searchParams.get("Key") || url.searchParams.get("key") || "").trim();
      if (!hostMatches || !pathMatches || !/^[A-Za-z0-9]+$/.test(key)) {
        return {
          sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
          key: LIVE_STATION_DEFAULTS.key,
          valid: false
        };
      }
      const normalized = new URL(`${LIVE_SOURCE_ORIGIN}${LIVE_SOURCE_PATH}`);
      normalized.searchParams.set("Key", key);
      return {
        sourceUrl: normalized.toString(),
        key,
        valid: true
      };
    } catch {
      return {
        sourceUrl: LIVE_STATION_DEFAULTS.sourceUrl,
        key: LIVE_STATION_DEFAULTS.key,
        valid: false
      };
    }
  };
  var normalizeLiveSourceUrl = (value) => parseLiveSourceUrl(value).sourceUrl;
  var wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
  var getErrorText = (error) => {
    if (!error) {
      return "";
    }
    const cause = error.cause ? getErrorText(error.cause) : "";
    return `${error.code || ""} ${error.message || error} ${cause}`.trim();
  };
  var describeLiveNetworkError = (error) => {
    const text = getErrorText(error).toLowerCase();
    if (text.includes("enobufs") || text.includes("no_buffer_space") || text.includes("no buffer space") || text.includes("err_no_buffer_space")) {
      return "Windows nem\xE1 voln\xE9 s\xED\u0165ov\xE9 buffery (ERR_NO_BUFFER_SPACE). Otev\u0159ete manage p\u0159es http://127.0.0.1:4787/platformTableManage.html, ne p\u0159es localhost. Kdy\u017E to p\u0159etrv\xE1, vypn\u011Bte VPN/WSL a zkuste to znovu.";
    }
    if (text.includes("eacces")) {
      return "Port scraperu je na Windows zak\xE1zan\xFD. Spus\u0165te server znovu, p\u0159\xEDpadn\u011B nastavte PORT na voln\xFD port.";
    }
    if (text.includes("failed to fetch") || text.includes("networkerror")) {
      return "Nepoda\u0159ilo se spojit se scraperem na 127.0.0.1. Ov\u011B\u0159te, \u017Ee b\u011B\u017E\xED npm run serve a \u017Ee v adrese nen\xED localhost, ale 127.0.0.1.";
    }
    return error instanceof Error ? error.message : "Live odjezdy se nepoda\u0159ilo na\u010D\xEDst.";
  };
  var normalizeLiveApiUrl = (value) => {
    const fallback = `http://127.0.0.1:${LIVE_SERVER_DEFAULT_PORT}/api/live-departures`;
    const text = String(value ?? "").trim();
    if (!text) {
      return fallback;
    }
    try {
      const url = new URL(text, "http://127.0.0.1");
      if (url.hostname === "localhost" || url.hostname === "[::1]") {
        url.hostname = "127.0.0.1";
      }
      if (!url.pathname || url.pathname === "/") {
        url.pathname = "/api/live-departures";
      }
      return url.toString().replace(/\/$/, "");
    } catch {
      return fallback;
    }
  };
  var getDefaultLiveApiUrl = (location = globalThis.location) => {
    const fallback = `http://127.0.0.1:${LIVE_SERVER_DEFAULT_PORT}/api/live-departures`;
    if (!location || location.protocol === "file:") {
      return fallback;
    }
    if (location.protocol === "http:" || location.protocol === "https:") {
      const hostname = location.hostname;
      const isLoopback = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]" || hostname === "::1";
      const port = Number(location.port) || (location.protocol === "https:" ? 443 : 80);
      if (isLoopback) {
        if (!new Set(LIVE_SERVER_FALLBACK_PORTS).has(port)) {
          return fallback;
        }
        return `http://127.0.0.1:${port}/api/live-departures`;
      }
      return `${location.origin}/api/live-departures`;
    }
    return fallback;
  };
  var fetchLiveDepartures = async ({
    apiUrl = getDefaultLiveApiUrl(),
    sourceUrl = normalizeLiveSourceUrl(LIVE_STATION_DEFAULTS.sourceUrl),
    pollIntervalMs = LIVE_POLL_INTERVAL_MS,
    fetchImpl = globalThis.fetch,
    attempts = 3
  } = {}) => {
    if (typeof fetchImpl !== "function") {
      throw new Error("Pro live odjezdy nen\xED dostupn\xE1 funkce fetch.");
    }
    const endpoint = new URL(
      normalizeLiveApiUrl(apiUrl),
      globalThis.location?.href
    );
    endpoint.searchParams.set(
      "source",
      normalizeLiveSourceUrl(sourceUrl)
    );
    endpoint.searchParams.set(
      "interval",
      String(normalizeLivePollIntervalMs(pollIntervalMs))
    );
    let lastError = null;
    for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
      try {
        const response = await fetchImpl(endpoint, {
          cache: "no-store",
          headers: {
            Accept: "application/json"
          }
        });
        if (!response.ok) {
          let details = `Live scraper vr\xE1til HTTP ${response.status}.`;
          try {
            const failed = await response.json();
            if (failed?.error) {
              details = String(failed.error);
            }
          } catch {
          }
          throw new Error(details);
        }
        const payload = await response.json();
        if (!Array.isArray(payload.departures)) {
          throw new Error("Live scraper vr\xE1til neplatn\xE1 data odjezd\u016F.");
        }
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await wait(400 * attempt);
        }
      }
    }
    throw new Error(describeLiveNetworkError(lastError));
  };

  // src/demos/platformTableManage.js
  var STORAGE_KEY = "pragotron.platformTable.state.v2";
  var LEGACY_STORAGE_KEY = "pragotron.platformTable.state.v1";
  var documentRef = document;
  var storage = new LocalStorageAdapter(STORAGE_KEY);
  var legacyStorage = new LocalStorageAdapter(LEGACY_STORAGE_KEY);
  var currentState = storage.load();
  var legacyState = currentState ? null : legacyStorage.load();
  var savedState = currentState || legacyState || {};
  if (!currentState && legacyState) {
    storage.save({
      ...legacyState,
      version: 2
    });
  }
  var savedSettings = savedState.settings || savedState;
  var transport = new BoardTransport();
  var boardForm = documentRef.querySelector("#boardForm");
  var stationInputs = [
    documentRef.querySelector("#stationOne"),
    documentRef.querySelector("#stationTwo")
  ];
  var platformInput = documentRef.querySelector("#platformValue");
  var trackInput = documentRef.querySelector("#trackValue");
  var sectorInput = documentRef.querySelector("#sectorValue");
  var trainTypeInput = documentRef.querySelector("#trainType");
  var trainNumberInput = documentRef.querySelector("#trainNumber");
  var operatorInput = documentRef.querySelector("#operatorValue");
  var departureTimeInput = documentRef.querySelector("#departureTime");
  var delayValueInput = documentRef.querySelector("#delayValue");
  var flapTimingDurationInput = documentRef.querySelector(
    "#flapTimingDuration"
  );
  var flapTimingDurationOutput = documentRef.querySelector(
    "#flapTimingDurationOutput"
  );
  var flapTimingVariationInput = documentRef.querySelector(
    "#flapTimingVariation"
  );
  var flapTimingVariationOutput = documentRef.querySelector(
    "#flapTimingVariationOutput"
  );
  var delayOffsetEnabledInput = documentRef.querySelector(
    "#delayOffsetEnabled"
  );
  var manageHeaderClock = documentRef.querySelector("#manageHeaderClock");
  var manageHeaderStation = documentRef.querySelector("#manageHeaderStation");
  var departureBoardRowsInput = documentRef.querySelector(
    "#departureBoardRows"
  );
  var departureBoardLogoInputs = [
    ...documentRef.querySelectorAll('input[name="departureBoardLogo"]')
  ];
  var departureBoardLogoSvgInput = documentRef.querySelector(
    "#departureBoardLogoSvg"
  );
  var departureBoardLogoCustomPreview = documentRef.querySelector(
    "#departureBoardLogoCustomPreview"
  );
  var departureBoardLogoCustomPlaceholder = documentRef.querySelector(
    "#departureBoardLogoCustomPlaceholder"
  );
  var manageHeaderBoardLogo = documentRef.querySelector("#manageHeaderBoardLogo");
  var manageHeaderBoardLogoWrap = documentRef.querySelector(
    "#manageHeaderBoardLogoWrap"
  );
  var boardFormStatus = documentRef.querySelector("#boardFormStatus");
  var lensControls = documentRef.querySelector("#lensControls");
  var lampSettingsPanel = documentRef.querySelector("#lampSettingsPanel");
  var lampControls = documentRef.querySelector("#lampControls");
  var clockLightControl = documentRef.querySelector("#clockLightControl");
  var clockLightEnabledInput = documentRef.querySelector("#clockLightEnabled");
  var clockLightIntensityInput = documentRef.querySelector("#clockLightIntensity");
  var clockLightIntensityOutput = documentRef.querySelector(
    "#clockLightIntensityOutput"
  );
  var resetLampSettingsButton = documentRef.querySelector("#resetLampSettings");
  var nightModeButton = documentRef.querySelector("#nightModeButton");
  var autoNightModeInput = documentRef.querySelector("#autoNightMode");
  var startButton = documentRef.querySelector("#startButton");
  var resetAllSettingsButton = documentRef.querySelector("#resetAllSettings");
  var clearAllDeparturesButton = documentRef.querySelector(
    "#clearAllDeparturesButton"
  );
  var activeBoardsList = documentRef.querySelector("#activeBoardsList");
  var departuresTable = documentRef.querySelector("#departuresTable");
  var departuresTableBody = documentRef.querySelector("#departuresTableBody");
  var departuresEmptyState = documentRef.querySelector("#departuresEmptyState");
  var liveApiUrlInput = documentRef.querySelector("#liveApiUrl");
  var liveSourceUrlInput = documentRef.querySelector("#liveSourceUrl");
  var liveSourceStation = documentRef.querySelector("#liveSourceStation");
  var liveSourceStationLink = documentRef.querySelector("#liveSourceStationLink");
  var liveToggleButton = documentRef.querySelector("#liveToggleButton");
  var liveDeparturesState = documentRef.querySelector("#liveDeparturesState");
  var liveDeparturesStatus = documentRef.querySelector("#liveDeparturesStatus");
  var liveDeparturesDescription = documentRef.querySelector(
    "#liveDeparturesDescription"
  );
  var livePollIntervalInput = documentRef.querySelector("#livePollInterval");
  var livePollIntervalValue = documentRef.querySelector("#livePollIntervalValue");
  var submitButton = boardForm.querySelector('button[type="submit"]');
  var MANAGE_DOCUMENT_TITLE = documentRef.title || "PRAGOTRON \u2013 manage";
  var lighting = new LightingSettings({
    initialLamps: savedSettings?.lamps || {},
    initialClock: savedSettings?.clockLight || NIGHT_CLOCK_DEFAULTS
  });
  var lensDisplay = new LensDisplay(documentRef.createElement("div"), {
    count: 2,
    defaultState: savedSettings?.lenses || createDefaultLensState()
  });
  var nightMode = savedSettings?.nightMode === true;
  var autoNightMode = savedSettings?.autoNightMode === true;
  var flapTiming = normalizeFlapTiming(savedSettings?.flapTiming);
  var delayOffset = normalizeDelayOffset(
    savedSettings?.delayOffset ?? DELAY_OFFSET_DEFAULT
  );
  var departureBoardRows = normalizeDepartureBoardRowCount(
    savedSettings?.departureBoardRows ?? DEPARTURE_BOARD_ROW_COUNT_DEFAULT
  );
  var departureBoardLogo = normalizeDepartureBoardLogoId(
    savedSettings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
  );
  var departureBoardLogoSvg = String(savedSettings?.departureBoardLogoSvg || "").trim().slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
  var savedLiveSettings = savedState.liveDepartures && typeof savedState.liveDepartures === "object" ? savedState.liveDepartures : {};
  var liveDeparturesEnabled = savedLiveSettings.enabled === true;
  var liveApiUrl = normalizeLiveApiUrl(
    typeof savedLiveSettings.apiUrl === "string" && savedLiveSettings.apiUrl.trim() ? savedLiveSettings.apiUrl.trim() : getDefaultLiveApiUrl()
  );
  var liveSourceUrl = normalizeLiveSourceUrl(
    typeof savedLiveSettings.sourceUrl === "string" && savedLiveSettings.sourceUrl.trim() ? savedLiveSettings.sourceUrl.trim() : LIVE_STATION_DEFAULTS.sourceUrl
  );
  var savedLiveStationName = typeof savedLiveSettings.station === "string" ? savedLiveSettings.station.trim() : "";
  var savedLiveStationKey = String(savedLiveSettings.stationKey || "");
  var liveStationName = savedLiveStationName && savedLiveStationKey === parseLiveSourceUrl(liveSourceUrl).key ? savedLiveStationName : parseLiveSourceUrl(liveSourceUrl).key === LIVE_STATION_DEFAULTS.key ? LIVE_STATION_DEFAULTS.name : "";
  var livePollIntervalMs = normalizeLivePollIntervalMs(
    savedLiveSettings.pollIntervalMs
  );
  var livePollTimer = null;
  var livePollInProgress = false;
  var liveRunToken = 0;
  var exampleActive = false;
  var boardActionInProgress = false;
  var pendingActions = /* @__PURE__ */ new Map();
  var pendingBackgroundActions = /* @__PURE__ */ new Map();
  var pendingIdentificationActions = /* @__PURE__ */ new Map();
  var activeBoards = /* @__PURE__ */ new Map();
  var departures = Array.isArray(savedState.departures) ? savedState.departures : [];
  var formDepartureId = "";
  var formDepartureLocked = false;
  var desiredStates = savedState.desired && typeof savedState.desired === "object" ? savedState.desired : {};
  var nextRevision = Number(savedState.revision) || 0;
  var globalResetRevision = Number(savedState.globalResetRevision) || 0;
  var sortState = {
    key: savedState.sort?.key || "departureTime",
    direction: savedState.sort?.direction === "desc" ? "desc" : "asc"
  };
  var presenceTimer = null;
  var heartbeatTimer = null;
  var lensActivationTimer = null;
  var exampleState = {
    stations: ["PRAHA", "BRATISLAVA"],
    train: "Eurocity",
    operator: "",
    delay: "12",
    target: {
      platform: "1",
      track: "6a",
      sector: "Jih"
    },
    departureTime: {
      hours: 16,
      minutes: 20
    }
  };
  var DEPARTURE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  var TRAIN_NUMBER_PATTERN = /^\d{0,4}$/;
  var normalizeTrainNumber = (value) => {
    const text = String(value ?? "").trim();
    return /^\d{1,4}$/.test(text) ? text : "";
  };
  var normalizeOperator = (value) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  var resolveTrainTypeValue = (train, operator) => {
    const resolved = resolveCanonicalTrainType(train, operator);
    return TRAIN_TYPES.some((type) => type.name === resolved) ? resolved : "";
  };
  var setBoardFormStatus = (message, isError = false) => {
    boardFormStatus.textContent = message;
    boardFormStatus.classList.toggle("is-error", isError);
  };
  var setFormValues = (state) => {
    stationInputs.forEach((input, index) => {
      input.value = state.stations[index] || "";
    });
    platformInput.value = state.target?.platform || "";
    trackInput.value = state.target?.track || "";
    sectorInput.value = state.target?.sector || "";
    operatorInput.value = state.operator || "";
    trainTypeInput.value = resolveTrainTypeValue(state.train, state.operator);
    trainNumberInput.value = normalizeTrainNumber(state.trainNumber);
    departureTimeInput.value = state.departureTime ? `${String(state.departureTime.hours).padStart(2, "0")}:${String(state.departureTime.minutes).padStart(2, "0")}` : "";
    delayValueInput.value = state.delay === "" ? "" : String(state.delay);
  };
  var setSavedFormValues = (formState) => {
    const stationOne = typeof formState.stationOne === "string" ? formatStationName(formState.stationOne) : exampleState.stations[0];
    const stationTwo = typeof formState.stationTwo === "string" ? formatStationName(formState.stationTwo) : exampleState.stations[1];
    const operator = normalizeOperator(formState.operator);
    const train = resolveTrainTypeValue(formState.train, operator) || exampleState.train;
    const departureTime = typeof formState.departureTime === "string" && DEPARTURE_TIME_PATTERN.test(formState.departureTime) ? formState.departureTime : `${String(exampleState.departureTime.hours).padStart(2, "0")}:${String(exampleState.departureTime.minutes).padStart(2, "0")}`;
    const parsedDelay = parseDelayMinutes(formState.delay);
    const delay = parsedDelay === null ? exampleState.delay : parsedDelay === "" ? "" : String(parsedDelay);
    const trainNumber = normalizeTrainNumber(formState.trainNumber);
    const target = formState.target && typeof formState.target === "object" ? formState.target : {
      platform: formState.platform,
      track: formState.track,
      sector: formState.sector
    };
    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    platformInput.value = typeof target.platform === "string" ? target.platform.slice(0, 20) : exampleState.target.platform;
    trackInput.value = typeof target.track === "string" ? target.track.slice(0, 20) : exampleState.target.track;
    sectorInput.value = typeof target.sector === "string" ? target.sector.slice(0, 20) : exampleState.target.sector;
    operatorInput.value = operator;
    trainTypeInput.value = train;
    trainNumberInput.value = trainNumber;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
  };
  var getLightingSettingsState = () => ({
    lamps: lighting.getLampSettings(),
    clockLight: lighting.getClockSettings(),
    nightMode,
    autoNightMode,
    flapTiming: { ...flapTiming },
    departureBoardRows,
    delayOffset,
    departureBoardLogo,
    departureBoardLogoSvg,
    lenses: getManagedLensState()
  });
  var normalizeManagedLensState = (value) => {
    const fallback = createDefaultLensState();
    const source = value && typeof value === "object" ? value : fallback;
    return {
      ...source,
      lenses: Array.isArray(source.lenses) ? source.lenses.map((lens, index) => ({
        ...lens,
        blinking: true,
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
  var getManagedLensState = () => normalizeManagedLensState(lensDisplay.getValue());
  var getSettingsState = () => ({
    ...getLightingSettingsState(),
    lenses: getManagedLensState()
  });
  var getDraftFormState = () => ({
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
  var normalizePlatformValue = (value) => {
    const normalized = String(value ?? "").trim();
    return DEPARTURE_PLATFORM_VALUES.includes(normalized) ? normalized : "";
  };
  var normalizeTrackValue = (value) => {
    const normalized = String(value ?? "").trim();
    return DEPARTURE_TRACK_VALUES.includes(normalized) ? normalized : "";
  };
  var normalizeSectorValue = (value) => {
    const normalized = String(value ?? "").trim();
    return DEPARTURE_SECTOR_VALUES.includes(normalized) ? normalized : "";
  };
  var normalizeDeparture = (value) => {
    const nestedState = value?.state && typeof value.state === "object" ? value.state : null;
    const source = nestedState ? {
      ...nestedState,
      ...value,
      target: value.target ?? nestedState.target
    } : value || {};
    const desiredById = value?.id ? Object.values(desiredStates).find(
      (candidate) => candidate?.target && getBoardIdentityKey(candidate.target) === String(value.id)
    ) : null;
    const desired = desiredById || (source.target ? desiredStates[getBoardIdentityKey(source.target)] : null);
    const desiredState = desired?.state || {};
    const target = {
      platform: normalizePlatformValue(
        value?.target?.platform || source.platform || desired?.target?.platform || ""
      ),
      track: String(
        value?.target?.track || source.track || desired?.target?.track || ""
      ).trim(),
      sector: normalizeSectorValue(
        value?.target?.sector || source.sector || desired?.target?.sector || ""
      )
    };
    target.track = normalizeTrackValue(target.track);
    const departureTime = normalizeDepartureTime(source.departureTime) || normalizeDepartureTime(desiredState.departureTime);
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
    const stations = Array.isArray(source.stations) ? source.stations : [];
    const isLive = source.source === "live" || Boolean(source.liveKey);
    const liveKey = isLive ? String(source.liveKey || source.id || "") : "";
    const manualId = String(source.id || "").trim() || (target.platform && target.track ? getBoardIdentityKey(target) : `manual:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`);
    const sourceTrainNumber = isLive ? String(source.sourceTrainNumber || "").replace(/\D/g, "") : "";
    return {
      id: isLive ? String(source.id || `live:${liveKey}`) : manualId,
      source: isLive ? "live" : "manual",
      liveKey,
      liveStationKey: isLive ? String(source.liveStationKey || LIVE_STATION_DEFAULTS.key) : "",
      dateKey: isLive ? String(source.dateKey || "") : "",
      sourceTrainNumber,
      target,
      stations: [
        formatStationName(
          stations[0] || source.stationOne || desiredState.stations?.[0] || ""
        ),
        formatStationName(
          stations[1] || source.stationTwo || desiredState.stations?.[1] || ""
        )
      ],
      train,
      trainNumber,
      operator,
      delay: parsedDelay === null ? "" : parsedDelay,
      departureTime,
      lenses: normalizeManagedLensState(
        source.lenses ?? desiredState.lenses
      ),
      revision: Number(value?.revision) || 0,
      updatedAt: Number(value?.updatedAt) || 0
    };
  };
  departures = departures.map(normalizeDeparture).filter((departure) => departure.departureTime);
  var persistState = () => {
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
        sourceUrl: liveSourceUrl,
        pollIntervalMs: livePollIntervalMs
      },
      revision: nextRevision,
      globalResetRevision,
      sort: sortState
    });
  };
  var publishDepartureSnapshot = () => {
    transport.publish("manage:departures", {
      departures: departures.map((departure) => ({
        ...departure,
        target: { ...departure.target },
        stations: [...departure.stations],
        departureTime: departure.departureTime ? { ...departure.departureTime } : null,
        lenses: departure.lenses ? {
          ...departure.lenses,
          lenses: departure.lenses.lenses.map((lens) => ({ ...lens })),
          preDeparture: { ...departure.lenses.preDeparture }
        } : createDefaultLensState()
      })),
      revision: nextRevision
    });
  };
  var publishSettings = ({ persist = true } = {}) => {
    if (persist) {
      persistState();
    }
    transport.publish("board:settings", getLightingSettingsState());
  };
  var syncFlapTimingControls = () => {
    if (!flapTimingDurationInput || !flapTimingVariationInput) {
      return;
    }
    flapTimingDurationInput.min = String(FLAP_TIMING_DURATION_MIN);
    flapTimingDurationInput.max = String(FLAP_TIMING_DURATION_MAX);
    flapTimingDurationInput.step = "10";
    flapTimingVariationInput.min = String(FLAP_TIMING_VARIATION_MIN);
    flapTimingVariationInput.max = String(FLAP_TIMING_VARIATION_MAX);
    flapTimingDurationInput.value = String(flapTiming.duration);
    flapTimingVariationInput.value = String(flapTiming.variation);
    flapTimingDurationOutput.textContent = `${flapTiming.duration} ms`;
    flapTimingVariationOutput.textContent = `\xB1${flapTiming.variation} ms`;
  };
  var updateFlapTimingFromControls = () => {
    flapTiming = normalizeFlapTiming({
      duration: flapTimingDurationInput.value,
      variation: flapTimingVariationInput.value
    });
    syncFlapTimingControls();
    publishSettings();
  };
  var syncDelayOffsetControls = () => {
    if (!delayOffsetEnabledInput) {
      return;
    }
    delayOffsetEnabledInput.checked = delayOffset;
  };
  var updateDelayOffsetFromControls = () => {
    delayOffset = normalizeDelayOffset(delayOffsetEnabledInput.checked);
    syncDelayOffsetControls();
    publishSettings();
    renderDeparturesTable();
  };
  var syncDepartureBoardRowControls = () => {
    if (!departureBoardRowsInput) {
      return;
    }
    departureBoardRowsInput.min = String(DEPARTURE_BOARD_ROW_COUNT_MIN);
    departureBoardRowsInput.max = String(DEPARTURE_BOARD_ROW_COUNT_MAX);
    departureBoardRowsInput.value = String(departureBoardRows);
  };
  var updateDepartureBoardRowsFromControls = () => {
    departureBoardRows = normalizeDepartureBoardRowCount(
      departureBoardRowsInput.value
    );
    syncDepartureBoardRowControls();
    publishSettings();
  };
  var applyDisplayedLogos = () => {
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
        departureBoardLogoCustomPreview.removeAttribute("src");
      }
    }
    if (departureBoardLogoCustomPlaceholder) {
      departureBoardLogoCustomPlaceholder.hidden = Boolean(customSrc);
    }
  };
  var syncDepartureBoardLogoControls = () => {
    departureBoardLogoInputs.forEach((input) => {
      input.checked = input.value === departureBoardLogo;
    });
    if (departureBoardLogoSvgInput && departureBoardLogoSvgInput.value !== departureBoardLogoSvg) {
      departureBoardLogoSvgInput.value = departureBoardLogoSvg;
    }
    applyDisplayedLogos();
  };
  var updateDepartureBoardLogoFromControls = () => {
    const selected = departureBoardLogoInputs.find((input) => input.checked);
    departureBoardLogo = normalizeDepartureBoardLogoId(
      selected?.value ?? DEPARTURE_BOARD_LOGO_DEFAULT
    );
    departureBoardLogoSvg = String(departureBoardLogoSvgInput?.value || "").trim().slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
    applyDisplayedLogos();
    publishSettings();
  };
  var updateDepartureBoardLogoSvgFromControls = () => {
    departureBoardLogo = DEPARTURE_BOARD_LOGO_CUSTOM_ID;
    departureBoardLogoSvg = String(departureBoardLogoSvgInput?.value || "").trim().slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
    syncDepartureBoardLogoControls();
    publishSettings();
  };
  var getFormTarget = () => normalizeBoardIdentity({
    platform: platformInput.value,
    track: trackInput.value,
    sector: sectorInput.value
  });
  var formatDepartureTime = (departureTime) => {
    if (!departureTime) {
      return "\u2014";
    }
    return `${String(departureTime.hours).padStart(2, "0")}:${String(departureTime.minutes).padStart(2, "0")}`;
  };
  var isDepartureBoardPresence = (boardPresence) => boardPresence?.page === "departureBoard";
  var findMatchingBoards = (target) => [...activeBoards.values()].filter(
    (boardPresence) => !isDepartureBoardPresence(boardPresence) && identitiesMatch(boardPresence.identity, target)
  );
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
  var clearLensActivationTimer = () => {
    if (lensActivationTimer !== null) {
      window.clearTimeout(lensActivationTimer);
      lensActivationTimer = null;
    }
  };
  var scheduleLensActivation = () => {
    clearLensActivationTimer();
    const now = Date.now();
    const nextActivation = departures.map(getPreDepartureActivationTime).filter((value) => value !== null && value > now).sort((first, second) => first - second)[0];
    if (nextActivation === void 0) {
      return;
    }
    lensActivationTimer = window.setTimeout(() => {
      lensActivationTimer = null;
      renderDeparturesTable();
    }, Math.max(0, nextActivation - now) + 10);
  };
  var getLensPresentation = (departure, now = Date.now(), rowIndex = 0) => {
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
  var renderDeparturesTable = () => {
    if (!departuresTableBody || !departuresEmptyState) {
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const rows = [...departures].sort((first, second) => {
      const getValue = (departure) => {
        switch (sortState.key) {
          case "stationOne":
            return departure.stations[0];
          case "stationTwo":
            return departure.stations[1];
          case "train":
            return departure.train;
          case "trainNumber":
            return departure.trainNumber;
          case "operator":
            return departure.operator;
          case "delay":
            return Number(departure.delay || 0);
          case "platform":
            return departure.target.platform;
          case "track":
            return departure.target.track;
          case "sector":
            return departure.target.sector;
          case "departureTime":
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
      const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "cs", {
        sensitivity: "base",
        numeric: true
      });
      return (sortState.direction === "desc" ? -1 : 1) * comparison || first.id.localeCompare(second.id);
    });
    departuresTableBody.replaceChildren();
    const boardOrder = [...departures].sort(
      (first, second) => compareDeparturesByTime(first, second, now, delayOffset)
    );
    rows.forEach((departure) => {
      const row = documentRef.createElement("tr");
      const lensCell = documentRef.createElement("td");
      lensCell.className = "departure-lens-status";
      const boardRowIndex = Math.max(
        0,
        boardOrder.findIndex((item) => item.id === departure.id)
      );
      getLensPresentation(departure, now, boardRowIndex).forEach((lens, index) => {
        const symbol = documentRef.createElement("span");
        symbol.className = "lens-status-symbol";
        symbol.classList.toggle("is-on", lens.on);
        symbol.classList.toggle("is-blinking", lens.blinking);
        symbol.style.setProperty("--status-color", lens.color);
        symbol.style.setProperty(
          "--lens-blink-duration",
          `${lens.blinkInterval * 2}s`
        );
        symbol.style.setProperty(
          "--lens-blink-delay",
          `${-lens.animationPhase}s`
        );
        symbol.textContent = "\u25CF";
        symbol.setAttribute(
          "aria-label",
          `${index + 1}. \u010Do\u010Dka ${lens.on ? "sv\xEDt\xED" : "nesv\xEDt\xED"}`
        );
        lensCell.appendChild(symbol);
      });
      row.appendChild(lensCell);
      [
        departure.stations[0],
        departure.stations[1],
        departure.train || "\u2014",
        departure.trainNumber || "\u2014",
        departure.operator || "\u2014",
        formatDepartureTime(departure.departureTime),
        departure.delay === "" ? "\u2014" : `${departure.delay} min`,
        departure.target.platform || "\u2014",
        departure.target.track || "\u2014",
        departure.target.sector || "cel\xE1 kolej"
      ].forEach((value) => {
        const cell = documentRef.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      const actionsCell = documentRef.createElement("td");
      actionsCell.className = "departure-row-actions";
      const loadButton = documentRef.createElement("button");
      loadButton.type = "button";
      loadButton.dataset.departureAction = "load";
      loadButton.dataset.departureId = departure.id;
      loadButton.textContent = "Na\u010D\xEDst";
      const resetButton = documentRef.createElement("button");
      resetButton.type = "button";
      resetButton.dataset.departureAction = "reset";
      resetButton.dataset.departureId = departure.id;
      resetButton.textContent = "Smazat a resetovat";
      actionsCell.append(loadButton, resetButton);
      row.appendChild(actionsCell);
      departuresTableBody.appendChild(row);
    });
    departuresEmptyState.hidden = rows.length > 0;
    departuresTable.hidden = rows.length === 0;
    if (clearAllDeparturesButton) {
      const disabled = rows.length === 0;
      clearAllDeparturesButton.disabled = disabled;
      clearAllDeparturesButton.setAttribute("aria-disabled", String(disabled));
    }
    scheduleLensActivation();
    departuresTable.querySelectorAll("[data-sort-key]").forEach((button) => {
      const header = button.closest("th");
      const isActive = button.dataset.sortKey === sortState.key;
      header?.setAttribute(
        "aria-sort",
        isActive ? sortState.direction === "asc" ? "ascending" : "descending" : "none"
      );
      button.dataset.sortDirection = isActive ? sortState.direction : "";
      header?.classList.toggle("is-sorted", isActive);
    });
  };
  var toggleBoardIdentification = (boardPresence) => {
    if (!boardPresence) {
      return;
    }
    const forceOn = boardPresence.identificationActive !== true;
    const requestId = transport.publish("board:command", {
      action: "identify-lenses",
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
        "Tabule nepotvrdila zm\u011Bnu identifika\u010Dn\xEDho svitu \u010Do\u010Dek.",
        true
      );
    }, 5e3);
    boardPresence.identificationPending = true;
    pendingIdentificationActions.set(requestId, {
      boardPresence,
      timeout
    });
    renderActiveBoards();
  };
  var createEyeIcon = (isOpen) => {
    const icon = documentRef.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    icon.classList.add("identify-eye-icon");
    icon.classList.toggle("is-open", isOpen);
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = isOpen ? '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.5"></circle>' : '<path d="M3 3l18 18"></path><path d="M5.3 7.1C3.2 8.5 2 10.4 2 12c0 0 3.6 6 10 6 1.8 0 3.4-.4 4.8-1"></path><path d="M18.7 16.9C20.8 15.5 22 13.6 22 12c0 0-3.6-6-10-6-1.8 0-3.4.4-4.8 1"></path>';
    return icon;
  };
  var activeBoardRenderDeferred = false;
  var normalizeBoardVolume = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 100;
    }
    return Math.min(100, Math.max(0, Math.round(numeric)));
  };
  var formatBoardConnection = (connection) => {
    if (connection?.channel !== "network") {
      return "lok\xE1ln\u011B, tab prohl\xED\u017Ee\u010De";
    }
    const network = connection.network || "";
    const client = connection.client || "";
    if (network && client && network !== client) {
      return `p\u0159es s\xED\u0165 ${network}, po\u010D\xEDta\u010D ${client}`;
    }
    if (network || client) {
      return `p\u0159es s\xED\u0165 ${network || client}`;
    }
    return "p\u0159es s\xED\u0165";
  };
  var renderActiveBoards = () => {
    if (!activeBoardsList) {
      return;
    }
    if (document.activeElement?.classList?.contains("board-volume-range")) {
      activeBoardRenderDeferred = true;
      return;
    }
    activeBoardRenderDeferred = false;
    activeBoardsList.replaceChildren();
    const values = [...activeBoards.values()].sort((first, second) => formatBoardIdentity(first.identity).localeCompare(
      formatBoardIdentity(second.identity),
      "cs"
    ));
    if (values.length === 0) {
      const empty = documentRef.createElement("p");
      empty.className = "manage-empty-state";
      empty.textContent = "Zat\xEDm nebyla nalezena \u017E\xE1dn\xE1 tabule.";
      activeBoardsList.appendChild(empty);
      return;
    }
    values.forEach((boardPresence) => {
      const isDepartureBoard = isDepartureBoardPresence(boardPresence);
      const item = documentRef.createElement("div");
      item.className = "active-board-item";
      item.classList.toggle("is-departure-board", isDepartureBoard);
      item.classList.toggle(
        "is-unconfigured",
        !isDepartureBoard && boardPresence.configured === false
      );
      const identity = documentRef.createElement("strong");
      identity.textContent = isDepartureBoard ? "Odjezdov\xE1 tabule" : boardPresence.configured === false ? "Tabule bez identity" : formatBoardIdentity(boardPresence.identity);
      const details = documentRef.createElement("span");
      details.className = "active-board-details";
      const instanceLine = documentRef.createElement("span");
      instanceLine.textContent = `${isDepartureBoard ? `${boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT} \u0159\xE1dk\u016F` : "n\xE1stupi\u0161tn\xED tabule"} \xB7 instance ${boardPresence.instanceId || "\u2014"}`;
      const connectionLine = documentRef.createElement("span");
      connectionLine.className = "active-board-connection";
      connectionLine.classList.toggle(
        "is-network",
        boardPresence.connection?.channel === "network"
      );
      const connectionText = documentRef.createElement("span");
      connectionText.className = "active-board-connection-text";
      connectionText.textContent = formatBoardConnection(
        boardPresence.connection
      );
      const userAgent = documentRef.createElement("span");
      userAgent.className = "active-board-user-agent";
      userAgent.textContent = boardPresence.userAgent || "";
      userAgent.title = boardPresence.userAgent || "";
      userAgent.hidden = !boardPresence.userAgent;
      connectionLine.append(connectionText, userAgent);
      details.append(instanceLine);
      const status = documentRef.createElement("span");
      status.className = "active-board-status";
      status.textContent = !isDepartureBoard && boardPresence.configured === false ? "Nen\xED nakonfigurovan\xE1" : "Online";
      const audioStatus = documentRef.createElement("span");
      const audioMuted = boardPresence.audioState?.muted === true;
      const audioUnlocked = boardPresence.audioState?.unlocked === true;
      audioStatus.className = "active-board-audio";
      audioStatus.textContent = audioMuted ? "\u{1F507}" : audioUnlocked ? "\u{1F50A}" : "\u{1F508}";
      audioStatus.title = audioMuted ? "Zvuk flap\u016F je ztlumen\xFD" : audioUnlocked ? "P\u0159ehr\xE1v\xE1n\xED zvuku je povolen\xE9" : "P\u0159ehr\xE1v\xE1n\xED zvuku \u010Dek\xE1 na kliknut\xED do tabule";
      audioStatus.setAttribute("role", "img");
      audioStatus.setAttribute(
        "aria-label",
        audioMuted ? "Zvuk ztlumen" : audioUnlocked ? "Zvuk povolen" : "Zvuk nepovolen"
      );
      const actions = documentRef.createElement("div");
      actions.className = "active-board-actions";
      const identifyButton = documentRef.createElement("button");
      identifyButton.type = "button";
      identifyButton.className = "identify-board-button";
      identifyButton.dataset.boardInstanceId = boardPresence.instanceId;
      identifyButton.replaceChildren(
        createEyeIcon(boardPresence.identificationActive === true)
      );
      identifyButton.disabled = boardPresence.configured === false;
      identifyButton.setAttribute(
        "aria-pressed",
        String(boardPresence.identificationActive === true)
      );
      identifyButton.setAttribute(
        "aria-label",
        boardPresence.identificationActive ? "Vr\xE1tit \u010Do\u010Dky do p\u016Fvodn\xEDho stavu" : "Force rozsv\xEDtit \u010Do\u010Dky pro identifikaci tabule"
      );
      const muteButton = documentRef.createElement("button");
      muteButton.type = "button";
      muteButton.className = "mute-board-button";
      muteButton.dataset.boardInstanceId = boardPresence.instanceId;
      muteButton.replaceChildren(createSpeakerIcon(audioMuted));
      muteButton.setAttribute("aria-pressed", String(audioMuted));
      muteButton.setAttribute(
        "aria-label",
        audioMuted ? "Zapnout zvuk flap\u016F na t\xE9to tabuli" : "Ztlumit zvuk flap\u016F na t\xE9to tabuli"
      );
      const audioVolume = normalizeBoardVolume(boardPresence.audioState?.volume);
      const volumeControl = documentRef.createElement("label");
      volumeControl.className = "board-volume";
      const volumeText = documentRef.createElement("span");
      volumeText.textContent = "Hlasitost";
      const volumeRange = documentRef.createElement("input");
      volumeRange.type = "range";
      volumeRange.className = "board-volume-range";
      volumeRange.min = "0";
      volumeRange.max = "100";
      volumeRange.step = "1";
      volumeRange.value = String(audioVolume);
      volumeRange.dataset.boardInstanceId = boardPresence.instanceId;
      volumeRange.setAttribute(
        "aria-label",
        "Hlasitost zvuku flap\u016F na t\xE9to tabuli"
      );
      const volumeOutput = documentRef.createElement("output");
      volumeOutput.textContent = `${audioVolume} %`;
      volumeRange.addEventListener("input", () => {
        volumeOutput.textContent = `${volumeRange.value} %`;
        setBoardVolume(boardPresence, volumeRange.value);
      });
      volumeRange.addEventListener("change", () => {
        setBoardFormStatus(
          `Hlasitost tabule nastavena na ${volumeRange.value} %.`
        );
      });
      volumeRange.addEventListener("blur", () => {
        if (activeBoardRenderDeferred) {
          renderActiveBoards();
        }
      });
      volumeControl.append(volumeText, volumeRange, volumeOutput);
      actions.append(identifyButton, volumeControl, muteButton);
      item.append(identity, details, status, audioStatus, actions, connectionLine);
      activeBoardsList.appendChild(item);
    });
  };
  var createSpeakerIcon = (muted) => {
    const icon = documentRef.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    icon.classList.add("board-audio-icon");
    icon.classList.toggle("is-muted", muted);
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = muted ? '<path d="M4 10h3l4-4v12l-4-4H4z"></path><path d="M16 10l4 4"></path><path d="M20 10l-4 4"></path>' : '<path d="M4 10h3l4-4v12l-4-4H4z"></path><path d="M16 9.5a4 4 0 0 1 0 5"></path><path d="M18.2 7a7 7 0 0 1 0 10"></path>';
    return icon;
  };
  var setBoardVolume = (boardPresence, volume) => {
    if (!boardPresence) {
      return;
    }
    const nextVolume = normalizeBoardVolume(volume);
    boardPresence.audioState = {
      ...boardPresence.audioState || {},
      volume: nextVolume
    };
    transport.publish("board:command", {
      action: "set-audio-volume",
      volume: nextVolume
    }, {
      target: {
        source: boardPresence.instanceId
      }
    });
  };
  var toggleBoardMute = (boardPresence) => {
    if (!boardPresence) {
      return;
    }
    const muted = boardPresence.audioState?.muted !== true;
    boardPresence.audioState = {
      ...boardPresence.audioState || {},
      muted
    };
    renderActiveBoards();
    transport.publish("board:command", {
      action: "set-audio-muted",
      muted
    }, {
      target: {
        source: boardPresence.instanceId
      }
    });
    setBoardFormStatus(
      muted ? "Zvuk flap\u016F na tabuli je ztlumen\xFD." : "Zvuk flap\u016F na tabuli je zapnut\xFD."
    );
  };
  activeBoardsList?.addEventListener("click", (event) => {
    const muteButton = event.target.closest(".mute-board-button");
    if (muteButton) {
      const boardPresence2 = [...activeBoards.values()].find(
        (presence) => presence.instanceId === muteButton.dataset.boardInstanceId
      );
      toggleBoardMute(boardPresence2);
      return;
    }
    const button = event.target.closest(".identify-board-button");
    if (!button) {
      return;
    }
    const boardPresence = [...activeBoards.values()].find(
      (presence) => presence.instanceId === button.dataset.boardInstanceId
    );
    toggleBoardIdentification(boardPresence);
  });
  var getDepartureById = (id) => departures.find((departure) => departure.id === id);
  var loadDepartureIntoForm = (departure) => {
    if (!departure) {
      return;
    }
    formDepartureId = departure.id;
    formDepartureLocked = true;
    setFormValues(departure);
    lensDisplay.set(departure.lenses);
    syncLensControls();
    setBoardFormStatus(
      `Odjezd pro ${formatBoardIdentity(departure.target)} na\u010Dten do formul\xE1\u0159e.`
    );
  };
  var nextStateRevision = () => {
    nextRevision += 1;
    return nextRevision;
  };
  var setDesiredState = (target, action, state, revision) => {
    desiredStates[getBoardIdentityKey(target)] = {
      target,
      action,
      state,
      revision,
      updatedAt: Date.now()
    };
  };
  TRAIN_TYPES.forEach((type) => {
    const option = documentRef.createElement("option");
    option.value = type.name;
    option.textContent = type.label || type.name || "Bez typu vlaku";
    trainTypeInput.appendChild(option);
  });
  DEPARTURE_PLATFORM_VALUES.slice(1).forEach((platform) => {
    const option = documentRef.createElement("option");
    option.value = platform;
    option.textContent = platform;
    platformInput.appendChild(option);
  });
  DEPARTURE_TRACK_VALUES.slice(1).forEach((track) => {
    const option = documentRef.createElement("option");
    option.value = track;
    option.textContent = track;
    trackInput.appendChild(option);
  });
  DEPARTURE_SECTOR_VALUES.slice(1).forEach((sector) => {
    const option = documentRef.createElement("option");
    option.value = sector;
    option.textContent = sector;
    sectorInput.appendChild(option);
  });
  var lampControlElements = /* @__PURE__ */ new Map();
  var syncLampControls = (setting) => {
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
  var readLampControls = (id) => {
    const controls = lampControlElements.get(id);
    return {
      enabled: controls.enabled.checked,
      variation: controls.variation.checked,
      intensity: Number(controls.intensity.value),
      speed: Number(controls.speed.value),
      fade: controls.fade.value
    };
  };
  var updateLampFromControls = (id) => {
    lighting.updateLamp(id, readLampControls(id));
    syncLampControls(lighting.getLampSettings()[id]);
    publishSettings();
  };
  NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
    const panel = documentRef.createElement("fieldset");
    panel.className = "lamp-control";
    const legend = documentRef.createElement("legend");
    legend.textContent = defaultSetting.label;
    const legendWrapper = documentRef.createElement("div");
    legendWrapper.appendChild(legend);
    panel.appendChild(legendWrapper);
    const toggles = documentRef.createElement("div");
    toggles.className = "lamp-control-toggles";
    const enabledLabel = documentRef.createElement("label");
    enabledLabel.className = "lamp-control-check";
    const enabled = documentRef.createElement("input");
    enabled.type = "checkbox";
    enabledLabel.append(enabled, documentRef.createTextNode(" Sv\xEDt\xED"));
    const variationLabel = documentRef.createElement("label");
    variationLabel.className = "lamp-control-check";
    const variation = documentRef.createElement("input");
    variation.type = "checkbox";
    variationLabel.append(variation, documentRef.createTextNode(" S efektem"));
    toggles.append(enabledLabel, variationLabel);
    const intensityLabel = documentRef.createElement("label");
    intensityLabel.className = "lamp-control-range";
    const intensityHeader = documentRef.createElement("span");
    intensityHeader.className = "lamp-control-range-header";
    intensityHeader.appendChild(documentRef.createTextNode("Intenzita"));
    const intensityOutput = documentRef.createElement("output");
    intensityHeader.appendChild(intensityOutput);
    const intensity = documentRef.createElement("input");
    intensity.type = "range";
    intensity.min = "0";
    intensity.max = "100";
    intensity.step = "1";
    intensityLabel.append(intensityHeader, intensity);
    const speedLabel = documentRef.createElement("label");
    speedLabel.className = "lamp-control-range";
    const speedHeader = documentRef.createElement("span");
    speedHeader.className = "lamp-control-range-header";
    speedHeader.appendChild(documentRef.createTextNode("D\xE9lka cyklu"));
    const speedOutput = documentRef.createElement("output");
    speedHeader.appendChild(speedOutput);
    const speed = documentRef.createElement("input");
    speed.type = "range";
    speed.min = "1";
    speed.max = "120";
    speed.step = "0.5";
    speedLabel.append(speedHeader, speed);
    const fadeLabel = documentRef.createElement("label");
    fadeLabel.className = "lamp-control-select";
    fadeLabel.appendChild(documentRef.createTextNode("Efekt"));
    const fade = documentRef.createElement("select");
    NIGHT_FADE_MODES.forEach((mode) => {
      const option = documentRef.createElement("option");
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
      input.addEventListener("input", () => updateLampFromControls(defaultSetting.id));
      input.addEventListener("change", () => updateLampFromControls(defaultSetting.id));
    });
  });
  var lensControlElements = /* @__PURE__ */ new Map();
  var syncLensControls = () => {
    const lensState = lensDisplay.getValue();
    const settings = lensState.lenses;
    const controls = lensControlElements.get("component");
    if (!controls || settings.length === 0) {
      return;
    }
    controls.enabled.checked = settings.some((setting) => setting.enabled);
    controls.blinking.checked = true;
    controls.synchronizeRows.checked = lensState.synchronizeRows !== false;
    controls.firstColor.value = settings[0].color;
    controls.secondColor.value = (settings[1] || settings[0]).color;
    controls.blinkInterval.value = String(LENS_DEFAULTS.blinkInterval);
    controls.blinkIntervalOutput.textContent = `${LENS_DEFAULTS.blinkInterval.toFixed(1)} s`;
    controls.preDepartureEnabled.checked = lensState.preDeparture.enabled;
    controls.preDepartureSeconds.value = String(
      lensState.preDeparture.seconds
    );
    controls.preDepartureSecondsOutput.textContent = `${lensState.preDeparture.seconds} s`;
  };
  var updateLensFromControls = () => {
    const controls = lensControlElements.get("component");
    const state = lensDisplay.getValue();
    state.lenses = state.lenses.map((lens, index) => ({
      ...lens,
      enabled: controls.enabled.checked,
      blinking: true,
      blinkInterval: LENS_DEFAULTS.blinkInterval,
      blinkDelay: index * LENS_DEFAULTS.blinkInterval,
      color: index === 0 ? controls.firstColor.value : controls.secondColor.value
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
  var createLensColorSelect = (labelText) => {
    const label = documentRef.createElement("label");
    label.className = "lamp-control-select lens-control-select";
    label.appendChild(documentRef.createTextNode(labelText));
    const select = documentRef.createElement("select");
    Object.entries(LENS_COLORS).forEach(([value, color]) => {
      const option = documentRef.createElement("option");
      option.value = value;
      option.textContent = color.label;
      select.appendChild(option);
    });
    label.appendChild(select);
    return { label, select };
  };
  if (lensControls) {
    const panel = documentRef.createElement("div");
    panel.className = "lens-component-controls";
    const toggles = documentRef.createElement("div");
    toggles.className = "lamp-control-toggles";
    const enabledLabel = documentRef.createElement("label");
    enabledLabel.className = "lamp-control-check";
    const enabled = documentRef.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = true;
    enabledLabel.append(enabled, documentRef.createTextNode(" Sv\xEDt\xED"));
    const blinkingLabel = documentRef.createElement("label");
    blinkingLabel.className = "lamp-control-check";
    const blinking = documentRef.createElement("input");
    blinking.type = "checkbox";
    blinking.checked = true;
    blinking.disabled = true;
    blinking.setAttribute("disabled", "disabled");
    blinking.readOnly = true;
    blinking.setAttribute("aria-readonly", "true");
    blinking.title = "Blik\xE1n\xED je v\u017Edy zapnut\xE9";
    blinking.addEventListener("click", (event) => {
      event.preventDefault();
      blinking.checked = true;
    });
    blinking.addEventListener("keydown", (event) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        blinking.checked = true;
      }
    });
    blinkingLabel.append(blinking, documentRef.createTextNode(" Blik\xE1"));
    const synchronizeRowsLabel = documentRef.createElement("label");
    synchronizeRowsLabel.className = "lamp-control-check";
    const synchronizeRows = documentRef.createElement("input");
    synchronizeRows.type = "checkbox";
    synchronizeRows.checked = true;
    synchronizeRowsLabel.append(
      synchronizeRows,
      documentRef.createTextNode(" Stejn\xE1 strana ve v\u0161ech \u0159\xE1dc\xEDch")
    );
    const preDepartureEnabledLabel = documentRef.createElement("label");
    preDepartureEnabledLabel.className = "lamp-control-check";
    const preDepartureEnabled = documentRef.createElement("input");
    preDepartureEnabled.type = "checkbox";
    preDepartureEnabled.checked = true;
    preDepartureEnabledLabel.append(
      preDepartureEnabled,
      documentRef.createTextNode(" Rozblikat p\u0159ed odjezdem")
    );
    toggles.append(
      enabledLabel,
      blinkingLabel,
      synchronizeRowsLabel,
      preDepartureEnabledLabel
    );
    const firstColor = createLensColorSelect("Barva 1. \u010Do\u010Dky");
    const secondColor = createLensColorSelect("Barva 2. \u010Do\u010Dky");
    const blinkIntervalLabel = documentRef.createElement("label");
    blinkIntervalLabel.className = "lamp-control-range";
    const blinkIntervalHeader = documentRef.createElement("span");
    blinkIntervalHeader.className = "lamp-control-range-header";
    blinkIntervalHeader.appendChild(
      documentRef.createTextNode("Interval blik\xE1n\xED")
    );
    const blinkIntervalOutput = documentRef.createElement("output");
    blinkIntervalHeader.appendChild(blinkIntervalOutput);
    const blinkInterval = documentRef.createElement("input");
    blinkInterval.type = "range";
    blinkInterval.min = String(LENS_BLINK_INTERVAL_MIN);
    blinkInterval.max = String(LENS_BLINK_INTERVAL_MAX);
    blinkInterval.step = "0.1";
    blinkInterval.value = String(LENS_DEFAULTS.blinkInterval);
    blinkInterval.disabled = true;
    blinkInterval.readOnly = true;
    blinkInterval.setAttribute("disabled", "disabled");
    blinkInterval.setAttribute("readonly", "readonly");
    blinkInterval.setAttribute("aria-readonly", "true");
    blinkInterval.title = "Interval je sjednocen\xFD pro v\u0161echny \u0159\xE1dky.";
    blinkIntervalLabel.append(blinkIntervalHeader, blinkInterval);
    const preDepartureSecondsLabel = documentRef.createElement("label");
    preDepartureSecondsLabel.className = "lamp-control-range";
    const preDepartureSecondsHeader = documentRef.createElement("span");
    preDepartureSecondsHeader.className = "lamp-control-range-header";
    preDepartureSecondsHeader.appendChild(
      documentRef.createTextNode("P\u0159ed odjezdem")
    );
    const preDepartureSecondsOutput = documentRef.createElement("output");
    preDepartureSecondsHeader.appendChild(preDepartureSecondsOutput);
    const preDepartureSeconds = documentRef.createElement("input");
    preDepartureSeconds.type = "range";
    preDepartureSeconds.min = String(LENS_PREDEPARTURE_SECONDS_MIN);
    preDepartureSeconds.max = String(LENS_PREDEPARTURE_SECONDS_MAX);
    preDepartureSeconds.step = String(LENS_PREDEPARTURE_SECONDS_STEP);
    preDepartureSecondsLabel.append(
      preDepartureSecondsHeader,
      preDepartureSeconds
    );
    const colorControls = documentRef.createElement("div");
    colorControls.className = "lens-control-stack";
    colorControls.append(firstColor.label, secondColor.label);
    const timingControls = documentRef.createElement("div");
    timingControls.className = "lens-control-stack";
    timingControls.append(blinkIntervalLabel, preDepartureSecondsLabel);
    panel.append(
      toggles,
      colorControls,
      timingControls
    );
    lensControls.replaceChildren(panel);
    lensControlElements.set("component", {
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
    ].forEach((input) => {
      input.addEventListener("input", updateLensFromControls);
      input.addEventListener("change", updateLensFromControls);
    });
    syncLensControls();
  }
  lampControls.appendChild(clockLightControl);
  var syncClockLightControls = () => {
    const settings = lighting.getClockSettings();
    clockLightEnabledInput.checked = settings.enabled;
    clockLightIntensityInput.value = String(settings.intensity);
    clockLightIntensityOutput.textContent = `${settings.intensity}%`;
  };
  var updateClockLightFromControls = ({ persist = false } = {}) => {
    lighting.setClockLight({
      enabled: clockLightEnabledInput.checked,
      intensity: Number(clockLightIntensityInput.value)
    });
    syncClockLightControls();
    publishSettings({ persist });
  };
  clockLightEnabledInput.addEventListener("input", updateClockLightFromControls);
  clockLightIntensityInput.addEventListener("input", updateClockLightFromControls);
  [clockLightEnabledInput, clockLightIntensityInput].forEach((input) => {
    input.addEventListener(
      "change",
      () => updateClockLightFromControls({ persist: true })
    );
  });
  flapTimingDurationInput.addEventListener("input", updateFlapTimingFromControls);
  flapTimingVariationInput.addEventListener("input", updateFlapTimingFromControls);
  syncFlapTimingControls();
  delayOffsetEnabledInput?.addEventListener("change", updateDelayOffsetFromControls);
  syncDelayOffsetControls();
  departureBoardRowsInput?.addEventListener(
    "input",
    updateDepartureBoardRowsFromControls
  );
  departureBoardRowsInput?.addEventListener(
    "change",
    updateDepartureBoardRowsFromControls
  );
  syncDepartureBoardRowControls();
  departureBoardLogoInputs.forEach((input) => {
    input.addEventListener("change", updateDepartureBoardLogoFromControls);
  });
  departureBoardLogoSvgInput?.addEventListener(
    "input",
    updateDepartureBoardLogoSvgFromControls
  );
  syncDepartureBoardLogoControls();
  var renderNightMode = () => {
    documentRef.body.classList.toggle("manage-night-mode", nightMode);
    lampSettingsPanel.hidden = !nightMode;
    autoNightModeInput.checked = autoNightMode;
    nightModeButton.disabled = autoNightMode;
    nightModeButton.setAttribute("aria-disabled", String(autoNightMode));
    nightModeButton.textContent = nightMode ? "\u2600\uFE0F Denn\xED re\u017Eim" : "\u{1F319} No\u010Dn\xED re\u017Eim";
    nightModeButton.setAttribute("aria-pressed", String(nightMode));
  };
  var setNightMode = (isNight, { persist = true, publish = true } = {}) => {
    nightMode = Boolean(isNight);
    renderNightMode();
    if (publish) {
      publishSettings({ persist });
    } else if (persist) {
      persistState();
    }
  };
  var sunSchedule = new SunSchedule({
    onChange: (isNight) => {
      if (!autoNightMode) {
        return;
      }
      setNightMode(isNight);
    }
  });
  var syncAutomaticNightMode = () => {
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
  var handleVisibilityChange = () => {
    if (!documentRef.hidden) {
      syncAutomaticNightMode();
    }
  };
  documentRef.addEventListener("visibilitychange", handleVisibilityChange);
  var setAutomaticNightMode = (isEnabled, { persist = true, publish = true } = {}) => {
    autoNightMode = Boolean(isEnabled);
    renderNightMode();
    syncAutomaticNightMode();
    if (publish) {
      publishSettings({ persist });
    } else if (persist) {
      persistState();
    }
  };
  nightModeButton.addEventListener("click", () => {
    setNightMode(!nightMode);
    setBoardFormStatus(
      nightMode ? "No\u010Dn\xED re\u017Eim zapnut." : "Denn\xED re\u017Eim zapnut."
    );
  });
  autoNightModeInput.addEventListener("change", () => {
    setAutomaticNightMode(autoNightModeInput.checked);
    setBoardFormStatus(
      autoNightMode ? nightMode ? "No\u010Dn\xED re\u017Eim podle slunce." : "Denn\xED re\u017Eim podle slunce." : "Automatick\xFD re\u017Eim podle slunce vypnut."
    );
  });
  resetLampSettingsButton.addEventListener("click", () => {
    lighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach(
      (setting) => syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    publishSettings();
    setBoardFormStatus("V\xFDchoz\xED nastaven\xED sv\u011Btel obnoveno.");
  });
  var boardActionButtons = [
    submitButton,
    startButton,
    resetAllSettingsButton,
    clearAllDeparturesButton
  ];
  var setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.remove("is-updating");
    boardForm.setAttribute("aria-busy", "false");
    boardActionButtons.forEach((button) => {
      if (!button) {
        return;
      }
      const disabled = button === clearAllDeparturesButton && departures.length === 0;
      button.disabled = disabled;
      button.setAttribute("aria-disabled", String(disabled));
    });
    documentRef.querySelectorAll("[data-departure-action]").forEach((button) => {
      button.disabled = false;
      button.setAttribute("aria-disabled", "false");
    });
  };
  var getDesiredStateForBoard = (identity) => {
    const matching = Object.values(desiredStates).filter((desired) => identitiesMatch(identity, desired.target));
    if (globalResetRevision > 0) {
      matching.push({
        action: "reset-all",
        state: getEmptyState(),
        revision: globalResetRevision,
        target: null
      });
    }
    return matching.sort(
      (first, second) => Number(second.revision) - Number(first.revision)
    )[0];
  };
  var syncBoardPresence = (boardPresence) => {
    if (boardPresence.configured === false) {
      return;
    }
    const desired = getDesiredStateForBoard(boardPresence.identity);
    if (!desired || Number(desired.revision) <= Number(
      boardPresence.appliedRevision || 0
    ) || boardPresence.lastSyncedRevision === desired.revision) {
      return;
    }
    if (boardPresence.syncPendingRevision === desired.revision && Date.now() - boardPresence.syncPendingAt < 8e3) {
      return;
    }
    transport.publish("board:command", {
      action: desired.action,
      ...desired.target ? { target: desired.target } : {},
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
  var updateBoardPresence = (message) => {
    const payload = message.payload || {};
    const page = payload.page || "platformTable";
    const isDepartureBoard = page === "departureBoard";
    const identity = normalizeBoardIdentity(payload.identity);
    const boardId = payload.boardId || (isDepartureBoard ? "departure-board" : getBoardIdentityKey(identity));
    const instanceId = payload.instanceId || message.source;
    const key = `${page}:${boardId}:${instanceId}`;
    const oldEntry = [...activeBoards.entries()].find(
      ([, presence]) => presence.instanceId === instanceId
    );
    if (oldEntry && oldEntry[0] !== key) {
      activeBoards.delete(oldEntry[0]);
    }
    const previous = activeBoards.get(key) || oldEntry?.[1];
    const sameBoardIdentity = previous?.boardId === boardId && previous?.page === page;
    const previousLensState = JSON.stringify(previous?.lensState);
    const boardPresence = {
      ...previous,
      page,
      boardId,
      instanceId,
      identity,
      configured: isDepartureBoard || payload.configured !== false && Boolean(identity.platform && identity.track),
      rowCount: Number(payload.rowCount) || previous?.rowCount || 0,
      capabilities: payload.capabilities || previous?.capabilities || [],
      appliedRevision: Number(payload.appliedRevision) || previous?.appliedRevision || 0,
      lensState: payload.lensState || previous?.lensState || null,
      audioState: payload.audio || previous?.audioState || { available: false, unlocked: false },
      identificationActive: payload.identificationActive === true,
      identificationPending: sameBoardIdentity ? previous?.identificationPending === true : false,
      lastSeen: Date.now(),
      lastSyncedRevision: sameBoardIdentity ? previous?.lastSyncedRevision : null,
      syncPendingRevision: sameBoardIdentity ? previous?.syncPendingRevision : null,
      syncPendingAt: sameBoardIdentity ? previous?.syncPendingAt || 0 : 0,
      connection: message.delivery || previous?.connection || { channel: "local" },
      userAgent: typeof payload.userAgent === "string" && payload.userAgent.trim() ? payload.userAgent.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 400) : previous?.userAgent || ""
    };
    activeBoards.set(key, boardPresence);
    renderActiveBoards();
    if (previousLensState !== JSON.stringify(boardPresence.lensState) || !previous) {
      renderDeparturesTable();
    }
    if (!isDepartureBoard) {
      syncBoardPresence(boardPresence);
    }
  };
  var pruneActiveBoards = () => {
    const expiry = Date.now() - 12e3;
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
  var publishDiscovery = () => {
    transport.publish("manage:discover", {
      page: "platformTableManage",
      sentAt: Date.now()
    });
  };
  var finishBoardAction = (requestId, message) => {
    const pending = pendingActions.get(requestId);
    if (!pending) {
      return;
    }
    const instanceId = message.payload?.instanceId || message.source;
    if (pending.expectedInstances.size > 0 && !pending.expectedInstances.has(instanceId)) {
      return;
    }
    pending.acknowledgedInstances.add(instanceId);
    const boardPresence = [...activeBoards.values()].find(
      (presence) => presence.instanceId === instanceId
    );
    if (boardPresence) {
      boardPresence.appliedRevision = Number(message.payload?.revision) || boardPresence.appliedRevision;
      boardPresence.lensState = message.payload?.lensState || boardPresence.lensState;
      if (typeof message.payload?.identificationActive === "boolean") {
        boardPresence.identificationActive = message.payload.identificationActive;
      }
      boardPresence.lastSeen = Date.now();
      boardPresence.syncPendingRevision = null;
    }
    if (message.payload?.ok === false) {
      window.clearTimeout(pending.timeout);
      pendingActions.delete(requestId);
      setBoardActionBusy(false);
      setBoardFormStatus(
        message.payload.error || "Tabuli se nepoda\u0159ilo aktualizovat.",
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
  var finishBackgroundBoardAction = (requestId, message) => {
    const pending = pendingBackgroundActions.get(requestId);
    if (!pending) {
      return false;
    }
    const instanceId = message.payload?.instanceId || message.source;
    if (pending.expectedInstances.size > 0 && !pending.expectedInstances.has(instanceId)) {
      return true;
    }
    pending.acknowledgedInstances.add(instanceId);
    const boardPresence = [...activeBoards.values()].find(
      (presence) => presence.instanceId === instanceId
    );
    if (boardPresence) {
      boardPresence.appliedRevision = Number(message.payload?.revision) || boardPresence.appliedRevision;
      boardPresence.lensState = message.payload?.lensState || boardPresence.lensState;
      boardPresence.lastSeen = Date.now();
      boardPresence.syncPendingRevision = null;
    }
    if (message.payload?.ok === false || pending.acknowledgedInstances.size >= pending.expectedInstances.size) {
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
    if (message.type === "departure-board:hello") {
      publishDepartureSnapshot();
      return;
    }
    if (message.type === "board:ready" || message.type === "board:heartbeat") {
      updateBoardPresence(message);
      if (message.type === "board:ready") {
        transport.publish("board:settings", getLightingSettingsState());
      }
      return;
    }
    if (message.type === "board:mode") {
      if (typeof message.payload?.autoNightMode === "boolean") {
        autoNightMode = message.payload.autoNightMode;
      }
      if (typeof message.payload?.nightMode === "boolean" && !autoNightMode) {
        nightMode = message.payload.nightMode;
      }
      renderNightMode();
      persistState();
      syncAutomaticNightMode();
      return;
    }
    if (message.type === "command:ack") {
      const pendingIdentification = pendingIdentificationActions.get(
        message.requestId
      );
      if (pendingIdentification) {
        window.clearTimeout(pendingIdentification.timeout);
        pendingIdentificationActions.delete(message.requestId);
        pendingIdentification.boardPresence.identificationPending = false;
        if (message.payload?.ok === false) {
          setBoardFormStatus(
            message.payload.error || "\u010Co\u010Dky se nepoda\u0159ilo p\u0159epnout do identifika\u010Dn\xEDho re\u017Eimu.",
            true
          );
        } else {
          pendingIdentification.boardPresence.identificationActive = message.payload?.identificationActive === true;
          pendingIdentification.boardPresence.lensState = message.payload?.lensState || pendingIdentification.boardPresence.lensState;
          setBoardFormStatus(
            pendingIdentification.boardPresence.identificationActive ? "Identifika\u010Dn\xED svit \u010Do\u010Dek zapnut." : "\u010Co\u010Dky vr\xE1ceny do p\u016Fvodn\xEDho stavu."
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
        boardPresence.appliedRevision = Number(message.payload?.revision) || boardPresence.appliedRevision;
        boardPresence.lensState = message.payload?.lensState || boardPresence.lensState;
        if (typeof message.payload?.identificationActive === "boolean") {
          boardPresence.identificationActive = message.payload.identificationActive;
        }
        if (message.payload?.audio) {
          boardPresence.audioState = message.payload.audio;
        }
        boardPresence.lastSeen = Date.now();
        const desired = getDesiredStateForBoard(boardPresence.identity);
        if (desired && Number(desired.revision) <= boardPresence.appliedRevision) {
          boardPresence.lastSyncedRevision = desired.revision;
          boardPresence.syncPendingRevision = null;
        }
        renderActiveBoards();
        renderDeparturesTable();
      }
    }
  });
  var sendBoardAction = (action, state, completedMessage, {
    immediate = false,
    persist = true,
    target = null,
    revision = 0,
    onComplete,
    onTimeout
  } = {}) => {
    if (persist) {
      persistState();
    }
    if (completedMessage) {
      setBoardFormStatus(completedMessage);
    }
    const expectedInstances = new Set(
      target ? findMatchingBoards(target).map(
        (boardPresence) => boardPresence.instanceId
      ) : [...activeBoards.values()].filter(
        (boardPresence) => !isDepartureBoardPresence(boardPresence)
      ).map(
        (boardPresence) => boardPresence.instanceId
      )
    );
    const requestId = transport.publish("board:command", {
      action,
      state,
      ...target ? { target } : {},
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
    }, 1e4);
    pendingActions.set(requestId, {
      completedMessage,
      expectedInstances,
      acknowledgedInstances: /* @__PURE__ */ new Set(),
      onComplete,
      onTimeout,
      timeout
    });
    return requestId;
  };
  var sendBackgroundBoardAction = (action, state, target, revision) => {
    const expectedInstances = new Set(
      findMatchingBoards(target).map(
        (boardPresence) => boardPresence.instanceId
      )
    );
    const requestId = `live-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (expectedInstances.size === 0) {
      transport.publish("board:command", {
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
      }, 1e4);
      pendingBackgroundActions.set(requestId, {
        expectedInstances,
        acknowledgedInstances: /* @__PURE__ */ new Set(),
        resolve,
        timeout
      });
    });
    transport.publish("board:command", {
      action,
      state,
      target,
      settings: getLightingSettingsState(),
      revision
    }, { requestId });
    return promise;
  };
  var getFormState = () => {
    const [hours, minutes] = departureTimeInput.value.split(":").map(Number);
    const parsedDelay = parseDelayMinutes(delayValueInput.value);
    const operator = normalizeOperator(operatorInput.value);
    return {
      stations: stationInputs.map((input) => input.value),
      train: resolveTrainTypeValue(trainTypeInput.value, operator),
      trainNumber: trainNumberInput.value.trim(),
      operator,
      delay: parsedDelay === "" ? "" : parsedDelay,
      departureTime: { hours, minutes },
      lenses: getManagedLensState()
    };
  };
  var getEmptyState = () => ({
    ...createEmptyBoardState(),
    lenses: createEmptyLensState()
  });
  var getBoardStateFromDeparture = (departure) => ({
    stations: [
      formatStationName(departure.stations?.[0] || ""),
      formatStationName(departure.stations?.[1] || "")
    ],
    train: departure.train,
    trainNumber: departure.trainNumber,
    operator: departure.operator || "",
    delay: departure.delay,
    departureTime: departure.departureTime ? { ...departure.departureTime } : null,
    lenses: departure.lenses
  });
  var sameTarget = (first, second) => first?.platform === second?.platform && first?.track === second?.track && first?.sector === second?.sector;
  var isConfiguredTarget = (target) => Boolean(target?.platform && target?.track);
  var sameDepartureContent = (first, second) => JSON.stringify({
    stations: first?.stations || [],
    train: first?.train || "",
    trainNumber: first?.trainNumber || "",
    operator: first?.operator || "",
    delay: first?.delay ?? "",
    departureTime: first?.departureTime || null,
    target: first?.target || {},
    lenses: first?.lenses || null
  }) === JSON.stringify({
    stations: second?.stations || [],
    train: second?.train || "",
    trainNumber: second?.trainNumber || "",
    operator: second?.operator || "",
    delay: second?.delay ?? "",
    departureTime: second?.departureTime || null,
    target: second?.target || {},
    lenses: second?.lenses || null
  });
  var sameLiveTrainNumber = (first, second) => {
    if (!first || !second) {
      return false;
    }
    return String(first).slice(-4) === String(second).slice(-4);
  };
  var findPreviousLiveDeparture = (departure, previousLive) => {
    const byKey = previousLive.find(
      (item) => item.liveKey && item.liveKey === departure.liveKey
    );
    if (byKey) {
      return byKey;
    }
    const sourceTrainNumber = departure.sourceTrainNumber || departure.trainNumber;
    if (!sourceTrainNumber) {
      return null;
    }
    return previousLive.find((item) => {
      const previousNumber = item.sourceTrainNumber || item.trainNumber;
      return sameLiveTrainNumber(previousNumber, sourceTrainNumber) && (!departure.dateKey || !item.dateKey || item.dateKey === departure.dateKey) && (!departure.liveStationKey || !item.liveStationKey || item.liveStationKey === departure.liveStationKey);
    }) || null;
  };
  var reconcileLiveDepartures = async (values) => {
    const previousDepartures = [...departures];
    const previousLive = previousDepartures.filter(
      (departure) => departure.source === "live"
    );
    const normalizedLive = (Array.isArray(values) ? values : []).map((value) => normalizeDeparture({
      ...value,
      source: "live",
      lenses: getManagedLensState()
    })).filter((departure) => departure.departureTime);
    const nextLive = normalizedLive.map((departure) => {
      const previous = findPreviousLiveDeparture(departure, previousLive);
      return {
        ...departure,
        id: previous?.id || departure.id,
        source: "live",
        liveKey: departure.liveKey || previous?.liveKey,
        liveStationKey: departure.liveStationKey || previous?.liveStationKey || LIVE_STATION_DEFAULTS.key,
        dateKey: departure.dateKey || previous?.dateKey || "",
        sourceTrainNumber: departure.sourceTrainNumber || previous?.sourceTrainNumber || "",
        lenses: previous?.lenses || departure.lenses
      };
    });
    const liveTargetKeys = new Set(
      nextLive.filter((departure) => isConfiguredTarget(departure.target)).map((departure) => getBoardIdentityKey(departure.target))
    );
    const manualDepartures = previousDepartures.filter(
      (departure) => departure.source !== "live" && !liveTargetKeys.has(getBoardIdentityKey(departure.target))
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
    const changed = previousLive.length !== nextLive.length || previousLive.some((departure) => !matchedPrevious.has(departure)) || nextLive.some((departure) => {
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
      const next = nextLive.find(
        (departure) => pairedPrevious.get(departure) === previous
      );
      const targetChanged = next && !sameTarget(
        previous.target,
        next.target
      );
      const removed = !next;
      if ((removed || targetChanged) && isConfiguredTarget(previous.target)) {
        const revision = nextStateRevision();
        setDesiredState(
          previous.target,
          "reset-board",
          getEmptyState(),
          revision
        );
        commands.push(
          sendBackgroundBoardAction(
            "reset-board",
            getEmptyState(),
            previous.target,
            revision
          )
        );
      }
    });
    nextLive.forEach((next) => {
      const previous = pairedPrevious.get(next);
      const needsApply = !previous || !sameDepartureContent(previous, next) || !sameTarget(previous.target, next.target);
      if (!needsApply || !isConfiguredTarget(next.target)) {
        return;
      }
      const revision = nextStateRevision();
      next.revision = revision;
      setDesiredState(
        next.target,
        "apply-board",
        getBoardStateFromDeparture(next),
        revision
      );
      commands.push(
        sendBackgroundBoardAction(
          "apply-board",
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
  var setLiveStatus = (message, isError = false) => {
    if (!liveDeparturesStatus) {
      return;
    }
    liveDeparturesStatus.textContent = message;
    liveDeparturesStatus.classList.toggle("is-error", isError);
  };
  var renderManageHeaderStation = () => {
    if (!manageHeaderStation) {
      return;
    }
    const name = String(liveStationName || "").trim();
    const visible = liveDeparturesEnabled && Boolean(name);
    manageHeaderStation.hidden = !visible;
    manageHeaderStation.textContent = visible ? `stanice: ${name}` : "";
    documentRef.title = visible ? `${name} \u2013 ${MANAGE_DOCUMENT_TITLE}` : MANAGE_DOCUMENT_TITLE;
  };
  var renderLiveSourceStation = () => {
    const name = String(liveStationName || "").trim();
    renderManageHeaderStation();
    if (!liveSourceStation || !liveSourceStationLink) {
      return;
    }
    if (!name) {
      liveSourceStation.hidden = true;
      liveSourceStationLink.removeAttribute("href");
      liveSourceStationLink.textContent = "";
      return;
    }
    liveSourceStation.hidden = false;
    liveSourceStationLink.textContent = name;
    liveSourceStationLink.href = liveSourceUrl;
  };
  var formatLivePollInterval = (intervalMs) => `${Math.round(normalizeLivePollIntervalMs(intervalMs) / 1e3)} s`;
  var renderLivePollInterval = () => {
    const seconds = Math.round(livePollIntervalMs / 1e3);
    if (livePollIntervalInput && documentRef.activeElement !== livePollIntervalInput) {
      livePollIntervalInput.value = String(seconds);
    }
    if (livePollIntervalValue) {
      livePollIntervalValue.textContent = formatLivePollInterval(
        livePollIntervalMs
      );
    }
    if (liveDeparturesDescription) {
      liveDeparturesDescription.textContent = `\u017Div\xE9 odjezdy ze stanice Spr\xE1vy \u017Eeleznic \xB7 aktualizace ka\u017Ed\xFDch ${seconds} sekund. Pro na\u010D\xEDt\xE1n\xED je pot\u0159eba spustit scraper server.`;
    }
  };
  var renderLiveControls = () => {
    if (liveSourceUrlInput) {
      liveSourceUrlInput.value = liveSourceUrl;
      liveSourceUrlInput.disabled = liveDeparturesEnabled;
    }
    renderLiveSourceStation();
    renderLivePollInterval();
    if (liveApiUrlInput) {
      liveApiUrlInput.value = liveApiUrl;
      liveApiUrlInput.disabled = liveDeparturesEnabled;
    }
    if (liveToggleButton) {
      liveToggleButton.textContent = liveDeparturesEnabled ? "Zastavit live odjezdy" : "Spustit live odjezdy";
      liveToggleButton.disabled = livePollInProgress;
      liveToggleButton.setAttribute(
        "aria-pressed",
        String(liveDeparturesEnabled)
      );
    }
    if (liveDeparturesState) {
      liveDeparturesState.textContent = liveDeparturesEnabled ? "Live odjezdy jsou spu\u0161t\u011Bn\xE9." : "Live odjezdy jsou vypnut\xE9.";
    }
  };
  var stopLivePolling = () => {
    liveRunToken += 1;
    if (livePollTimer !== null) {
      window.clearInterval(livePollTimer);
      livePollTimer = null;
    }
  };
  var restartLiveTimer = () => {
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
  var pollLiveDepartures = async () => {
    if (!liveDeparturesEnabled || livePollInProgress) {
      return;
    }
    livePollInProgress = true;
    renderLiveControls();
    const runToken = liveRunToken;
    try {
      const payload = await fetchLiveDepartures({
        apiUrl: liveApiUrl,
        sourceUrl: liveSourceUrl,
        pollIntervalMs: livePollIntervalMs
      });
      if (!liveDeparturesEnabled || runToken !== liveRunToken) {
        return;
      }
      const result = await reconcileLiveDepartures(payload.departures);
      const fetchedAt = payload.fetchedAt ? new Date(payload.fetchedAt).toLocaleTimeString("cs-CZ") : (/* @__PURE__ */ new Date()).toLocaleTimeString("cs-CZ");
      if (typeof payload.station === "string" && payload.station.trim()) {
        liveStationName = payload.station.trim();
        persistState();
        renderLiveSourceStation();
      }
      const stationName = liveStationName || "tabule S\u017D";
      setLiveStatus(
        result.changed ? `Aktualizov\xE1no ${fetchedAt} (${stationName}): ${payload.departures.length} odjezd\u016F.` : `Beze zm\u011Bny, posledn\xED kontrola ${fetchedAt} (${stationName}).`
      );
    } catch (error) {
      if (runToken === liveRunToken) {
        setLiveStatus(
          error instanceof Error ? error.message : "Live odjezdy se nepoda\u0159ilo na\u010D\xEDst.",
          true
        );
      }
    } finally {
      livePollInProgress = false;
      renderLiveControls();
    }
  };
  var startLivePolling = () => {
    stopLivePolling();
    liveDeparturesEnabled = true;
    renderLiveControls();
    persistState();
    setLiveStatus("Na\u010D\xEDt\xE1m aktu\xE1ln\xED odjezdy\u2026");
    void pollLiveDepartures();
    restartLiveTimer();
  };
  var stopLiveDepartures = () => {
    stopLivePolling();
    liveDeparturesEnabled = false;
    renderLiveControls();
    persistState();
    setLiveStatus("Live odjezdy byly zastaveny.");
  };
  var desiredStatesRepaired = false;
  departures.forEach((departure) => {
    if (departure.source === "live") {
      return;
    }
    const key = getBoardIdentityKey(departure.target);
    const revision = departure.revision || ++nextRevision;
    nextRevision = Math.max(nextRevision, revision);
    const existing = desiredStates[key];
    const existingStations = existing?.state?.stations;
    const hasCurrentStations = Array.isArray(existingStations) && existingStations.length >= 2 && existingStations[0] === departure.stations[0] && existingStations[1] === departure.stations[1];
    if (!existing || Number(existing.revision) < Number(revision) || !hasCurrentStations) {
      desiredStates[key] = {
        target: departure.target,
        action: "apply-board",
        state: getBoardStateFromDeparture(departure),
        revision: Math.max(Number(existing?.revision) || 0, revision),
        updatedAt: departure.updatedAt || Date.now()
      };
      desiredStatesRepaired = true;
    }
  });
  Object.values(desiredStates).forEach((desired) => {
    if (desired?.action !== "apply-board" || !desired.target || !desired.state?.departureTime) {
      return;
    }
    const identity = getBoardIdentityKey(desired.target);
    const alreadyLoaded = departures.some(
      (departure) => departure.id === identity || getBoardIdentityKey(departure.target) === identity
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
    if (recovered.target.platform && recovered.target.track && recovered.departureTime) {
      departures.push(recovered);
      nextRevision = Math.max(
        nextRevision,
        Number(recovered.revision) || 0
      );
      desiredStatesRepaired = true;
    }
  });
  var isSameManualTrain = (departure, state) => {
    const leftNumber = normalizeTrainNumber(departure?.trainNumber);
    const rightNumber = normalizeTrainNumber(state?.trainNumber);
    if (leftNumber || rightNumber) {
      return leftNumber === rightNumber;
    }
    return formatDepartureTime(departure?.departureTime) === formatDepartureTime(state?.departureTime) && (departure?.stations?.[0] || "") === (state?.stations?.[0] || "");
  };
  var resolveFormDeparture = (state, target) => {
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
    return departures.find(
      (item) => item.source !== "live" && isConfiguredTarget(item.target) && sameTarget(item.target, target)
    ) || null;
  };
  var upsertDeparture = (state, target, existing = null) => {
    const previous = existing?.id ? getDepartureById(existing.id) : null;
    if (previous && isConfiguredTarget(previous.target) && !sameTarget(previous.target, target)) {
      const stillUsed = departures.some(
        (item) => item.id !== previous.id && isConfiguredTarget(item.target) && sameTarget(item.target, previous.target)
      );
      if (!stillUsed) {
        const resetRevision = nextStateRevision();
        setDesiredState(
          previous.target,
          "reset-board",
          getEmptyState(),
          resetRevision
        );
        void sendBackgroundBoardAction(
          "reset-board",
          getEmptyState(),
          previous.target,
          resetRevision
        );
      }
    }
    const revision = nextStateRevision();
    const departure = normalizeDeparture({
      ...previous || {},
      ...state,
      id: previous?.id,
      source: previous?.source === "live" ? "live" : "manual",
      liveKey: previous?.liveKey || "",
      liveStationKey: previous?.liveStationKey || "",
      dateKey: previous?.dateKey || "",
      sourceTrainNumber: previous?.sourceTrainNumber || "",
      target,
      revision,
      updatedAt: Date.now()
    });
    departures = [
      ...departures.filter((item) => item.id !== departure.id),
      departure
    ];
    if (isConfiguredTarget(target)) {
      setDesiredState(
        target,
        "apply-board",
        getBoardStateFromDeparture(departure),
        revision
      );
    }
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    return departure;
  };
  var resetDeparture = (departure) => {
    if (!departure) {
      return;
    }
    const revision = nextStateRevision();
    departures = departures.filter((item) => item.id !== departure.id);
    setDesiredState(
      departure.target,
      "reset-board",
      getEmptyState(),
      revision
    );
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    void sendBackgroundBoardAction(
      "reset-board",
      getEmptyState(),
      departure.target,
      revision
    );
    setBoardFormStatus(
      `Odjezd pro ${formatBoardIdentity(departure.target)} byl smaz\xE1n.`
    );
  };
  var clearAllDepartures = () => {
    if (departures.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      departures.length === 1 ? "Opravdu vymazat 1 ulo\u017Een\xFD odjezd a resetovat souvisej\xEDc\xED tabule?" : `Opravdu vymazat v\u0161ech ${departures.length} ulo\u017Een\xFDch odjezd\u016F a resetovat souvisej\xEDc\xED tabule?`
    );
    if (!confirmed) {
      return;
    }
    const targets = [];
    const seen = /* @__PURE__ */ new Set();
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
        "reset-board",
        getEmptyState(),
        revision
      );
      void sendBackgroundBoardAction(
        "reset-board",
        getEmptyState(),
        target,
        revision
      );
    });
    exampleActive = false;
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    setBoardFormStatus(
      targets.length ? "V\u0161echny odjezdy byly vymaz\xE1ny a tabule resetov\xE1ny." : "V\u0161echny odjezdy byly vymaz\xE1ny."
    );
  };
  clearAllDeparturesButton?.addEventListener("click", clearAllDepartures);
  departuresTable?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-departure-action]");
    if (!actionButton) {
      return;
    }
    const departure = getDepartureById(actionButton.dataset.departureId);
    if (actionButton.dataset.departureAction === "load") {
      loadDepartureIntoForm(departure);
    } else if (actionButton.dataset.departureAction === "reset") {
      resetDeparture(departure);
    }
  });
  departuresTable?.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      sortState = {
        key,
        direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc"
      };
      persistState();
      renderDeparturesTable();
    });
  });
  setFormValues(exampleState);
  if (savedState?.form && typeof savedState.form === "object") {
    setSavedFormValues(savedState.form);
  }
  if (desiredStatesRepaired) {
    persistState();
  }
  var padClockPart = (value) => String(value).padStart(2, "0");
  var formatManageClock = (date) => `${padClockPart(date.getHours())}:${padClockPart(date.getMinutes())}:${padClockPart(date.getSeconds())}`;
  var renderManageClock = (date = /* @__PURE__ */ new Date()) => {
    if (!manageHeaderClock) {
      return;
    }
    manageHeaderClock.textContent = formatManageClock(date);
    manageHeaderClock.dateTime = date.toISOString();
  };
  var manageClockTimer = null;
  var scheduleManageClock = () => {
    const now = /* @__PURE__ */ new Date();
    renderManageClock(now);
    manageClockTimer = window.setTimeout(
      scheduleManageClock,
      1e3 - now.getMilliseconds()
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
  startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
  startButton.setAttribute("aria-pressed", "false");
  startButton.addEventListener("click", () => {
    const showExample = !exampleActive;
    exampleActive = showExample;
    formDepartureId = "";
    formDepartureLocked = false;
    if (showExample) {
      setFormValues(exampleState);
      const target2 = getFormTarget();
      const state = {
        ...exampleState,
        lenses: createDefaultLensState()
      };
      const departure = upsertDeparture(state, target2);
      startButton.textContent = "Resetovat tabuli";
      startButton.setAttribute("aria-pressed", "true");
      sendBoardAction(
        "apply-board",
        getBoardStateFromDeparture(departure),
        "P\u0159\xEDklad na\u010Dten.",
        {
          target: target2,
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
    setDesiredState(target, "reset-board", getEmptyState(), revision);
    persistState();
    renderDeparturesTable();
    publishDepartureSnapshot();
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    sendBoardAction(
      "reset-board",
      getEmptyState(),
      "Tabule resetov\xE1na.",
      {
        target,
        revision
      }
    );
  });
  resetAllSettingsButton.addEventListener("click", () => {
    storage.clear();
    legacyStorage.clear();
    stopLivePolling();
    liveDeparturesEnabled = false;
    liveApiUrl = getDefaultLiveApiUrl();
    liveSourceUrl = LIVE_STATION_DEFAULTS.sourceUrl;
    liveStationName = LIVE_STATION_DEFAULTS.name;
    livePollIntervalMs = LIVE_POLL_INTERVAL_MS;
    departures = [];
    desiredStates = {};
    formDepartureId = "";
    formDepartureLocked = false;
    lighting.reset();
    lensDisplay.setImmediate(createDefaultLensState());
    nightMode = false;
    autoNightMode = false;
    sunSchedule.stop();
    flapTiming = normalizeFlapTiming(FLAP_TIMING_DEFAULTS);
    delayOffset = DELAY_OFFSET_DEFAULT;
    departureBoardRows = DEPARTURE_BOARD_ROW_COUNT_DEFAULT;
    departureBoardLogo = DEPARTURE_BOARD_LOGO_DEFAULT;
    departureBoardLogoSvg = "";
    renderNightMode();
    renderLiveControls();
    setLiveStatus("Live odjezdy byly vypnut\xE9 obnoven\xEDm nastaven\xED.");
    syncLensControls();
    NIGHT_LIGHT_DEFAULTS.forEach(
      (setting) => syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    syncFlapTimingControls();
    syncDelayOffsetControls();
    syncDepartureBoardRowControls();
    syncDepartureBoardLogoControls();
    publishSettings({ persist: false });
    setFormValues(exampleState);
    exampleActive = false;
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    renderDeparturesTable();
    const resetRevision = nextStateRevision();
    globalResetRevision = resetRevision;
    persistState();
    publishDepartureSnapshot();
    sendBoardAction(
      "reset-all",
      {
        ...createEmptyBoardState(),
        lenses: createEmptyLensState()
      },
      "V\u0161echna nastaven\xED byla obnovena na v\xFDchoz\xED hodnoty.",
      {
        immediate: true,
        persist: false,
        revision: resetRevision
      }
    );
  });
  boardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!DEPARTURE_TIME_PATTERN.test(departureTimeInput.value)) {
      setBoardFormStatus(
        "Zadejte \u010Das odjezdu ve form\xE1tu HH:MM (00:00\u201323:59).",
        true
      );
      departureTimeInput.focus();
      return;
    }
    if (parseDelayMinutes(delayValueInput.value) === null) {
      setBoardFormStatus(
        "Zpo\u017Ed\u011Bn\xED mus\xED b\xFDt nez\xE1porn\xFD po\u010Det minut.",
        true
      );
      delayValueInput.focus();
      return;
    }
    if (!TRAIN_NUMBER_PATTERN.test(trainNumberInput.value.trim())) {
      setBoardFormStatus(
        "\u010C\xEDslo vlaku mus\xED obsahovat nejv\xFD\u0161e 4 \u010D\xEDslice.",
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
    startButton.textContent = "Resetovat tabuli";
    startButton.setAttribute("aria-pressed", "true");
    if (!isConfiguredTarget(target)) {
      setBoardFormStatus(
        "Odjezd byl ulo\u017Een. N\xE1stupi\u0161t\u011B a kolej lze doplnit pozd\u011Bji."
      );
      return;
    }
    sendBoardAction(
      "apply-board",
      getBoardStateFromDeparture(departure),
      "\xDAdaje byly odesl\xE1ny na tabuli.",
      {
        target,
        revision: departure.revision
      }
    );
  });
  [
    ...stationInputs,
    platformInput,
    trackInput,
    sectorInput,
    trainTypeInput,
    trainNumberInput,
    operatorInput,
    departureTimeInput,
    delayValueInput
  ].forEach((input) => {
    input.addEventListener("input", persistState);
    input.addEventListener("change", persistState);
  });
  liveSourceUrlInput?.addEventListener("change", () => {
    const value = liveSourceUrlInput.value.trim();
    const parsed = parseLiveSourceUrl(value);
    if (value && !parsed.valid) {
      setLiveStatus(
        "URL mus\xED b\xFDt tabule Spr\xE1vy \u017Eeleznic ve form\xE1tu StationTable.aspx?Key=\u2026",
        true
      );
      renderLiveControls();
      return;
    }
    if (parsed.key !== parseLiveSourceUrl(liveSourceUrl).key) {
      liveStationName = parsed.key === LIVE_STATION_DEFAULTS.key ? LIVE_STATION_DEFAULTS.name : "";
    }
    liveSourceUrl = parsed.sourceUrl;
    renderLiveControls();
    persistState();
    setLiveStatus("");
  });
  liveApiUrlInput?.addEventListener("change", () => {
    liveApiUrl = normalizeLiveApiUrl(
      liveApiUrlInput.value.trim() || getDefaultLiveApiUrl()
    );
    renderLiveControls();
    persistState();
  });
  var applyLivePollInterval = (seconds) => {
    livePollIntervalMs = normalizeLivePollIntervalMs(Number(seconds) * 1e3);
    renderLivePollInterval();
  };
  livePollIntervalInput?.addEventListener("input", () => {
    applyLivePollInterval(livePollIntervalInput.value);
  });
  livePollIntervalInput?.addEventListener("change", () => {
    applyLivePollInterval(livePollIntervalInput.value);
    persistState();
    restartLiveTimer();
  });
  liveToggleButton?.addEventListener("click", () => {
    if (liveDeparturesEnabled) {
      stopLiveDepartures();
    } else {
      startLivePolling();
    }
  });
  renderLiveControls();
  publishDiscovery();
  publishDepartureSnapshot();
  heartbeatTimer = window.setInterval(publishDiscovery, 4e3);
  presenceTimer = window.setInterval(pruneActiveBoards, 4e3);
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
      documentRef.removeEventListener("visibilitychange", handleVisibilityChange);
      sunSchedule.destroy();
      stopLivePolling();
      pendingBackgroundActions.forEach(({ timeout, resolve }) => {
        window.clearTimeout(timeout);
        resolve(false);
      });
      pendingBackgroundActions.clear();
      pendingActions.forEach(({ timeout }) => window.clearTimeout(timeout));
      pendingActions.clear();
      pendingIdentificationActions.forEach(
        ({ timeout }) => window.clearTimeout(timeout)
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
})();
