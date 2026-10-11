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
  var TRAIN_TYPE_IMAGE_CUSTOM = "custom";
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
  var trainTypeImageChoice = (value) => {
    const source = normalizeTrainTypeSource(value);
    if (!source) {
      return { choice: "", svg: "" };
    }
    if (source.startsWith("<")) {
      return { choice: TRAIN_TYPE_IMAGE_CUSTOM, svg: source };
    }
    return { choice: source, svg: "" };
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
    const delayMinutes = Number.isFinite(actualDelay) ? actualDelay : 0;
    const effective = new Date(date.getTime());
    if (delayMinutes > 0) {
      effective.setMinutes(effective.getMinutes() + delayMinutes);
    }
    if (minutesSinceClock(effective, reference) > RECENT_DEPARTURE_GRACE_MS) {
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

  // src/platform/audio.js
  var soundUrl = (fileName) => typeof document === "undefined" ? fileName : new URL(fileName, document.baseURI).href;
  var DEFAULT_SOUND_URL = soundUrl("sounds/split-flap.wav");
  var PITCHED_SOUND_URL = soundUrl("sounds/split-flap_pitched_down.wav");
  var FLAP_SOUND_DURATION_MS = 170;
  var DEFAULT_PLAYBACK_RATE = Math.min(
    16,
    Math.max(0.0625, FLAP_SOUND_DURATION_MS / STATION_FLIP_DURATION)
  );

  // src/platform/station-profile.js
  var STATION_PROFILE_STORAGE_KEY = "pragotron.stationProfile.v1";
  var STATION_PROFILE_VERSION = 1;
  var MAX_LIST = 80;
  var MAX_TYPES = 40;
  var MAX_STYLES = 12;
  var MAX_TEXT = 32;
  var DEFAULT_ALIASES = Object.freeze({
    Intercity: ["IC", "ic", "intercity"],
    Eurocity: ["EC", "ec", "eurocity"],
    SuperCity: ["SC", "sc", "supercity"],
    EuroNight: ["EN", "en", "euronight"],
    nj: ["NJ", "NightJet", "Nightjet", "nightjet"],
    rj: ["railjet", "Railjet"],
    RJ: ["regiojet", "RegioJet"]
  });
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
  var normalizeOperatorKey = (value) => clean(value).toLocaleLowerCase("cs-CZ").replace(/[^a-z0-9áäčďéěíľĺňóôŕřšťúůýž]+/gi, "");
  var isRegioJetOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized.includes("regiojet") || normalized === "rjet" || normalized === "rj";
  };
  var isCDOperator = (operator) => {
    const normalized = normalizeOperatorKey(operator);
    return normalized === "\u010Dd" || normalized === "cd" || normalized.includes("\u010Desk\xE9dr\xE1hy") || normalized.includes("ceskedrahy");
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
  var createDefaultStationProfile = () => {
    const numberStyles = Object.entries(TRAIN_NUMBER_CARD_STYLES).map(
      ([id, style]) => ({
        id,
        label: id,
        background: style.background,
        foreground: style.foreground
      })
    );
    const knownStyles = new Set(numberStyles.map((style) => style.id));
    const sectors = DEPARTURE_SECTOR_VALUES.filter(Boolean);
    const atomic = sectors.filter((value) => !value.includes("-"));
    return {
      version: STATION_PROFILE_VERSION,
      name: "Brno hlavn\xED n\xE1dra\u017E\xED",
      platforms: DEPARTURE_PLATFORM_VALUES.filter(Boolean),
      tracks: DEPARTURE_TRACK_VALUES.filter(Boolean),
      sectors: atomic,
      sectorRanges: sectors.filter((value) => value.includes("-")),
      numberStyles,
      trainTypes: [
        blankTrainType(),
        ...TRAIN_TYPES.filter((type) => type.name).map((type) => {
          const numberStyle = getTrainNumberCardStyle(type.name);
          return {
            name: type.name,
            text: type.text || "",
            suffix: type.suffix || "",
            source: type.source || "",
            label: type.label || "",
            background: type.background,
            foreground: type.foreground,
            numberStyle: knownStyles.has(numberStyle) ? numberStyle : "default",
            aliases: [...DEFAULT_ALIASES[type.name] || []]
          };
        })
      ]
    };
  };
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
    const fallbackStyles = createDefaultStationProfile().numberStyles;
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
  var profileSectorValues = (profile = getActiveStationProfile()) => [...profile.sectors, ...profile.sectorRanges];
  var matchProfileValue = (values, value) => {
    const normalized = cleanToken(value);
    if (!normalized) {
      return "";
    }
    return values.find((candidate) => candidate === normalized) || values.find(
      (candidate) => candidate.toLocaleLowerCase("cs-CZ") === normalized.toLocaleLowerCase("cs-CZ")
    ) || "";
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
  var typeLabels = (type) => [
    type.name,
    type.text,
    type.label,
    ...type.aliases || []
  ].map((value) => clean(value)).filter(Boolean);
  var resolveProfileTrainType = (sourceType, operator = "", profile = getActiveStationProfile()) => {
    const original = clean(sourceType);
    if (!original) {
      return "";
    }
    const types = profile.trainTypes.filter((type) => type.name);
    const lower = original.toLocaleLowerCase("cs-CZ");
    if (lower === "rj") {
      const preferred = isRegioJetOperator(operator) ? "RJ" : isCDOperator(operator) ? "rj" : original === "RJ" ? "RJ" : "rj";
      const operatorMatch = types.find((type) => type.name === preferred);
      if (operatorMatch) {
        return operatorMatch.name;
      }
    }
    const match = types.find((type) => typeLabels(type).some(
      (label) => label.toLocaleLowerCase("cs-CZ") === lower
    ));
    return match?.name || "";
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
  var lensBlinkEntries = /* @__PURE__ */ new Map();
  var lensBlinkFrame = 0;
  var prefersReducedMotion = () => {
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
    const canShareClock = active && !prefersReducedMotion() && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function";
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
      if (blinking && !prefersReducedMotion() && typeof window.requestAnimationFrame === "function") {
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
  var identitiesMatch = (boardIdentity, targetIdentity, profile = getActiveStationProfile()) => {
    const board = normalizeBoardIdentity(boardIdentity);
    const target = normalizeBoardIdentity(targetIdentity);
    if (!target.platform || !target.track) {
      return false;
    }
    if (board.platform !== target.platform || board.track !== target.track) {
      return false;
    }
    if (!target.sector || !board.sector) {
      return true;
    }
    return sectorsOverlap(board.sector, target.sector, profile);
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
  var SCRAPER_PARAMETER_ID = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
  var SCRAPER_PARAMETER_TYPES = /* @__PURE__ */ new Set(["text", "url", "number", "select"]);
  var SCRAPER_PARAMETER_LIMIT = 12;
  var SCRAPER_TEXT_LIMIT = 500;
  var scraperText = (value, limit = SCRAPER_TEXT_LIMIT) => String(value ?? "").trim().slice(0, limit);
  var scraperNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  var normalizeScraperOptions = (options) => {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(options) ? options : []).forEach((option) => {
      if (result.length >= 40) {
        return;
      }
      const value = scraperText(
        typeof option === "string" ? option : option?.value,
        120
      );
      const label = scraperText(
        typeof option === "string" ? option : option?.label || value,
        80
      );
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      result.push({ value, label: label || value });
    });
    return result;
  };
  var SCRAPER_IDLE_ERROR = "Scraper je v klidu.";
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
  var normalizeScraperSchema = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const parameters = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(value.parameters) ? value.parameters : []).forEach((item) => {
      if (!item || typeof item !== "object" || parameters.length >= SCRAPER_PARAMETER_LIMIT) {
        return;
      }
      const id = scraperText(item.id, 41);
      const type = scraperText(item.type, 20);
      if (id === "interval" || !SCRAPER_PARAMETER_ID.test(id) || seen.has(id) || !SCRAPER_PARAMETER_TYPES.has(type)) {
        return;
      }
      const parameter = {
        id,
        label: scraperText(item.label, 80) || id,
        type,
        help: scraperText(item.help, 240),
        placeholder: scraperText(item.placeholder, 120),
        format: scraperText(item.format, 40),
        required: item.required === true,
        showStation: item.showStation === true,
        default: scraperText(item.default)
      };
      if (type === "number") {
        parameter.min = scraperNumber(item.min);
        parameter.max = scraperNumber(item.max);
        parameter.step = scraperNumber(item.step);
      }
      if (type === "select") {
        parameter.options = normalizeScraperOptions(item.options);
        if (parameter.options.length === 0) {
          return;
        }
      }
      seen.add(id);
      parameters.push(parameter);
    });
    const controls = value.controls && typeof value.controls === "object" ? value.controls : {};
    return {
      id: scraperText(value.id, 40),
      name: scraperText(value.name, 80),
      description: scraperText(value.description, 240),
      controls: {
        watch: controls.watch === true,
        stop: controls.stop === true
      },
      parameters
    };
  };
  var normalizeScraperParameterValue = (parameter, raw) => {
    const label = parameter?.label || "Parametr";
    const text = String(raw ?? "").trim();
    if (!parameter) {
      return { ok: false, value: "", message: "Nezn\xE1m\xFD parametr scraperu." };
    }
    if (!text) {
      if (parameter.format === "sz-station-url") {
        const parsed = parseLiveSourceUrl("");
        return { ok: true, value: parsed.sourceUrl, key: parsed.key };
      }
      if (parameter.required) {
        return { ok: false, value: "", message: `Vypl\u0148te pole ${label}.` };
      }
      if (parameter.default) {
        return normalizeScraperParameterValue(parameter, parameter.default);
      }
      return { ok: true, value: "" };
    }
    if (parameter.format === "sz-station-url") {
      const parsed = parseLiveSourceUrl(text);
      if (!parsed.valid) {
        return {
          ok: false,
          value: text,
          message: "URL mus\xED b\xFDt tabule Spr\xE1vy \u017Eeleznic ve form\xE1tu StationTable.aspx?Key=\u2026"
        };
      }
      return { ok: true, value: parsed.sourceUrl, key: parsed.key };
    }
    if (parameter.type === "url") {
      try {
        const url = new URL(text);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("unsupported");
        }
        return { ok: true, value: url.toString() };
      } catch {
        return {
          ok: false,
          value: text,
          message: `${label} mus\xED b\xFDt adresa http nebo https.`
        };
      }
    }
    if (parameter.type === "number") {
      const number = Number(text);
      if (!Number.isFinite(number)) {
        return { ok: false, value: text, message: `${label} mus\xED b\xFDt \u010D\xEDslo.` };
      }
      if (parameter.min != null && number < parameter.min) {
        return {
          ok: false,
          value: text,
          message: `${label} mus\xED b\xFDt aspo\u0148 ${parameter.min}.`
        };
      }
      if (parameter.max != null && number > parameter.max) {
        return {
          ok: false,
          value: text,
          message: `${label} m\u016F\u017Ee b\xFDt nejv\xFD\u0161e ${parameter.max}.`
        };
      }
      return { ok: true, value: String(number) };
    }
    if (parameter.type === "select") {
      const match = parameter.options.find((option) => option.value === text);
      if (!match) {
        return {
          ok: false,
          value: parameter.default || parameter.options[0]?.value || "",
          message: `${label} m\xE1 nezn\xE1mou volbu.`
        };
      }
      return { ok: true, value: match.value };
    }
    return { ok: true, value: text.slice(0, SCRAPER_TEXT_LIMIT) };
  };
  var scraperEndpointUrl = (apiUrl, suffix) => {
    const endpoint = new URL(normalizeLiveApiUrl(apiUrl));
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}${suffix}`;
    endpoint.search = "";
    endpoint.hash = "";
    return endpoint.toString();
  };
  var scraperSchemaUrl = (apiUrl) => scraperEndpointUrl(apiUrl, "/schema");
  var scraperControlUrl = (apiUrl, action) => scraperEndpointUrl(apiUrl, `/${action}`);
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
  var fetchScraperSchema = async ({
    apiUrl = getDefaultLiveApiUrl(),
    fetchImpl = globalThis.fetch
  } = {}) => {
    if (typeof fetchImpl !== "function") {
      throw new Error("Pro definici scraperu nen\xED dostupn\xE1 funkce fetch.");
    }
    let response;
    try {
      response = await fetchImpl(scraperSchemaUrl(apiUrl), {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      });
    } catch (error) {
      throw new Error(describeLiveNetworkError(error));
    }
    if (!response.ok) {
      throw new Error(
        `Scraper nevr\xE1til definici parametr\u016F (HTTP ${response.status}).`
      );
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const schema = normalizeScraperSchema(payload);
    if (!schema) {
      throw new Error("Scraper vr\xE1til neplatnou definici parametr\u016F.");
    }
    return schema;
  };
  var postScraperControl = async ({
    apiUrl = getDefaultLiveApiUrl(),
    action,
    parameters = {},
    pollIntervalMs = LIVE_POLL_INTERVAL_MS,
    clientId = "",
    fetchImpl = globalThis.fetch
  } = {}) => {
    if (typeof fetchImpl !== "function") {
      throw new Error("Pro ovl\xE1d\xE1n\xED scraperu nen\xED dostupn\xE1 funkce fetch.");
    }
    if (action !== "watch" && action !== "stop") {
      throw new Error("Nezn\xE1m\xFD p\u0159\xEDkaz scraperu.");
    }
    let response;
    try {
      response = await fetchImpl(scraperControlUrl(apiUrl, action), {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parameters && typeof parameters === "object" ? parameters : {},
          interval: normalizeLivePollIntervalMs(pollIntervalMs),
          client: scraperText(clientId, 80)
        })
      });
    } catch (error) {
      throw new Error(describeLiveNetworkError(error));
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(
        payload?.error ? String(payload.error) : `Scraper nevr\xE1til potvrzen\xED (HTTP ${response.status}).`
      );
    }
    return payload || {};
  };
  var appendScraperQuery = (endpoint, parameters) => {
    Object.entries(parameters || {}).forEach(([key, value]) => {
      if (!SCRAPER_PARAMETER_ID.test(key) || key === "interval") {
        return;
      }
      if (value == null || String(value).trim() === "") {
        return;
      }
      endpoint.searchParams.set(key, String(value));
    });
  };
  var fetchLiveDepartures = async ({
    apiUrl = getDefaultLiveApiUrl(),
    sourceUrl = normalizeLiveSourceUrl(LIVE_STATION_DEFAULTS.sourceUrl),
    parameters,
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
    appendScraperQuery(
      endpoint,
      parameters && typeof parameters === "object" ? parameters : { source: normalizeLiveSourceUrl(sourceUrl) }
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

  // src/demos/manageLayout.js
  var LAYOUT_STORAGE_KEY = "pragotron.manage.layout.v1";
  var MIN_WEIGHT = 12;
  var MAX_COLUMNS = 4;
  var BLOCK_ORDER = [
    "stationProfilePanel",
    "boardForm",
    "liveDeparturesPanel",
    "departureBoardLogoPanel",
    "departureDelayOffsetPanel",
    "departuresPanel",
    "activeBoardsPanel",
    "logPanel"
  ];
  var DEFAULT_MANAGE_LAYOUT = {
    columns: [
      {
        weight: 40,
        blocks: [
          "stationProfilePanel",
          "boardForm",
          "liveDeparturesPanel",
          "departureBoardLogoPanel",
          "departureDelayOffsetPanel"
        ]
      },
      {
        weight: 60,
        blocks: [
          "departuresPanel",
          "activeBoardsPanel",
          "logPanel"
        ]
      }
    ]
  };
  var COLUMN_COUNT_LABELS = [
    "Jeden sloupec",
    "Dva sloupce",
    "T\u0159i sloupce",
    "\u010Cty\u0159i sloupce"
  ];
  var balanceLayoutWeights = (weights) => {
    const count = weights.length;
    if (count === 0) {
      return [];
    }
    if (MIN_WEIGHT * count >= 100) {
      const base = Math.floor(100 / count);
      const next2 = Array(count).fill(base);
      next2[count - 1] += 100 - base * count;
      return next2;
    }
    let raw = weights.map((weight) => {
      const value = Number(weight);
      return Number.isFinite(value) && value > 0 ? value : 0;
    });
    let sum = raw.reduce((total2, weight) => total2 + weight, 0);
    if (sum <= 0) {
      raw = Array(count).fill(1);
      sum = count;
    }
    const next = raw.map((weight) => Math.max(
      MIN_WEIGHT,
      Math.round(weight / sum * 100)
    ));
    let total = next.reduce((acc, weight) => acc + weight, 0);
    let guard = 0;
    while (total !== 100 && guard < 300) {
      guard += 1;
      if (total > 100) {
        let index = -1;
        next.forEach((weight, position) => {
          if (weight <= MIN_WEIGHT) {
            return;
          }
          if (index === -1 || weight > next[index]) {
            index = position;
          }
        });
        if (index === -1) {
          break;
        }
        next[index] -= 1;
        total -= 1;
      } else {
        let index = 0;
        next.forEach((weight, position) => {
          if (weight < next[index]) {
            index = position;
          }
        });
        next[index] += 1;
        total += 1;
      }
    }
    return next;
  };
  var normalizeManageLayout = (input, knownIds) => {
    const known = [...knownIds];
    const fallback = DEFAULT_MANAGE_LAYOUT.columns.map((column) => ({
      weight: column.weight,
      blocks: [...column.blocks]
    }));
    const source = Array.isArray(input?.columns) && input.columns.length > 0 ? input.columns.slice(0, MAX_COLUMNS) : fallback;
    const columns = source.map((column) => ({
      weight: Number(column?.weight),
      blocks: []
    }));
    const seen = /* @__PURE__ */ new Set();
    source.forEach((column, index) => {
      const blocks = Array.isArray(column?.blocks) ? column.blocks : [];
      blocks.forEach((id) => {
        if (typeof id !== "string" || !known.includes(id) || seen.has(id)) {
          return;
        }
        seen.add(id);
        columns[index].blocks.push(id);
      });
    });
    known.forEach((id) => {
      if (!seen.has(id)) {
        columns[0].blocks.push(id);
      }
    });
    const weights = balanceLayoutWeights(columns.map((column) => column.weight));
    columns.forEach((column, index) => {
      column.weight = weights[index];
    });
    return { columns };
  };
  var readStoredLayout = () => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(LAYOUT_STORAGE_KEY) || ""
      );
      if (!parsed || !Array.isArray(parsed.columns) || parsed.columns.length === 0) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };
  var mountManageLayout = (documentRef2) => {
    const root = documentRef2.querySelector("#manage");
    if (!root || root.dataset.layoutReady === "true") {
      documentRef2.documentElement.classList.remove("manage-layout-pending");
      return;
    }
    root.dataset.layoutReady = "true";
    const layoutButton = documentRef2.querySelector("#manageLayoutButton");
    const layoutBar = documentRef2.querySelector("#manageLayoutBar");
    const countHost = documentRef2.querySelector(".manage-layout-count");
    const splitHost = documentRef2.querySelector("#manageLayoutSplit");
    const resetButton = documentRef2.querySelector("#manageLayoutReset");
    const doneButton = documentRef2.querySelector("#manageLayoutDone");
    let editing = false;
    const knownIds = () => {
      const present = new Set(
        [...root.querySelectorAll("[data-layout-block]")].map((block) => block.id).filter(Boolean)
      );
      const ordered = BLOCK_ORDER.filter((id) => present.has(id));
      present.forEach((id) => {
        if (!BLOCK_ORDER.includes(id)) {
          ordered.push(id);
        }
      });
      return ordered;
    };
    const columnNodes = () => [
      ...root.querySelectorAll(":scope > .manage-layout-column")
    ];
    const paintWeights = (columns) => {
      const nodes = columnNodes();
      columns.forEach((column, index) => {
        if (nodes[index]) {
          nodes[index].dataset.layoutWeight = String(column.weight);
        }
      });
      root.style.setProperty(
        "--manage-columns",
        columns.map((column) => `minmax(0, ${column.weight}fr)`).join(" ")
      );
    };
    const syncLabels = (layout) => {
      if (!editing) {
        return;
      }
      columnNodes().forEach((column, index) => {
        let label = column.querySelector(":scope > .manage-layout-column-label");
        if (!label) {
          label = documentRef2.createElement("div");
          label.className = "manage-layout-column-label";
          column.prepend(label);
        }
        const weight = layout.columns[index]?.weight ?? column.dataset.layoutWeight;
        label.textContent = `Sloupec ${index + 1} \xB7 ${weight} %`;
      });
    };
    const syncCountPressed = (count) => {
      countHost?.querySelectorAll("button").forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.columnCount) === count)
        );
      });
    };
    const readDomLayout = () => normalizeManageLayout({
      columns: columnNodes().map((column) => ({
        weight: Number(column.dataset.layoutWeight),
        blocks: [...column.querySelectorAll(":scope > [data-layout-block]")].map((block) => block.id)
      }))
    }, knownIds());
    const saveLayout = (layout) => {
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
          columns: layout.columns.map((column) => ({
            weight: column.weight,
            blocks: [...column.blocks]
          }))
        }));
      } catch {
      }
    };
    const paintStructure = (layout) => {
      const nodes = columnNodes();
      while (nodes.length < layout.columns.length) {
        const column = documentRef2.createElement("div");
        column.className = "manage-layout-column";
        column.dataset.layoutColumn = "";
        root.append(column);
        nodes.push(column);
      }
      while (nodes.length > layout.columns.length) {
        const extra = nodes.pop();
        const keep = nodes[nodes.length - 1];
        [...extra.querySelectorAll(":scope > [data-layout-block]")].forEach((block) => keep.append(block));
        extra.remove();
      }
      layout.columns.forEach((column, index) => {
        const node = nodes[index];
        node.dataset.layoutWeight = String(column.weight);
        column.blocks.forEach((id) => {
          const block = documentRef2.getElementById(id);
          if (block) {
            node.append(block);
          }
        });
      });
      paintWeights(layout.columns);
      syncLabels(layout);
    };
    const renderSplit = () => {
      if (!splitHost) {
        return;
      }
      const layout = readDomLayout();
      splitHost.replaceChildren();
      layout.columns.forEach((column, index) => {
        const part = documentRef2.createElement("span");
        part.className = "manage-layout-split-part";
        part.style.flex = `${column.weight} 1 0`;
        part.textContent = `${column.weight} %`;
        splitHost.append(part);
        if (index >= layout.columns.length - 1) {
          return;
        }
        const splitter = documentRef2.createElement("button");
        splitter.type = "button";
        splitter.className = "manage-layout-splitter";
        splitter.dataset.splitBoundary = String(index);
        splitter.setAttribute(
          "aria-label",
          `Posunout hranici mezi sloupcem ${index + 1} a ${index + 2}`
        );
        splitter.setAttribute("role", "separator");
        splitter.setAttribute("aria-orientation", "vertical");
        splitter.setAttribute("aria-valuemin", String(MIN_WEIGHT));
        splitter.setAttribute(
          "aria-valuemax",
          String(column.weight + layout.columns[index + 1].weight - MIN_WEIGHT)
        );
        splitter.setAttribute("aria-valuenow", String(column.weight));
        splitHost.append(splitter);
      });
      syncLabels(layout);
      syncCountPressed(layout.columns.length);
    };
    const updateSplitVisual = (columns) => {
      if (!splitHost) {
        return;
      }
      const parts = [...splitHost.querySelectorAll(".manage-layout-split-part")];
      if (parts.length !== columns.length) {
        renderSplit();
        return;
      }
      columns.forEach((column, index) => {
        parts[index].style.flex = `${column.weight} 1 0`;
        parts[index].textContent = `${column.weight} %`;
      });
      [...splitHost.querySelectorAll(".manage-layout-splitter")].forEach((splitter, index) => {
        const pair = columns[index].weight + columns[index + 1].weight;
        splitter.setAttribute("aria-valuemax", String(pair - MIN_WEIGHT));
        splitter.setAttribute("aria-valuenow", String(columns[index].weight));
      });
      syncLabels({ columns });
      syncCountPressed(columns.length);
    };
    const setColumnCount = (count) => {
      const nextCount = Math.min(MAX_COLUMNS, Math.max(1, count));
      const current = readDomLayout();
      if (nextCount === current.columns.length) {
        return;
      }
      if (nextCount > current.columns.length) {
        const added = nextCount - current.columns.length;
        const share = Math.max(MIN_WEIGHT, Math.round(100 / nextCount));
        const rest = 100 - share * added;
        const oldSum = current.columns.reduce(
          (total, column) => total + column.weight,
          0
        ) || 1;
        current.columns.forEach((column) => {
          column.weight = column.weight / oldSum * rest;
        });
        for (let index = 0; index < added; index += 1) {
          current.columns.push({ weight: share, blocks: [] });
        }
      } else {
        const removed = current.columns.splice(nextCount);
        const target = current.columns[current.columns.length - 1];
        removed.forEach((column) => {
          target.blocks.push(...column.blocks);
        });
      }
      const layout = normalizeManageLayout(current, knownIds());
      paintStructure(layout);
      saveLayout(layout);
      if (editing) {
        renderSplit();
      }
    };
    const resetLayout = () => {
      const layout = normalizeManageLayout(DEFAULT_MANAGE_LAYOUT, knownIds());
      paintStructure(layout);
      saveLayout(layout);
      if (editing) {
        renderSplit();
      }
    };
    const installHandles = () => {
      root.querySelectorAll("[data-layout-block]").forEach((block) => {
        if (block.querySelector(".manage-layout-handle")) {
          return;
        }
        const heading = block.id === "boardForm" ? block.querySelector("#departureEditorPanel > div") : block.querySelector(":scope > div");
        const title = block.querySelector("legend")?.textContent?.trim() || "blok";
        const handle = documentRef2.createElement("button");
        handle.type = "button";
        handle.className = "manage-layout-handle";
        handle.dataset.layoutHandle = "";
        handle.setAttribute("aria-label", `P\u0159esunout blok ${title}`);
        handle.title = "T\xE1hn\u011Bte my\u0161\xED nebo pou\u017Eijte \u0161ipky";
        const grip = documentRef2.createElement("span");
        grip.className = "manage-layout-grip";
        grip.setAttribute("aria-hidden", "true");
        handle.append(grip);
        (heading || block).prepend(handle);
      });
    };
    const clearDropTargets = () => {
      columnNodes().forEach((column) => {
        column.classList.remove("is-drop-target");
      });
    };
    const columnAt = (x, y) => {
      const columns = columnNodes();
      const direct = columns.find((column) => {
        const rect = column.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      });
      if (direct) {
        return direct;
      }
      let best = columns[0] || null;
      let bestDistance = Infinity;
      columns.forEach((column) => {
        const rect = column.getBoundingClientRect();
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          best = column;
          bestDistance = distance;
        }
      });
      return best;
    };
    const placeBlock = (block, column, clientY) => {
      const siblings = [...column.querySelectorAll(":scope > [data-layout-block]")].filter((item) => item !== block);
      let before = null;
      siblings.some((sibling) => {
        const rect = sibling.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          before = sibling;
          return true;
        }
        return false;
      });
      if (before) {
        if (block.parentElement === column && block.nextElementSibling === before) {
          return;
        }
        column.insertBefore(block, before);
        return;
      }
      if (block.parentElement === column && column.lastElementChild === block) {
        return;
      }
      column.append(block);
    };
    const scrollWithPointer = (clientY) => {
      const edge = 72;
      if (clientY < edge) {
        window.scrollBy(0, -Math.ceil((edge - clientY) / 3));
      } else if (clientY > window.innerHeight - edge) {
        window.scrollBy(0, Math.ceil((clientY - (window.innerHeight - edge)) / 3));
      }
    };
    let drag = null;
    let dragCleanup = null;
    const endBlockDrag = () => {
      dragCleanup?.();
      dragCleanup = null;
      if (!drag) {
        return;
      }
      drag.block.classList.remove("is-layout-dragging");
      root.classList.remove("is-layout-dragging");
      clearDropTargets();
      drag = null;
      saveLayout(readDomLayout());
    };
    const onHandlePointerDown = (event) => {
      const handle = event.target.closest?.("[data-layout-handle]");
      if (!editing || !handle || event.button !== 0 || drag) {
        return;
      }
      const block = handle.closest("[data-layout-block]");
      if (!block) {
        return;
      }
      event.preventDefault();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      block.classList.add("is-layout-dragging");
      root.classList.add("is-layout-dragging");
      drag = { pointerId: event.pointerId, block, handle };
      const move = (pointerEvent) => {
        if (!drag || pointerEvent.pointerId !== drag.pointerId) {
          return;
        }
        const column = columnAt(pointerEvent.clientX, pointerEvent.clientY);
        if (!column) {
          return;
        }
        columnNodes().forEach((item) => {
          item.classList.toggle("is-drop-target", item === column);
        });
        placeBlock(drag.block, column, pointerEvent.clientY);
        scrollWithPointer(pointerEvent.clientY);
      };
      const end = (pointerEvent) => {
        if (!drag || pointerEvent.pointerId !== drag.pointerId) {
          return;
        }
        endBlockDrag();
      };
      dragCleanup = () => {
        documentRef2.removeEventListener("pointermove", move);
        documentRef2.removeEventListener("pointerup", end);
        documentRef2.removeEventListener("pointercancel", end);
      };
      documentRef2.addEventListener("pointermove", move);
      documentRef2.addEventListener("pointerup", end);
      documentRef2.addEventListener("pointercancel", end);
    };
    const moveBlockByKey = (block, key) => {
      const column = block.parentElement;
      if (!column) {
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown") {
        const siblings = [
          ...column.querySelectorAll(":scope > [data-layout-block]")
        ];
        const index = siblings.indexOf(block);
        const target = siblings[key === "ArrowUp" ? index - 1 : index + 1];
        if (!target) {
          return;
        }
        if (key === "ArrowUp") {
          column.insertBefore(block, target);
        } else {
          column.insertBefore(block, target.nextSibling);
        }
      } else {
        const columns = columnNodes();
        const columnIndex = columns.indexOf(column);
        const nextColumn = columns[columnIndex + (key === "ArrowLeft" ? -1 : 1)];
        if (!nextColumn) {
          return;
        }
        const index = [
          ...column.querySelectorAll(":scope > [data-layout-block]")
        ].indexOf(block);
        const destination = [
          ...nextColumn.querySelectorAll(":scope > [data-layout-block]")
        ];
        nextColumn.insertBefore(block, destination[index] || null);
      }
      block.scrollIntoView({ block: "nearest" });
      saveLayout(readDomLayout());
    };
    const onHandleKeyDown = (event) => {
      const handle = event.target.closest?.("[data-layout-handle]");
      if (!editing || !handle) {
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      const block = handle.closest("[data-layout-block]");
      if (!block) {
        return;
      }
      event.preventDefault();
      moveBlockByKey(block, event.key);
    };
    const adjustBoundary = (index, nextLeft) => {
      const layout = readDomLayout();
      const left = layout.columns[index];
      const right = layout.columns[index + 1];
      if (!left || !right) {
        return null;
      }
      const pair = left.weight + right.weight;
      const weight = Math.min(
        pair - MIN_WEIGHT,
        Math.max(MIN_WEIGHT, Math.round(nextLeft))
      );
      left.weight = weight;
      right.weight = pair - weight;
      paintWeights(layout.columns);
      updateSplitVisual(layout.columns);
      return layout;
    };
    const onSplitterPointerDown = (event) => {
      const splitter = event.target.closest?.(".manage-layout-splitter");
      if (!splitter || event.button !== 0) {
        return;
      }
      const index = Number(splitter.dataset.splitBoundary);
      const layout = readDomLayout();
      const left = layout.columns[index];
      const right = layout.columns[index + 1];
      if (!left || !right) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startLeft = left.weight;
      const pair = startLeft + right.weight;
      const width = splitHost.getBoundingClientRect().width || 1;
      splitter.setPointerCapture(event.pointerId);
      let latest = null;
      const move = (pointerEvent) => {
        if (pointerEvent.pointerId !== event.pointerId) {
          return;
        }
        const delta = (pointerEvent.clientX - startX) / width * 100;
        latest = adjustBoundary(index, startLeft + delta);
      };
      const end = (pointerEvent) => {
        if (pointerEvent.pointerId !== event.pointerId) {
          return;
        }
        splitter.removeEventListener("pointermove", move);
        splitter.removeEventListener("pointerup", end);
        splitter.removeEventListener("pointercancel", end);
        if (latest) {
          saveLayout(latest);
        }
      };
      splitter.addEventListener("pointermove", move);
      splitter.addEventListener("pointerup", end);
      splitter.addEventListener("pointercancel", end);
    };
    const onSplitterKeyDown = (event) => {
      const splitter = event.target.closest?.(".manage-layout-splitter");
      if (!splitter) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const index = Number(splitter.dataset.splitBoundary);
      const layout = readDomLayout();
      const delta = event.key === "ArrowLeft" ? -2 : 2;
      const next = adjustBoundary(index, layout.columns[index].weight + delta);
      if (next) {
        saveLayout(next);
      }
    };
    const setEditing = (next) => {
      editing = next;
      root.classList.toggle("is-layout-editing", editing);
      layoutButton?.setAttribute("aria-pressed", String(editing));
      if (layoutBar) {
        layoutBar.hidden = !editing;
      }
      if (editing) {
        renderSplit();
      } else {
        root.querySelectorAll(".manage-layout-column-label").forEach((label) => {
          label.remove();
        });
        clearDropTargets();
        endBlockDrag();
      }
    };
    try {
      const stored = readStoredLayout();
      if (stored) {
        paintStructure(normalizeManageLayout(stored, knownIds()));
      } else {
        const nodes = columnNodes();
        const weights = nodes.length === DEFAULT_MANAGE_LAYOUT.columns.length ? DEFAULT_MANAGE_LAYOUT.columns.map((column) => column.weight) : balanceLayoutWeights(nodes.map(() => 1));
        paintWeights(weights.map((weight) => ({ weight })));
      }
      installHandles();
      for (let count = 1; count <= MAX_COLUMNS; count += 1) {
        const button = documentRef2.createElement("button");
        button.type = "button";
        button.dataset.columnCount = String(count);
        button.textContent = String(count);
        button.setAttribute("aria-pressed", "false");
        button.setAttribute(
          "aria-label",
          COLUMN_COUNT_LABELS[count - 1] || `${count} sloupc\u016F`
        );
        button.addEventListener("click", () => setColumnCount(count));
        countHost?.append(button);
      }
      layoutButton?.addEventListener("click", () => setEditing(!editing));
      doneButton?.addEventListener("click", () => setEditing(false));
      resetButton?.addEventListener("click", resetLayout);
      splitHost?.addEventListener("pointerdown", onSplitterPointerDown);
      splitHost?.addEventListener("keydown", onSplitterKeyDown);
      root.addEventListener("pointerdown", onHandlePointerDown);
      root.addEventListener("keydown", onHandleKeyDown);
    } finally {
      documentRef2.documentElement.classList.remove("manage-layout-pending");
    }
  };

  // src/demos/stationProfileEditor.js
  var lines = (values) => values.join("\n");
  var fieldValue = (row, name) => row.querySelector(`[data-field="${name}"]`)?.value || "";
  var textInput = (documentRef2, value, label, name) => {
    const input = documentRef2.createElement("input");
    input.type = "text";
    input.value = value || "";
    input.dataset.field = name;
    input.setAttribute("aria-label", label);
    input.autocomplete = "off";
    return input;
  };
  var labeledField = (documentRef2, label, control, hint = "", wide = false) => {
    const wrapper = documentRef2.createElement("label");
    wrapper.className = wide ? "board-form-field station-profile-wide" : "board-form-field";
    wrapper.append(documentRef2.createTextNode(label), control);
    if (hint) {
      const note = documentRef2.createElement("small");
      note.textContent = hint;
      wrapper.append(note);
    }
    return wrapper;
  };
  var actionButton = (documentRef2, text) => {
    const button = documentRef2.createElement("button");
    button.type = "button";
    button.className = "station-profile-button";
    button.textContent = text;
    return button;
  };
  var mountStationProfileEditor = ({
    documentRef: documentRef2,
    onApply,
    onSectionExpanded
  }) => {
    const nameInput = documentRef2.querySelector("#stationProfileName");
    const platformsInput = documentRef2.querySelector("#stationProfilePlatforms");
    const tracksInput = documentRef2.querySelector("#stationProfileTracks");
    const sectorsInput = documentRef2.querySelector("#stationProfileSectors");
    const rangesInput = documentRef2.querySelector("#stationProfileSectorRanges");
    const stylesRoot = documentRef2.querySelector("#stationProfileNumberStyles");
    const typesRoot = documentRef2.querySelector("#stationProfileTrainTypeList");
    const searchInput = documentRef2.querySelector("#stationProfileTypeSearch");
    const applyButton = documentRef2.querySelector("#stationProfileApply");
    const exportButton = documentRef2.querySelector("#stationProfileExport");
    const importButton = documentRef2.querySelector("#stationProfileImport");
    const resetButton = documentRef2.querySelector("#stationProfileReset");
    const fileInput = documentRef2.querySelector("#stationProfileFile");
    if (!nameInput || !stylesRoot || !typesRoot) {
      return;
    }
    const typePainters = /* @__PURE__ */ new Set();
    const styleChoices = () => [...stylesRoot.querySelectorAll(".station-profile-style")].map((row) => fieldValue(row, "id").trim()).filter(Boolean);
    const fillStyleSelect = (select, selected) => {
      const current = selected || select.value || "default";
      select.replaceChildren();
      const choices = styleChoices();
      if (!choices.includes("default")) {
        choices.unshift("default");
      }
      choices.forEach((id) => {
        const option = documentRef2.createElement("option");
        option.value = id;
        option.textContent = id;
        select.appendChild(option);
      });
      select.value = choices.includes(current) ? current : "default";
    };
    const refreshOrder = (root) => {
      const searchLocked = root === typesRoot && String(searchInput?.value || "").trim() !== "";
      const rows = [...root.children];
      rows.forEach((row, index) => {
        const up = row.querySelector('[data-move="up"]');
        const down = row.querySelector('[data-move="down"]');
        if (!up || !down) {
          return;
        }
        up.disabled = searchLocked || index === 0;
        down.disabled = searchLocked || index === rows.length - 1;
        const lockedTitle = "Nejd\u0159\xEDv zru\u0161te hled\xE1n\xED.";
        up.title = searchLocked ? lockedTitle : "Posunout v\xFD\u0161";
        down.title = searchLocked ? lockedTitle : "Posunout n\xED\u017E";
      });
    };
    const moveRow = (row, direction) => {
      const parent = row.parentElement;
      const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!parent || !sibling) {
        return;
      }
      if (direction < 0) {
        parent.insertBefore(row, sibling);
      } else {
        parent.insertBefore(sibling, row);
      }
      refreshOrder(parent);
      if (parent === stylesRoot) {
        refreshTypeStyles();
      }
    };
    const iconButton = (label, src) => {
      const control = actionButton(documentRef2, "");
      control.classList.add("station-profile-icon-button");
      control.setAttribute("aria-label", label);
      control.title = label;
      const image = documentRef2.createElement("img");
      image.src = src;
      image.alt = "";
      image.width = 16;
      image.height = 16;
      control.append(image);
      return control;
    };
    const orderButtons = (row) => {
      const up = iconButton("Posunout v\xFD\u0161", "images/buttons/MoveItemUp.svg");
      const down = iconButton("Posunout n\xED\u017E", "images/buttons/MoveItemDown.svg");
      up.dataset.move = "up";
      down.dataset.move = "down";
      up.addEventListener("click", () => moveRow(row, -1));
      down.addEventListener("click", () => moveRow(row, 1));
      return [up, down];
    };
    const refreshTypeStyles = (renamed) => {
      typesRoot.querySelectorAll("[data-number-style]").forEach((select) => {
        const next = renamed && select.value === renamed.previous ? renamed.next : select.value;
        fillStyleSelect(select, next);
      });
      typePainters.forEach((paint) => paint());
    };
    const addStyleRow = (style = {}) => {
      const row = documentRef2.createElement("div");
      row.className = "station-profile-style";
      const id = textInput(documentRef2, style.id || "", "N\xE1zev barvy", "id");
      const background = textInput(
        documentRef2,
        style.background || "#111111",
        "Pozad\xED \u010D\xEDsla",
        "background"
      );
      const foreground = textInput(
        documentRef2,
        style.foreground || "#ffffff",
        "Barva \u010D\xEDslic",
        "foreground"
      );
      const swatch = documentRef2.createElement("span");
      swatch.className = "station-profile-swatch";
      swatch.setAttribute("aria-hidden", "true");
      swatch.textContent = "1234";
      const paint = () => {
        swatch.style.background = background.value;
        swatch.style.color = foreground.value;
      };
      background.addEventListener("input", paint);
      foreground.addEventListener("input", paint);
      paint();
      const remove = iconButton("Odebrat", "images/buttons/Delete.svg");
      const syncDefault = () => {
        const locked = id.value.trim().toLocaleLowerCase("cs-CZ") === "default";
        id.readOnly = locked;
        remove.disabled = locked;
        remove.title = locked ? "V\xFDchoz\xED barva mus\xED z\u016Fstat." : "";
      };
      remove.addEventListener("click", () => {
        row.remove();
        refreshOrder(stylesRoot);
        refreshTypeStyles();
      });
      let lastId = id.value.trim();
      id.addEventListener("input", () => {
        const next = id.value.trim();
        refreshTypeStyles({ previous: lastId, next });
        lastId = next;
        syncDefault();
      });
      syncDefault();
      const fields = documentRef2.createElement("div");
      fields.className = "board-form-grid";
      fields.append(
        labeledField(documentRef2, "N\xE1zev", id, "", true),
        labeledField(documentRef2, "Pozad\xED", background),
        labeledField(documentRef2, "Barva \u010D\xEDslic", foreground)
      );
      const actions = documentRef2.createElement("div");
      actions.className = "station-profile-row-actions";
      actions.append(...orderButtons(row), remove);
      const side = documentRef2.createElement("div");
      side.className = "station-profile-style-side";
      side.append(swatch, actions);
      row.append(side, fields);
      stylesRoot.appendChild(row);
      refreshOrder(stylesRoot);
      return row;
    };
    const addTypeRow = (type = {}, { open = false } = {}) => {
      const row = documentRef2.createElement("article");
      row.className = "station-profile-type";
      const name = textInput(documentRef2, type.name || "", "N\xE1zev typu", "name");
      const label = textInput(documentRef2, type.label || "", "Text v seznamu", "label");
      const text = textInput(documentRef2, type.text || "", "Text na flapu", "text");
      const suffix = textInput(documentRef2, type.suffix || "", "Dopln\u011Bk na flapu", "suffix");
      const imageChoice = trainTypeImageChoice(type.source);
      const source = documentRef2.createElement("select");
      source.dataset.field = "sourceChoice";
      source.setAttribute("aria-label", "Obr\xE1zek m\xEDsto textu");
      const blankImage = documentRef2.createElement("option");
      blankImage.value = "";
      blankImage.textContent = "Nepou\u017E\xEDt obr\xE1zek";
      source.append(blankImage);
      TRAIN_TYPE_IMAGE_FILES.forEach((file) => {
        const option = documentRef2.createElement("option");
        option.value = trainTypeImageSrc(file);
        option.textContent = trainTypeImageLabel(file);
        source.append(option);
      });
      const customImage = documentRef2.createElement("option");
      customImage.value = TRAIN_TYPE_IMAGE_CUSTOM;
      customImage.textContent = "Vlastn\xED";
      source.append(customImage);
      source.value = imageChoice.choice;
      const sourceSvg = documentRef2.createElement("textarea");
      sourceSvg.dataset.field = "sourceSvg";
      sourceSvg.value = imageChoice.svg;
      sourceSvg.rows = 5;
      sourceSvg.spellcheck = false;
      sourceSvg.placeholder = '<svg viewBox="0 0 100 40"></svg>';
      sourceSvg.setAttribute("aria-label", "Vlastn\xED SVG");
      const sourceSvgField = labeledField(
        documentRef2,
        "Vlastn\xED SVG",
        sourceSvg,
        "Vlo\u017Ete celou zna\u010Dku <svg>\u2026</svg>.",
        true
      );
      sourceSvgField.classList.add("station-profile-svg-field");
      const syncCustomSvgField = () => {
        const custom = source.value === TRAIN_TYPE_IMAGE_CUSTOM;
        sourceSvgField.hidden = !custom;
        sourceSvgField.classList.toggle("is-visible", custom);
      };
      syncCustomSvgField();
      const currentImageSource = () => source.value === TRAIN_TYPE_IMAGE_CUSTOM ? sourceSvg.value : source.value;
      const background = textInput(
        documentRef2,
        type.background || "var(--flap-background)",
        "Pozad\xED flapu",
        "background"
      );
      const foreground = textInput(
        documentRef2,
        type.foreground || "var(--flap-foreground)",
        "Barva p\xEDsma",
        "foreground"
      );
      const aliases = textInput(
        documentRef2,
        (type.aliases || []).join(", "),
        "Zkratky",
        "aliases"
      );
      const numberStyle = documentRef2.createElement("select");
      numberStyle.dataset.numberStyle = "true";
      numberStyle.setAttribute("aria-label", "Barva \u010D\xEDsla vlaku");
      fillStyleSelect(numberStyle, type.numberStyle || "default");
      const flap = documentRef2.createElement("span");
      flap.className = "station-profile-flap";
      flap.setAttribute("aria-hidden", "true");
      const title = documentRef2.createElement("strong");
      const meta = documentRef2.createElement("span");
      const paint = () => {
        const imageUrl = trainTypeImageUrl(currentImageSource());
        flap.style.background = background.value;
        flap.style.color = foreground.value;
        flap.replaceChildren();
        if (imageUrl) {
          const image = documentRef2.createElement("img");
          image.alt = "";
          image.src = imageUrl;
          flap.append(image);
        } else {
          flap.append(documentRef2.createTextNode(text.value.trim() || "\u2014"));
          if (suffix.value.trim()) {
            const extra = documentRef2.createElement("small");
            extra.textContent = suffix.value.trim();
            flap.append(extra);
          }
        }
        title.textContent = name.value.trim() || "Nov\xFD typ";
        const styleLabel = numberStyle.selectedOptions[0]?.textContent || "V\xFDchoz\xED";
        const aliasText = aliases.value.trim();
        meta.textContent = [
          imageUrl ? "obr\xE1zek" : text.value.trim() ? `flap ${text.value.trim()}` : "pr\xE1zdn\xFD flap",
          `\u010D\xEDslo ${styleLabel}`,
          aliasText ? `zkratky ${aliasText}` : ""
        ].filter(Boolean).join(" \xB7 ");
      };
      typePainters.add(paint);
      [name, label, text, suffix, background, foreground, aliases, sourceSvg].forEach((input) => input.addEventListener("input", paint));
      source.addEventListener("change", () => {
        syncCustomSvgField();
        paint();
      });
      numberStyle.addEventListener("change", paint);
      const body = documentRef2.createElement("div");
      body.className = "station-profile-type-body board-form-grid";
      body.append(
        labeledField(documentRef2, "N\xE1zev", name, "Hodnota ulo\u017Een\xE1 u odjezdu."),
        labeledField(
          documentRef2,
          "Text v seznamu",
          label,
          "Kdy\u017E je pr\xE1zdn\xFD, pou\u017Eije se n\xE1zev."
        ),
        labeledField(documentRef2, "Text na flapu", text),
        labeledField(documentRef2, "Dopln\u011Bk na flapu", suffix, "T\u0159eba l\xF4\u017Ek. za Ex."),
        labeledField(
          documentRef2,
          "Obr\xE1zek m\xEDsto textu",
          source,
          "Pr\xE1zdn\xE1 volba nech\xE1 na flapu text. Obr\xE1zek m\xE1 p\u0159ednost.",
          true
        ),
        sourceSvgField,
        labeledField(documentRef2, "Pozad\xED flapu", background),
        labeledField(documentRef2, "Barva p\xEDsma", foreground),
        labeledField(documentRef2, "Barva \u010D\xEDsla vlaku", numberStyle),
        labeledField(
          documentRef2,
          "Zkratky z tabule S\u017D",
          aliases,
          "Odd\u011Blte \u010D\xE1rkou. T\u0159eba IC, ic.",
          true
        )
      );
      const toggle = iconButton(
        open ? "Skr\xFDt" : "Upravit",
        "images/buttons/Edit.svg"
      );
      const setOpen = (next) => {
        row.classList.toggle("is-open", next);
        const label2 = next ? "Skr\xFDt" : "Upravit";
        toggle.setAttribute("aria-label", label2);
        toggle.title = label2;
        toggle.setAttribute("aria-expanded", String(next));
      };
      setOpen(open);
      toggle.addEventListener("click", () => setOpen(!row.classList.contains("is-open")));
      const remove = iconButton("Odebrat", "images/buttons/Delete.svg");
      remove.addEventListener("click", () => {
        typePainters.delete(paint);
        row.remove();
        filterTypes();
      });
      const identity = documentRef2.createElement("div");
      identity.className = "station-profile-type-identity";
      identity.append(title, meta);
      const actions = documentRef2.createElement("div");
      actions.className = "station-profile-row-actions";
      actions.append(...orderButtons(row), toggle, remove);
      const summary = documentRef2.createElement("div");
      summary.className = "station-profile-type-summary";
      summary.append(flap, identity, actions);
      summary.addEventListener("click", (event) => {
        if (event.target.closest("button")) {
          return;
        }
        setOpen(!row.classList.contains("is-open"));
      });
      row.append(summary, body);
      typesRoot.appendChild(row);
      refreshOrder(typesRoot);
      paint();
      return row;
    };
    const filterTypes = () => {
      const query = String(searchInput?.value || "").trim().toLocaleLowerCase("cs-CZ");
      typesRoot.querySelectorAll(".station-profile-type").forEach((row) => {
        const haystack = [...row.querySelectorAll("input, select, textarea")].map((control) => [
          control.value,
          control.selectedOptions?.[0]?.textContent || ""
        ].join(" ")).join(" ").toLocaleLowerCase("cs-CZ");
        row.classList.toggle("is-filtered", Boolean(query) && !haystack.includes(query));
      });
      refreshOrder(typesRoot);
    };
    const readStyles = () => [...stylesRoot.querySelectorAll(".station-profile-style")].map((row) => ({
      id: fieldValue(row, "id"),
      background: fieldValue(row, "background"),
      foreground: fieldValue(row, "foreground")
    }));
    const readTypes = () => [...typesRoot.querySelectorAll(".station-profile-type")].map((row) => ({
      name: fieldValue(row, "name"),
      label: fieldValue(row, "label"),
      text: fieldValue(row, "text"),
      suffix: fieldValue(row, "suffix"),
      source: fieldValue(row, "sourceChoice") === TRAIN_TYPE_IMAGE_CUSTOM ? fieldValue(row, "sourceSvg") : fieldValue(row, "sourceChoice"),
      background: fieldValue(row, "background"),
      foreground: fieldValue(row, "foreground"),
      numberStyle: row.querySelector("[data-number-style]")?.value || "default",
      aliases: fieldValue(row, "aliases")
    }));
    const read = () => normalizeStationProfile({
      name: nameInput.value,
      platforms: platformsInput.value,
      tracks: tracksInput.value,
      sectors: sectorsInput.value,
      sectorRanges: rangesInput.value,
      numberStyles: readStyles(),
      trainTypes: readTypes()
    });
    const fill = (profile) => {
      const next = profile || getActiveStationProfile();
      nameInput.value = next.name;
      platformsInput.value = lines(next.platforms);
      tracksInput.value = lines(next.tracks);
      sectorsInput.value = lines(next.sectors);
      rangesInput.value = lines(next.sectorRanges);
      typePainters.clear();
      stylesRoot.replaceChildren();
      typesRoot.replaceChildren();
      next.numberStyles.forEach((style) => addStyleRow(style));
      next.trainTypes.filter((type) => type.name).forEach((type) => addTypeRow(type));
      if (searchInput) {
        searchInput.value = "";
      }
      filterTypes();
    };
    const apply = () => {
      const profile = read();
      if (!profile) {
        onApply?.(null);
        return null;
      }
      setActiveStationProfile(profile);
      fill(getActiveStationProfile());
      onApply?.(getActiveStationProfile());
      return getActiveStationProfile();
    };
    const expandSection = (element) => {
      const section = element?.closest(".station-profile-section");
      if (!section) {
        return;
      }
      section.classList.remove("is-collapsed");
      section.querySelector(".manage-block-toggle")?.setAttribute("aria-expanded", "true");
      onSectionExpanded?.(section);
    };
    documentRef2.querySelector("#stationProfileAddStyle")?.addEventListener("click", () => {
      expandSection(stylesRoot);
      const row = addStyleRow({
        id: "",
        background: "#111111",
        foreground: "#ffffff"
      });
      row.querySelector('[data-field="id"]')?.focus();
    });
    documentRef2.querySelector("#stationProfileAddType")?.addEventListener("click", () => {
      expandSection(typesRoot);
      if (searchInput) {
        searchInput.value = "";
        filterTypes();
      }
      const row = addTypeRow({}, { open: true });
      row.querySelector('[data-field="name"]')?.focus();
      row.scrollIntoView({ block: "nearest" });
    });
    searchInput?.addEventListener("input", filterTypes);
    applyButton?.addEventListener("click", apply);
    exportButton?.addEventListener("click", () => {
      const profile = apply();
      if (!profile) {
        return;
      }
      const blob = new Blob(
        [JSON.stringify(profile, null, 2)],
        { type: "application/json" }
      );
      const link = documentRef2.createElement("a");
      const slug2 = profile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("cs-CZ").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "profil-stanice";
      link.href = URL.createObjectURL(blob);
      link.download = `${slug2}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1e3);
    });
    importButton?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          const profile = normalizeStationProfile(JSON.parse(String(reader.result || "")));
          if (!profile) {
            onApply?.(null);
            return;
          }
          fill(profile);
          apply();
        } catch {
          onApply?.(null);
        }
      });
      reader.readAsText(file);
    });
    resetButton?.addEventListener("click", () => {
      if (!window.confirm(
        "Obnovit v\xFDchoz\xED profil Brno hlavn\xED n\xE1dra\u017E\xED? Rozpracovan\xE9 \xFApravy se nahrad\xED."
      )) {
        return;
      }
      fill(createDefaultStationProfile());
      apply();
    });
    fill(getActiveStationProfile());
  };

  // src/demos/platformTableManage.js
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
  if (savedState.stationProfile) {
    setActiveStationProfile(savedState.stationProfile);
  }
  var logOutput = documentRef.querySelector("#logOutput");
  var MANAGE_LOG_LIMIT = 250;
  var stringifyLogValue = (value) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };
  var classifyManageLogLine = (line) => {
    const match = String(line).match(
      /^\[pragotron\]\s+(\d{1,2}:\d{2}:\d{2}\.\d{3})\s+([\s\S]+)$/
    );
    const time = match?.[1] || "";
    const direction = (match?.[2] || String(line)).trim();
    const kind = direction === "odesl\xE1no" ? "out" : direction === "p\u0159ijato" ? "in" : "system";
    return { time, direction, kind };
  };
  var formatLogTooltip = (date, time) => {
    const datePart = date.toLocaleDateString("cs-CZ");
    const match = String(time).match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/);
    if (!match) {
      const ms = String(date.getMilliseconds()).padStart(3, "0");
      const clock = [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0")
      ].join(":");
      return `${datePart} ${clock}.${ms}`;
    }
    const [, hours, minutes, seconds, milliseconds] = match;
    return `${datePart} ${hours.padStart(2, "0")}:${minutes}:${seconds}.${milliseconds}`;
  };
  var senderColors = /* @__PURE__ */ new Map();
  var senderHue = (clientId) => {
    let hash = 2166136261;
    const text = String(clientId || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 360;
  };
  var senderColor = (clientId) => {
    const key = String(clientId || "");
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
  var createLogTime = (date, time) => {
    const tooltip = formatLogTooltip(date, time);
    const clock = document.createElement("time");
    clock.className = "log-bubble-time";
    clock.dateTime = date.toISOString();
    clock.title = tooltip;
    clock.textContent = time || tooltip.slice(tooltip.lastIndexOf(" ") + 1);
    return clock;
  };
  var appendManageLog = (line, details) => {
    if (!logOutput) {
      return;
    }
    const sentAt = /* @__PURE__ */ new Date();
    const { time, direction, kind } = classifyManageLogLine(line);
    const record = details && typeof details === "object" ? details : null;
    const bubble = document.createElement("article");
    bubble.className = `log-bubble log-bubble-${kind}`;
    bubble.setAttribute(
      "aria-label",
      record?.typ ? `${direction}: ${record.typ}` : direction
    );
    if (kind === "system") {
      const label = document.createElement("p");
      label.className = "log-bubble-system-line";
      label.append(document.createTextNode(direction));
      if (time) {
        label.append(document.createTextNode(" \xB7 "));
        label.append(createLogTime(sentAt, time));
      }
      bubble.append(label);
      if (record) {
        const note = document.createElement("p");
        note.className = "log-bubble-system-note";
        const bits = [];
        if (record.url) {
          bits.push(String(record.url));
        }
        if (record.dal\u0161\u00EDPokusZaMs != null) {
          bits.push(`dal\u0161\xED pokus za ${record.dal\u0161\u00EDPokusZaMs} ms`);
        }
        note.textContent = bits.length ? bits.join(" \xB7 ") : stringifyLogValue(record);
        bubble.append(note);
      }
    } else {
      const senderId = String(record?.od || "").trim();
      bubble.setAttribute(
        "aria-label",
        record?.typ ? `${direction}: ${senderId || "\u2014"}, ${record.typ}` : `${direction}: ${senderId || "\u2014"}`
      );
      const sender = document.createElement("p");
      sender.className = "log-bubble-sender";
      sender.textContent = senderId || "\u2014";
      if (kind === "in" && senderId) {
        sender.style.color = senderColor(senderId);
      }
      const message = document.createElement("p");
      message.className = "log-bubble-text";
      message.textContent = record?.typ || direction;
      bubble.append(sender, message);
      const payload = record && Object.hasOwn(record, "data") ? record.data : record;
      const emptyObject = payload && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0;
      const hasPayload = payload != null && !emptyObject;
      const foot = document.createElement("div");
      foot.className = "log-bubble-foot";
      if (hasPayload || record?.requestId) {
        const disclosure = document.createElement("details");
        disclosure.className = "log-bubble-data";
        const summary = document.createElement("summary");
        summary.textContent = "podrobnosti";
        const body = document.createElement("pre");
        body.className = "log-bubble-body";
        body.textContent = stringifyLogValue(
          record?.requestId ? { requestId: record.requestId, data: payload } : payload
        );
        disclosure.append(summary, body);
        foot.append(disclosure);
      }
      foot.append(createLogTime(sentAt, time));
      bubble.append(foot);
    }
    const pinnedToBottom = logOutput.scrollHeight - logOutput.scrollTop - logOutput.clientHeight < 48;
    logOutput.append(bubble);
    while (logOutput.childElementCount > MANAGE_LOG_LIMIT) {
      logOutput.firstElementChild?.remove();
    }
    if (pinnedToBottom) {
      logOutput.scrollTop = logOutput.scrollHeight;
    }
  };
  var transport = new BoardTransport({
    onLog: appendManageLog
  });
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
  var delayOffsetEnabledInput = documentRef.querySelector(
    "#delayOffsetEnabled"
  );
  var manageHeaderClock = documentRef.querySelector("#manageHeaderClock");
  var manageHeaderStation = documentRef.querySelector("#manageHeaderStation");
  var boardSettingsDialog = documentRef.querySelector("#boardSettingsDialog");
  var boardSettingsTitle = documentRef.querySelector("#boardSettingsTitle");
  var boardSettingsBody = documentRef.querySelector("#boardSettingsBody");
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
  var liveScraperParametersRoot = documentRef.querySelector(
    "#liveScraperParameters"
  );
  var liveToggleButton = documentRef.querySelector("#liveToggleButton");
  var liveDeparturesState = documentRef.querySelector("#liveDeparturesState");
  var liveDeparturesStatus = documentRef.querySelector("#liveDeparturesStatus");
  var liveDeparturesDescription = documentRef.querySelector(
    "#liveDeparturesDescription"
  );
  var livePollIntervalInput = documentRef.querySelector("#livePollInterval");
  var livePollIntervalValue = documentRef.querySelector("#livePollIntervalValue");
  var submitButton = boardForm.querySelector('button[type="submit"]');
  var MANAGE_DOCUMENT_TITLE = documentRef.title || "PRAGOTRON \u2013 Spr\xE1vce";
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
  var boardSettingsInstanceId = "";
  var departureBoardLogo = normalizeDepartureBoardLogoId(
    savedSettings?.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
  );
  var departureBoardLogoSvg = String(savedSettings?.departureBoardLogoSvg || "").trim().slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH);
  var settingsUpdatedAt = Number(savedSettings?.settingsUpdatedAt) || 0;
  var readStoredSettings = () => {
    const stored = storage2.load();
    return stored?.settings && typeof stored.settings === "object" ? stored.settings : null;
  };
  var useNewerStoredLogo = () => {
    const storedSettings = readStoredSettings();
    const storedStamp = Number(storedSettings?.settingsUpdatedAt) || 0;
    if (!storedSettings || storedStamp <= settingsUpdatedAt) {
      return null;
    }
    return {
      departureBoardLogo: normalizeDepartureBoardLogoId(
        storedSettings.departureBoardLogo ?? DEPARTURE_BOARD_LOGO_DEFAULT
      ),
      departureBoardLogoSvg: String(storedSettings.departureBoardLogoSvg || "").trim().slice(0, DEPARTURE_BOARD_LOGO_SVG_MAX_LENGTH),
      settingsUpdatedAt: storedStamp
    };
  };
  var savedLiveSettings = savedState.liveDepartures && typeof savedState.liveDepartures === "object" ? savedState.liveDepartures : {};
  var liveDeparturesEnabled = savedLiveSettings.enabled === true;
  var liveApiUrl = normalizeLiveApiUrl(
    typeof savedLiveSettings.apiUrl === "string" && savedLiveSettings.apiUrl.trim() ? savedLiveSettings.apiUrl.trim() : getDefaultLiveApiUrl()
  );
  var savedScraperParameters = savedLiveSettings.parameters && typeof savedLiveSettings.parameters === "object" && !Array.isArray(savedLiveSettings.parameters) ? savedLiveSettings.parameters : {};
  var liveParameterValues = Object.fromEntries(
    Object.entries(savedScraperParameters).filter(([key]) => /^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(key)).map(([key, value]) => [key, String(value ?? "")])
  );
  var liveSourceUrl = normalizeLiveSourceUrl(
    typeof liveParameterValues.source === "string" && liveParameterValues.source.trim() ? liveParameterValues.source.trim() : typeof savedLiveSettings.sourceUrl === "string" && savedLiveSettings.sourceUrl.trim() ? savedLiveSettings.sourceUrl.trim() : LIVE_STATION_DEFAULTS.sourceUrl
  );
  if (liveParameterValues.source == null) {
    liveParameterValues.source = liveSourceUrl;
  }
  var liveScraperSchema = null;
  var liveSchemaLoading = false;
  var liveSchemaToken = 0;
  var liveWatchApiUrl = "";
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
  var settingsSentToInstances = /* @__PURE__ */ new Set();
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
  var resolveTrainTypeValue = (train, operator) => resolveProfileTrainType(train, operator);
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
  var getLightingSettingsState = () => {
    const newerLogo = useNewerStoredLogo();
    return {
      nightMode,
      autoNightMode,
      delayOffset,
      departureBoardLogo: newerLogo?.departureBoardLogo ?? departureBoardLogo,
      departureBoardLogoSvg: newerLogo?.departureBoardLogoSvg ?? departureBoardLogoSvg,
      settingsUpdatedAt: newerLogo?.settingsUpdatedAt ?? settingsUpdatedAt,
      lenses: getManagedLensState()
    };
  };
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
    flapTiming: { ...flapTiming },
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
  var normalizePlatformValue = (value) => matchProfileValue(getActiveStationProfile().platforms, value);
  var normalizeTrackValue = (value) => matchProfileValue(getActiveStationProfile().tracks, value);
  var normalizeSectorValue = (value) => matchProfileValue(profileSectorValues(), value);
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
    const newerLogo = useNewerStoredLogo();
    const settings = {
      ...getSettingsState(),
      lamps: lighting.getLampSettings(),
      clockLight: lighting.getClockSettings(),
      ...newerLogo || {},
      settingsUpdatedAt: newerLogo?.settingsUpdatedAt ?? settingsUpdatedAt
    };
    storage2.save({
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
  var publishStationProfile = () => {
    transport.publish("station-profile", {
      stationProfile: getActiveStationProfile()
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
    transport.publish("board:settings", getLightingSettingsState());
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
      const color = LENS_COLORS.yellow;
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
        departure.operator || "\u2014",
        departure.train || "\u2014",
        departure.trainNumber || "\u2014",
        departure.stations[0],
        departure.stations[1],
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
    if (document.activeElement?.classList?.contains("board-volume-range") && activeBoardsList?.contains(document.activeElement)) {
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
      instanceLine.append(documentRef.createTextNode(
        `${isDepartureBoard ? `${boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT} \u0159\xE1dk\u016F` : "n\xE1stupi\u0161tn\xED tabule"} \xB7 instance `
      ));
      const clientId = documentRef.createElement("span");
      clientId.className = "active-board-client";
      clientId.textContent = boardPresence.instanceId || "\u2014";
      if (boardPresence.instanceId) {
        clientId.style.color = senderColor(boardPresence.instanceId);
      }
      instanceLine.append(clientId);
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
      const settingsButton = documentRef.createElement("button");
      settingsButton.type = "button";
      settingsButton.className = "board-settings-button";
      settingsButton.dataset.boardInstanceId = boardPresence.instanceId;
      settingsButton.replaceChildren(createGearIcon());
      settingsButton.setAttribute("aria-label", "Nastaven\xED tabule");
      settingsButton.title = "Nastaven\xED tabule";
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
      actions.append(volumeControl, muteButton, settingsButton);
      const heading = documentRef.createElement("div");
      heading.className = "active-board-heading";
      heading.append(identifyButton, identity);
      item.append(heading, details, status, audioStatus, actions, connectionLine);
      activeBoardsList.appendChild(item);
    });
  };
  var createGearIcon = () => {
    const icon = documentRef.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    icon.classList.add("board-settings-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"></path>';
    return icon;
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
    documentRef.querySelectorAll(".board-volume-range").forEach((input) => {
      if (input.dataset.boardInstanceId !== boardPresence.instanceId || input === documentRef.activeElement) {
        return;
      }
      input.value = String(nextVolume);
      const output = input.parentElement?.querySelector("output");
      if (output) {
        output.textContent = `${nextVolume} %`;
      }
    });
    transport.publish("board:command", {
      action: "set-audio-volume",
      volume: nextVolume
    }, {
      target: {
        source: boardPresence.instanceId
      }
    });
    syncOpenBoardSettingsAudio(boardPresence);
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
    syncOpenBoardSettingsAudio(boardPresence);
  };
  var findBoardPresence = (instanceId) => [...activeBoards.values()].find(
    (presence) => presence.instanceId === instanceId
  );
  var boardSettingsTitleFor = (boardPresence) => {
    if (boardPresence.page === "departureBoard") {
      return "Odjezdov\xE1 tabule";
    }
    if (boardPresence.configured === false) {
      return "Tabule bez identity";
    }
    return formatBoardIdentity(boardPresence.identity);
  };
  var currentLensColors = (boardPresence) => {
    const reported = Array.isArray(boardPresence.lensColors) ? boardPresence.lensColors : [];
    const fromState = boardPresence.lensState?.lenses || [];
    return [
      reported[0] || fromState[0]?.color || "green",
      reported[1] || fromState[1]?.color || reported[0] || fromState[0]?.color || "green"
    ];
  };
  var syncOpenBoardSettingsAudio = (boardPresence) => {
    if (!boardSettingsDialog?.open || boardSettingsInstanceId !== boardPresence?.instanceId) {
      return;
    }
    const range = boardSettingsDialog.querySelector(".board-settings-volume");
    const output = boardSettingsDialog.querySelector(".board-settings-volume-output");
    const volume = normalizeBoardVolume(boardPresence.audioState?.volume);
    if (range && documentRef.activeElement !== range) {
      range.value = String(volume);
    }
    if (output && documentRef.activeElement !== range) {
      output.textContent = `${volume} %`;
    }
    const muteButton = boardSettingsDialog.querySelector(".board-settings-mute");
    if (!muteButton) {
      return;
    }
    const muted = boardPresence.audioState?.muted === true;
    muteButton.replaceChildren(createSpeakerIcon(muted));
    muteButton.setAttribute("aria-pressed", String(muted));
    muteButton.setAttribute(
      "aria-label",
      muted ? "Zapnout zvuk flap\u016F na t\xE9to tabuli" : "Ztlumit zvuk flap\u016F na t\xE9to tabuli"
    );
  };
  var assignIfIdle = (control, value) => {
    if (!control || documentRef.activeElement === control) {
      return;
    }
    if (control.type === "checkbox") {
      control.checked = Boolean(value);
      return;
    }
    const nextValue = String(value);
    if (control.value !== nextValue) {
      control.value = nextValue;
    }
  };
  var syncOpenBoardSettings = (boardPresence) => {
    syncOpenBoardSettingsAudio(boardPresence);
    if (!boardSettingsDialog?.open || boardSettingsInstanceId !== boardPresence?.instanceId) {
      return;
    }
    const colors = currentLensColors(boardPresence);
    const selects = boardSettingsDialog.querySelectorAll(
      ".lens-control-select select"
    );
    assignIfIdle(selects[0], LENS_COLORS[colors[0]] ? colors[0] : "green");
    assignIfIdle(
      selects[1],
      LENS_COLORS[colors[1]] ? colors[1] : selects[0]?.value || "green"
    );
    assignIfIdle(
      boardSettingsDialog.querySelector(".board-sync-rows input"),
      boardPresence.synchronizeRows !== false
    );
    assignIfIdle(
      boardSettingsDialog.querySelector('.board-form-field input[type="number"]'),
      normalizeDepartureBoardRowCount(
        boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT
      )
    );
    const timing = boardPresence.flapTiming ? normalizeFlapTiming(boardPresence.flapTiming) : null;
    const ranges = boardSettingsDialog.querySelectorAll(
      '.flap-timing-settings input[type="range"]'
    );
    if (timing) {
      assignIfIdle(ranges[0], timing.duration);
      assignIfIdle(ranges[1], timing.variation);
      if (ranges[0] && documentRef.activeElement !== ranges[0]) {
        const output = ranges[0].parentElement?.querySelector("output");
        if (output) {
          output.textContent = `${timing.duration} ms`;
        }
      }
      if (ranges[1] && documentRef.activeElement !== ranges[1]) {
        const output = ranges[1].parentElement?.querySelector("output");
        if (output) {
          output.textContent = `\xB1${timing.variation} ms`;
        }
      }
    }
  };
  var publishBoardCommand = (presence, payload) => {
    transport.publish("board:command", payload, {
      target: {
        source: presence.instanceId
      }
    });
  };
  var appendSynchronizeRowsControl = (boardPresence) => {
    const label = documentRef.createElement("label");
    label.className = "lamp-control-check board-sync-rows";
    const input = documentRef.createElement("input");
    input.type = "checkbox";
    input.checked = boardPresence.synchronizeRows !== false;
    label.append(
      input,
      documentRef.createTextNode(" Stejn\xE1 strana ve v\u0161ech \u0159\xE1dc\xEDch")
    );
    input.addEventListener("change", () => {
      const presence = findBoardPresence(boardSettingsInstanceId);
      if (!presence) {
        return;
      }
      presence.synchronizeRows = input.checked;
      publishBoardCommand(presence, {
        action: "set-synchronize-rows",
        synchronizeRows: input.checked
      });
    });
    boardSettingsBody.append(label);
  };
  var lampValue = (source, id, field, fallback) => {
    const value = source?.[id]?.[field];
    return value === void 0 ? fallback : value;
  };
  var appendPlatformLighting = (boardPresence) => {
    const lamps = boardPresence.lamps || lighting.getLampSettings();
    const clock = boardPresence.clockLight || lighting.getClockSettings();
    const section = documentRef.createElement("fieldset");
    section.className = "lamp-settings";
    const legendWrap = documentRef.createElement("div");
    const legend = documentRef.createElement("legend");
    legend.textContent = "Osv\u011Btlen\xED \u017E\xE1rovek";
    legendWrap.append(legend);
    const controls = documentRef.createElement("div");
    controls.className = "lamp-controls";
    const clockPanel = documentRef.createElement("fieldset");
    clockPanel.className = "lamp-control clock-light-control";
    const clockLegendWrap = documentRef.createElement("div");
    const clockLegend = documentRef.createElement("legend");
    clockLegend.textContent = "Osv\u011Btlen\xED hodin";
    clockLegendWrap.append(clockLegend);
    const clockEnabledLabel = documentRef.createElement("label");
    clockEnabledLabel.className = "lamp-control-check";
    const clockEnabled = documentRef.createElement("input");
    clockEnabled.type = "checkbox";
    clockEnabled.dataset.clockField = "enabled";
    clockEnabled.checked = clock.enabled !== false;
    clockEnabledLabel.append(clockEnabled, documentRef.createTextNode(" Sv\xEDt\xED"));
    const clockIntensityLabel = documentRef.createElement("label");
    clockIntensityLabel.className = "lamp-control-range";
    const clockHeader = documentRef.createElement("span");
    clockHeader.className = "lamp-control-range-header";
    clockHeader.append(documentRef.createTextNode("Intenzita"));
    const clockOutput = documentRef.createElement("output");
    clockOutput.textContent = `${clock.intensity ?? NIGHT_CLOCK_DEFAULTS.intensity}%`;
    clockHeader.append(clockOutput);
    const clockIntensity = documentRef.createElement("input");
    clockIntensity.type = "range";
    clockIntensity.min = "0";
    clockIntensity.max = "100";
    clockIntensity.step = "1";
    clockIntensity.dataset.clockField = "intensity";
    clockIntensity.value = String(
      clock.intensity ?? NIGHT_CLOCK_DEFAULTS.intensity
    );
    clockIntensityLabel.append(clockHeader, clockIntensity);
    clockIntensity.addEventListener("input", () => {
      clockOutput.textContent = `${clockIntensity.value}%`;
    });
    const clockControls = documentRef.createElement("div");
    clockControls.className = "clock-light-controls";
    clockControls.append(clockEnabledLabel, clockIntensityLabel);
    clockPanel.append(clockLegendWrap, clockControls);
    NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
      const panel = documentRef.createElement("fieldset");
      panel.className = "lamp-control";
      panel.dataset.lampId = defaultSetting.id;
      const panelLegendWrap = documentRef.createElement("div");
      const panelLegend = documentRef.createElement("legend");
      panelLegend.textContent = defaultSetting.label;
      panelLegendWrap.append(panelLegend);
      const toggles = documentRef.createElement("div");
      toggles.className = "lamp-control-toggles";
      const enabledLabel = documentRef.createElement("label");
      enabledLabel.className = "lamp-control-check";
      const enabled = documentRef.createElement("input");
      enabled.type = "checkbox";
      enabled.dataset.lampField = "enabled";
      enabled.checked = lampValue(
        lamps,
        defaultSetting.id,
        "enabled",
        defaultSetting.enabled
      ) !== false;
      enabledLabel.append(enabled, documentRef.createTextNode(" Sv\xEDt\xED"));
      const variationLabel = documentRef.createElement("label");
      variationLabel.className = "lamp-control-check";
      const variation = documentRef.createElement("input");
      variation.type = "checkbox";
      variation.dataset.lampField = "variation";
      variation.checked = Boolean(lampValue(
        lamps,
        defaultSetting.id,
        "variation",
        defaultSetting.variation
      ));
      variationLabel.append(variation, documentRef.createTextNode(" S efektem"));
      toggles.append(enabledLabel, variationLabel);
      const intensityLabel = documentRef.createElement("label");
      intensityLabel.className = "lamp-control-range";
      const intensityHeader = documentRef.createElement("span");
      intensityHeader.className = "lamp-control-range-header";
      intensityHeader.append(documentRef.createTextNode("Intenzita"));
      const intensityOutput = documentRef.createElement("output");
      const intensityValue = lampValue(
        lamps,
        defaultSetting.id,
        "intensity",
        defaultSetting.intensity
      );
      intensityOutput.textContent = `${intensityValue}%`;
      intensityHeader.append(intensityOutput);
      const intensity = documentRef.createElement("input");
      intensity.type = "range";
      intensity.min = "0";
      intensity.max = "100";
      intensity.step = "1";
      intensity.dataset.lampField = "intensity";
      intensity.value = String(intensityValue);
      intensityLabel.append(intensityHeader, intensity);
      intensity.addEventListener("input", () => {
        intensityOutput.textContent = `${intensity.value}%`;
      });
      const speedLabel = documentRef.createElement("label");
      speedLabel.className = "lamp-control-range";
      const speedHeader = documentRef.createElement("span");
      speedHeader.className = "lamp-control-range-header";
      speedHeader.append(documentRef.createTextNode("D\xE9lka cyklu"));
      const speedOutput = documentRef.createElement("output");
      const speedValue = lampValue(
        lamps,
        defaultSetting.id,
        "speed",
        defaultSetting.speed
      );
      speedOutput.textContent = `${Number(speedValue).toFixed(1)} s`;
      speedHeader.append(speedOutput);
      const speed = documentRef.createElement("input");
      speed.type = "range";
      speed.min = "1";
      speed.max = "120";
      speed.step = "0.5";
      speed.dataset.lampField = "speed";
      speed.value = String(speedValue);
      speedLabel.append(speedHeader, speed);
      speed.addEventListener("input", () => {
        speedOutput.textContent = `${Number(speed.value).toFixed(1)} s`;
      });
      const fadeLabel = documentRef.createElement("label");
      fadeLabel.className = "lamp-control-select";
      fadeLabel.append(documentRef.createTextNode("Efekt"));
      const fade = documentRef.createElement("select");
      fade.dataset.lampField = "fade";
      NIGHT_FADE_MODES.forEach((mode) => {
        const option = documentRef.createElement("option");
        option.value = mode.value;
        option.textContent = mode.label;
        fade.append(option);
      });
      fade.value = String(lampValue(
        lamps,
        defaultSetting.id,
        "fade",
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
    const help = documentRef.createElement("p");
    help.className = "lamp-settings-help";
    help.textContent = "Checkbox \u201ES efektem\u201C zap\xEDn\xE1 vybran\xFD sv\u011Bteln\xFD efekt. Volba \u201EBez pohas\xEDn\xE1n\xED\u201C udr\u017E\xED \u017E\xE1rovku ve st\xE1l\xE9m svitu. D\xE9lka cyklu je skute\u010Dn\xFD \u010Das cel\xE9ho efektu; vy\u0161\u0161\xED hodnota znamen\xE1 pomalej\u0161\xED zm\u011Bny.";
    const actions = documentRef.createElement("div");
    actions.className = "lamp-settings-actions";
    const resetButton = documentRef.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Obnovit v\xFDchoz\xED sv\u011Btla";
    actions.append(resetButton);
    section.append(legendWrap, controls, clockPanel, help, actions);
    boardSettingsBody.append(section);
    const publishLighting = () => {
      const presence = findBoardPresence(boardSettingsInstanceId);
      if (!presence) {
        return;
      }
      const nextLamps = {};
      controls.querySelectorAll("[data-lamp-id]").forEach((panel) => {
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
        action: "set-lighting",
        lamps: nextLamps,
        clockLight: nextClock
      });
    };
    section.addEventListener("input", publishLighting);
    section.addEventListener("change", publishLighting);
    resetButton.addEventListener("click", () => {
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
        panel.querySelector('[data-lamp-field="enabled"]').checked = defaultSetting.enabled;
        panel.querySelector('[data-lamp-field="variation"]').checked = defaultSetting.variation;
        const intensity = panel.querySelector('[data-lamp-field="intensity"]');
        intensity.value = String(defaultSetting.intensity);
        intensity.parentElement.querySelector("output").textContent = `${defaultSetting.intensity}%`;
        const speed = panel.querySelector('[data-lamp-field="speed"]');
        speed.value = String(defaultSetting.speed);
        speed.parentElement.querySelector("output").textContent = `${Number(defaultSetting.speed).toFixed(1)} s`;
        panel.querySelector('[data-lamp-field="fade"]').value = defaultSetting.fade;
      });
      publishLighting();
    });
  };
  var appendFlapTimingControl = (boardPresence) => {
    const fallback = boardPresence.page === "departureBoard" ? DEPARTURE_FLAP_TIMING_DEFAULTS : PLATFORM_FLAP_TIMING_DEFAULTS;
    const timing = boardPresence.flapTiming ? normalizeFlapTiming(boardPresence.flapTiming) : normalizeFlapTiming(fallback);
    const section = documentRef.createElement("fieldset");
    section.className = "flap-timing-settings";
    const legendWrap = documentRef.createElement("div");
    const legend = documentRef.createElement("legend");
    legend.textContent = "Rychlost split-flap\u016F";
    legendWrap.append(legend);
    const controls = documentRef.createElement("div");
    controls.className = "flap-timing-controls";
    const createRange = (labelText, min, max, step, value, format) => {
      const field = documentRef.createElement("label");
      field.className = "lamp-control-range";
      const header = documentRef.createElement("span");
      header.className = "lamp-control-range-header";
      header.append(documentRef.createTextNode(labelText));
      const output = documentRef.createElement("output");
      output.textContent = format(value);
      header.append(output);
      const input = documentRef.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      field.append(header, input);
      return { field, input, output };
    };
    const duration = createRange(
      "D\xE9lka jednoho flapu",
      FLAP_TIMING_DURATION_MIN,
      FLAP_TIMING_DURATION_MAX,
      10,
      timing.duration,
      (value) => `${value} ms`
    );
    const variation = createRange(
      "N\xE1hodn\xE1 variace",
      FLAP_TIMING_VARIATION_MIN,
      FLAP_TIMING_VARIATION_MAX,
      1,
      timing.variation,
      (value) => `\xB1${value} ms`
    );
    controls.append(duration.field, variation.field);
    const help = documentRef.createElement("small");
    help.className = "flap-timing-help";
    help.textContent = "Nastaven\xED se pou\u017Eije pro ka\u017Ed\xFD jednotliv\xFD flap v\u010Detn\u011B \u010Dasu, typu vlaku, zpo\u017Ed\u011Bn\xED a n\xE1zv\u016F stanic. Plat\xED jen pro tuto tabuli.";
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
      variation.output.textContent = `\xB1${nextTiming.variation} ms`;
      presence.flapTiming = nextTiming;
      publishBoardCommand(presence, {
        action: "set-flap-timing",
        flapTiming: nextTiming
      });
    };
    duration.input.addEventListener("input", publishTiming);
    variation.input.addEventListener("input", publishTiming);
  };
  var openBoardSettings = (boardPresence) => {
    if (!boardSettingsDialog || !boardSettingsBody || !boardPresence) {
      return;
    }
    boardSettingsInstanceId = boardPresence.instanceId;
    boardSettingsDialog.classList.toggle(
      "is-platform-board",
      boardPresence.page !== "departureBoard"
    );
    if (boardSettingsTitle) {
      boardSettingsTitle.textContent = boardSettingsTitleFor(boardPresence);
    }
    boardSettingsBody.replaceChildren();
    const colors = currentLensColors(boardPresence);
    const firstColor = createLensColorSelect("Barva 1. \u010Do\u010Dky");
    const secondColor = createLensColorSelect("Barva 2. \u010Do\u010Dky");
    firstColor.select.value = LENS_COLORS[colors[0]] ? colors[0] : "green";
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
      transport.publish("board:command", {
        action: "set-lens-colors",
        colors: nextColors
      }, {
        target: {
          source: presence.instanceId
        }
      });
    };
    firstColor.select.addEventListener("change", publishLensColors);
    secondColor.select.addEventListener("change", publishLensColors);
    const colorStack = documentRef.createElement("div");
    colorStack.className = "lens-control-stack";
    colorStack.append(firstColor.label, secondColor.label);
    boardSettingsBody.append(colorStack);
    if (boardPresence.page === "departureBoard") {
      appendSynchronizeRowsControl(boardPresence);
      const rowLabel = documentRef.createElement("label");
      rowLabel.className = "board-form-field";
      rowLabel.append(documentRef.createTextNode("Po\u010Det \u0159\xE1dk\u016F"));
      const rowInput = documentRef.createElement("input");
      rowInput.type = "number";
      rowInput.min = String(DEPARTURE_BOARD_ROW_COUNT_MIN);
      rowInput.max = String(DEPARTURE_BOARD_ROW_COUNT_MAX);
      rowInput.step = "1";
      rowInput.inputMode = "numeric";
      rowInput.value = String(normalizeDepartureBoardRowCount(
        boardPresence.rowCount || DEPARTURE_BOARD_ROW_COUNT_DEFAULT
      ));
      const rowHelp = documentRef.createElement("small");
      rowHelp.textContent = "Plat\xED jen pro tuto odjezdovou tabuli. Rozsah je 1\u201324.";
      rowLabel.append(rowInput, rowHelp);
      rowInput.addEventListener("change", () => {
        const presence = findBoardPresence(boardSettingsInstanceId);
        if (!presence) {
          return;
        }
        const nextCount = normalizeDepartureBoardRowCount(rowInput.value);
        rowInput.value = String(nextCount);
        presence.rowCount = nextCount;
        transport.publish("board:command", {
          action: "set-row-count",
          rowCount: nextCount
        }, {
          target: {
            source: presence.instanceId
          }
        });
      });
      boardSettingsBody.append(rowLabel);
    }
    if (boardPresence.page !== "departureBoard") {
      appendPlatformLighting(boardPresence);
    }
    appendFlapTimingControl(boardPresence);
    const audioRow = documentRef.createElement("div");
    audioRow.className = "board-settings-audio";
    const volume = normalizeBoardVolume(boardPresence.audioState?.volume);
    const volumeLabel = documentRef.createElement("label");
    volumeLabel.className = "board-volume";
    const volumeText = documentRef.createElement("span");
    volumeText.textContent = "Hlasitost";
    const volumeRange = documentRef.createElement("input");
    volumeRange.type = "range";
    volumeRange.className = "board-volume-range board-settings-volume";
    volumeRange.min = "0";
    volumeRange.max = "100";
    volumeRange.step = "1";
    volumeRange.value = String(volume);
    const volumeOutput = documentRef.createElement("output");
    volumeOutput.className = "board-settings-volume-output";
    volumeOutput.textContent = `${volume} %`;
    volumeRange.addEventListener("input", () => {
      volumeOutput.textContent = `${volumeRange.value} %`;
      const presence = findBoardPresence(boardSettingsInstanceId);
      setBoardVolume(presence, volumeRange.value);
    });
    volumeLabel.append(volumeText, volumeRange, volumeOutput);
    const muteButton = documentRef.createElement("button");
    muteButton.type = "button";
    muteButton.className = "board-settings-mute";
    const muted = boardPresence.audioState?.muted === true;
    muteButton.replaceChildren(createSpeakerIcon(muted));
    muteButton.setAttribute("aria-pressed", String(muted));
    muteButton.setAttribute(
      "aria-label",
      muted ? "Zapnout zvuk flap\u016F na t\xE9to tabuli" : "Ztlumit zvuk flap\u016F na t\xE9to tabuli"
    );
    muteButton.addEventListener("click", () => {
      const presence = findBoardPresence(boardSettingsInstanceId);
      toggleBoardMute(presence);
    });
    audioRow.append(volumeLabel, muteButton);
    boardSettingsBody.append(audioRow);
    if (!boardSettingsDialog.open) {
      boardSettingsDialog.showModal();
    }
  };
  activeBoardsList?.addEventListener("click", (event) => {
    const settingsButton = event.target.closest(".board-settings-button");
    if (settingsButton) {
      openBoardSettings(findBoardPresence(settingsButton.dataset.boardInstanceId));
      return;
    }
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
  var fillCatalogSelects = () => {
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
        const option = documentRef.createElement("option");
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
        const option = documentRef.createElement("option");
        option.value = type.name;
        option.textContent = type.label || type.name || "Bez typu vlaku";
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
      preDepartureEnabledLabel
    );
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
    const timingControls = documentRef.createElement("div");
    timingControls.className = "lens-control-stack";
    timingControls.append(blinkIntervalLabel, preDepartureSecondsLabel);
    panel.append(toggles, timingControls);
    lensControls.replaceChildren(panel);
    lensControlElements.set("component", {
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
    ].forEach((input) => {
      input.addEventListener("input", updateLensFromControls);
      input.addEventListener("change", updateLensFromControls);
    });
    syncLensControls();
  }
  delayOffsetEnabledInput?.addEventListener("change", updateDelayOffsetFromControls);
  syncDelayOffsetControls();
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
    const applies = matching.filter(
      (desired) => desired.action === "apply-board" && desired.state?.departureTime
    );
    if (applies.length > 0) {
      const now = /* @__PURE__ */ new Date();
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
      const newerReset = matching.filter((desired) => desired.action !== "apply-board").sort(
        (first, second) => Number(second.revision) - Number(first.revision)
      )[0];
      if (!newerReset || Number(newerReset.revision) <= Number(nearest.revision)) {
        return nearest;
      }
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
  var boardListView = (presence) => JSON.stringify({
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
      lensColors: Array.isArray(payload.lensColors) && payload.lensColors.length ? payload.lensColors.slice(0, 2) : previous?.lensColors || null,
      synchronizeRows: typeof payload.synchronizeRows === "boolean" ? payload.synchronizeRows : previous?.synchronizeRows !== false,
      lamps: payload.lamps && typeof payload.lamps === "object" ? payload.lamps : previous?.lamps || null,
      clockLight: payload.clockLight && typeof payload.clockLight === "object" ? payload.clockLight : previous?.clockLight || null,
      flapTiming: payload.flapTiming && typeof payload.flapTiming === "object" ? normalizeFlapTiming(payload.flapTiming) : previous?.flapTiming || null,
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
    const nextListView = boardListView(boardPresence);
    const listChanged = nextListView !== previous?.listView;
    boardPresence.listView = nextListView;
    activeBoards.set(key, boardPresence);
    if (listChanged) {
      renderActiveBoards();
    }
    syncOpenBoardSettings(boardPresence);
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
        settingsSentToInstances.delete(boardPresence.instanceId);
        removed = true;
      }
    });
    if (removed) {
      renderActiveBoards();
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
      const instanceId = message.payload?.instanceId || message.source;
      const sendSettings = Boolean(instanceId) && !settingsSentToInstances.has(instanceId);
      if (sendSettings) {
        const newerLogo = useNewerStoredLogo();
        if (newerLogo) {
          departureBoardLogo = newerLogo.departureBoardLogo;
          departureBoardLogoSvg = newerLogo.departureBoardLogoSvg;
          settingsUpdatedAt = newerLogo.settingsUpdatedAt;
          syncDepartureBoardLogoControls();
        }
        settingsSentToInstances.add(instanceId);
        transport.publish("board:settings", {
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
        if (Array.isArray(message.payload?.lensColors) && message.payload.lensColors.length) {
          boardPresence.lensColors = message.payload.lensColors.slice(0, 2);
        }
        if (Number.isInteger(Number(message.payload?.rowCount)) && Number(message.payload.rowCount) > 0) {
          boardPresence.rowCount = Number(message.payload.rowCount);
        }
        if (typeof message.payload?.synchronizeRows === "boolean") {
          boardPresence.synchronizeRows = message.payload.synchronizeRows;
        }
        if (message.payload?.lamps && typeof message.payload.lamps === "object") {
          boardPresence.lamps = message.payload.lamps;
        }
        if (message.payload?.clockLight && typeof message.payload.clockLight === "object") {
          boardPresence.clockLight = message.payload.clockLight;
        }
        if (message.payload?.flapTiming && typeof message.payload.flapTiming === "object") {
          boardPresence.flapTiming = normalizeFlapTiming(
            message.payload.flapTiming
          );
        }
        boardPresence.lastSeen = Date.now();
        boardPresence.listView = boardListView(boardPresence);
        syncOpenBoardSettings(boardPresence);
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
  var nearestDepartureForTarget = (target) => {
    if (!isConfiguredTarget(target)) {
      return null;
    }
    const now = /* @__PURE__ */ new Date();
    return departures.filter(
      (departure) => isConfiguredTarget(departure.target) && sameTarget(departure.target, target)
    ).sort(
      (first, second) => compareDeparturesByTime(first, second, now, delayOffset)
    )[0] || null;
  };
  var collectBoardTargets = (...groups) => {
    const targets = /* @__PURE__ */ new Map();
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
  var syncTargetBoard = (target) => {
    if (!isConfiguredTarget(target)) {
      return null;
    }
    const nearest = nearestDepartureForTarget(target);
    const current = desiredStates[getBoardIdentityKey(target)];
    if (!nearest) {
      if (!current || current.action === "reset-board") {
        return null;
      }
      const revision2 = nextStateRevision();
      setDesiredState(target, "reset-board", getEmptyState(), revision2);
      return {
        action: "reset-board",
        state: getEmptyState(),
        target,
        revision: revision2
      };
    }
    const nextState = getBoardStateFromDeparture(nearest);
    if (current?.action === "apply-board" && sameDepartureContent(
      { ...current.state, target: current.target },
      { ...nextState, target: nearest.target }
    )) {
      return null;
    }
    const revision = nextStateRevision();
    nearest.revision = revision;
    setDesiredState(
      nearest.target,
      "apply-board",
      nextState,
      revision
    );
    return {
      action: "apply-board",
      state: nextState,
      target: nearest.target,
      revision
    };
  };
  var syncAllTargetBoards = () => collectBoardTargets(departures).map((target) => syncTargetBoard(target)).filter(Boolean);
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
    if (changed) {
      departures = [...manualDepartures, ...nextLive];
    }
    const commands = collectBoardTargets(previousDepartures, departures).map((target) => syncTargetBoard(target)).filter(Boolean).map((command) => sendBackgroundBoardAction(
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
    documentRef.querySelectorAll("[data-parameter-station]").forEach((station) => {
      const link = station.querySelector("a");
      const href = String(
        liveParameterValues[station.dataset.parameterStation] || ""
      ).trim();
      if (!name || !href || !link) {
        station.hidden = true;
        link?.removeAttribute("href");
        if (link) {
          link.textContent = "";
        }
        return;
      }
      station.hidden = false;
      link.textContent = name;
      link.href = href;
    });
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
      if (liveSchemaLoading && !liveScraperSchema) {
        liveDeparturesDescription.textContent = "Na\u010D\xEDt\xE1m parametry scraperu\u2026";
      } else if (liveScraperSchema?.description) {
        liveDeparturesDescription.textContent = `${liveScraperSchema.description} Aktualizace ka\u017Ed\xFDch ${seconds} sekund.`;
      } else {
        liveDeparturesDescription.textContent = `\u017Div\xE9 odjezdy \xB7 aktualizace ka\u017Ed\xFDch ${seconds} sekund.`;
      }
    }
  };
  var scraperQueryParameters = () => {
    const query = {};
    (liveScraperSchema?.parameters || []).forEach((parameter) => {
      const normalized = normalizeScraperParameterValue(
        parameter,
        liveParameterValues[parameter.id]
      );
      if (!normalized.ok || normalized.value === "") {
        return;
      }
      query[parameter.id] = normalized.value;
    });
    return query;
  };
  var syncLiveSourceFromParameters = () => {
    const parameter = liveScraperSchema?.parameters?.find(
      (item) => item.format === "sz-station-url"
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
      liveStationName = normalized.key === LIVE_STATION_DEFAULTS.key ? LIVE_STATION_DEFAULTS.name : "";
    }
    liveSourceUrl = normalized.value;
    liveParameterValues[parameter.id] = normalized.value;
  };
  var applyParameterInput = (parameter, control) => {
    const normalized = normalizeScraperParameterValue(parameter, control.value);
    if (!normalized.ok) {
      setLiveStatus(normalized.message, true);
      control.value = liveParameterValues[parameter.id] ?? "";
      return;
    }
    const previousKey = parameter.format === "sz-station-url" ? parseLiveSourceUrl(liveSourceUrl).key : "";
    liveParameterValues[parameter.id] = normalized.value;
    control.value = normalized.value;
    if (parameter.format === "sz-station-url") {
      if (normalized.key !== previousKey) {
        liveStationName = normalized.key === LIVE_STATION_DEFAULTS.key ? LIVE_STATION_DEFAULTS.name : "";
      }
      liveSourceUrl = normalized.value;
    }
    renderLiveSourceStation();
    persistState();
    setLiveStatus("");
  };
  var renderScraperParameters = () => {
    if (!liveScraperParametersRoot) {
      return;
    }
    const activeId = documentRef.activeElement?.dataset?.parameter || "";
    liveScraperParametersRoot.replaceChildren();
    (liveScraperSchema?.parameters || []).forEach((parameter) => {
      const field = documentRef.createElement("label");
      field.className = "board-form-field";
      field.htmlFor = `liveParameter-${parameter.id}`;
      const heading = documentRef.createElement("span");
      heading.className = "live-source-heading";
      const label = documentRef.createElement("span");
      label.textContent = parameter.label;
      heading.append(label);
      if (parameter.showStation) {
        const station = documentRef.createElement("span");
        station.className = "live-source-station";
        station.hidden = true;
        station.dataset.parameterStation = parameter.id;
        const link = documentRef.createElement("a");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        station.append("(", link, ")");
        heading.append(station);
      }
      field.append(heading);
      const control = parameter.type === "select" ? documentRef.createElement("select") : documentRef.createElement("input");
      control.id = `liveParameter-${parameter.id}`;
      control.dataset.parameter = parameter.id;
      control.disabled = liveDeparturesEnabled;
      if (parameter.type === "select") {
        parameter.options.forEach((option) => {
          const item = documentRef.createElement("option");
          item.value = option.value;
          item.textContent = option.label;
          control.append(item);
        });
      } else {
        control.type = parameter.type === "number" ? "number" : parameter.type;
        control.autocomplete = "off";
        control.spellcheck = false;
        if (parameter.placeholder) {
          control.placeholder = parameter.placeholder;
        }
        if (parameter.type === "number") {
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
      control.value = liveParameterValues[parameter.id] ?? parameter.default ?? "";
      field.append(control);
      if (parameter.help) {
        const help = documentRef.createElement("small");
        help.id = `liveParameterHelp-${parameter.id}`;
        help.textContent = parameter.help;
        control.setAttribute("aria-describedby", help.id);
        field.append(help);
      }
      liveScraperParametersRoot.append(field);
      control.addEventListener("change", () => {
        applyParameterInput(parameter, control);
      });
    });
    renderLiveSourceStation();
    if (activeId) {
      liveScraperParametersRoot.querySelector(`[data-parameter="${CSS.escape(activeId)}"]`)?.focus();
    }
  };
  var adoptScraperSchema = (schema) => {
    liveScraperSchema = schema;
    schema.parameters.forEach((parameter) => {
      const raw = Object.prototype.hasOwnProperty.call(
        liveParameterValues,
        parameter.id
      ) ? liveParameterValues[parameter.id] : parameter.default;
      const normalized = normalizeScraperParameterValue(parameter, raw);
      liveParameterValues[parameter.id] = normalized.ok ? normalized.value : String(raw ?? "");
    });
    syncLiveSourceFromParameters();
    renderScraperParameters();
    renderLivePollInterval();
    persistState();
  };
  var loadScraperSchema = async () => {
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
        error instanceof Error ? error.message : "Scraper neposkytl definici parametr\u016F.",
        true
      );
      return false;
    }
  };
  var renderLiveControls = () => {
    liveScraperParametersRoot?.querySelectorAll("[data-parameter]").forEach((control) => {
      const id = control.dataset.parameter;
      if (documentRef.activeElement !== control) {
        control.value = liveParameterValues[id] ?? "";
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
  var scraperWatchesItself = () => liveScraperSchema?.controls?.watch === true;
  var releaseScraperWatch = () => {
    const apiUrl = liveWatchApiUrl;
    if (!apiUrl) {
      return;
    }
    liveWatchApiUrl = "";
    const url = scraperControlUrl(apiUrl, "stop");
    void fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ client: transport.id })
    }).catch(() => {
    });
  };
  var engageScraperWatch = async () => {
    if (!scraperWatchesItself()) {
      releaseScraperWatch();
      return;
    }
    if (liveWatchApiUrl && liveWatchApiUrl !== liveApiUrl) {
      releaseScraperWatch();
    }
    await postScraperControl({
      apiUrl: liveApiUrl,
      action: "watch",
      parameters: scraperQueryParameters(),
      pollIntervalMs: livePollIntervalMs,
      clientId: transport.id
    });
    liveWatchApiUrl = liveApiUrl;
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
        const idle = error instanceof Error && error.message === SCRAPER_IDLE_ERROR;
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
      const fetchedAt = payload.fetchedAt ? new Date(payload.fetchedAt).toLocaleTimeString("cs-CZ") : (/* @__PURE__ */ new Date()).toLocaleTimeString("cs-CZ");
      if (typeof payload.station === "string" && payload.station.trim()) {
        liveStationName = payload.station.trim();
        persistState();
        renderLiveSourceStation();
      }
      const stationName = liveStationName || liveScraperSchema?.name || "scraper";
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
    void (async () => {
      try {
        await engageScraperWatch();
      } catch (error) {
        if (!liveDeparturesEnabled) {
          return;
        }
        setLiveStatus(
          error instanceof Error ? error.message : "Sledov\xE1n\xED scraperu se nepoda\u0159ilo spustit.",
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
  var stopLiveDepartures = () => {
    stopLivePolling();
    liveDeparturesEnabled = false;
    releaseScraperWatch();
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
  var startupBoardCommands = syncAllTargetBoards();
  if (startupBoardCommands.length > 0) {
    desiredStatesRepaired = true;
  }
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
    const previousTarget = previous?.target;
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
    const commands = [];
    if (previousTarget && isConfiguredTarget(previousTarget) && !sameTarget(previousTarget, target)) {
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
  var resetDeparture = (departure) => {
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
    const actionButton2 = event.target.closest("[data-departure-action]");
    if (!actionButton2) {
      return;
    }
    const departure = getDepartureById(actionButton2.dataset.departureId);
    if (actionButton2.dataset.departureAction === "load") {
      loadDepartureIntoForm(departure);
    } else if (actionButton2.dataset.departureAction === "reset") {
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
  startupBoardCommands.forEach((command) => {
    void sendBackgroundBoardAction(
      command.action,
      command.state,
      command.target,
      command.revision
    );
  });
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
  var syncedNearestMinute = (/* @__PURE__ */ new Date()).getHours() * 60 + (/* @__PURE__ */ new Date()).getMinutes();
  var syncNearestBoardsForClock = () => {
    const now = /* @__PURE__ */ new Date();
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
  var scheduleManageClock = () => {
    const now = /* @__PURE__ */ new Date();
    renderManageClock(now);
    syncNearestBoardsForClock();
    manageClockTimer = window.setTimeout(
      scheduleManageClock,
      1e3 - now.getMilliseconds()
    );
  };
  scheduleManageClock();
  renderActiveBoards();
  renderDeparturesTable();
  syncDelayOffsetControls();
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
      const desired = desiredStates[getBoardIdentityKey(target2)];
      sendBoardAction(
        desired?.action || "apply-board",
        desired?.state || getBoardStateFromDeparture(departure),
        "P\u0159\xEDklad na\u010Dten.",
        {
          target: desired?.target || target2,
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
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    if (!command) {
      setBoardFormStatus("Tabule resetov\xE1na.");
      return;
    }
    sendBoardAction(
      command.action,
      command.state,
      command.action === "apply-board" ? "P\u0159\xEDklad byl odebr\xE1n. Tabule ukazuje dal\u0161\xED odjezd." : "Tabule resetov\xE1na.",
      {
        target: command.target,
        revision: command.revision
      }
    );
  });
  resetAllSettingsButton.addEventListener("click", () => {
    storage2.clear();
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
    formDepartureId = "";
    formDepartureLocked = false;
    lighting.reset();
    lensDisplay.setImmediate(createDefaultLensState());
    nightMode = false;
    autoNightMode = false;
    sunSchedule.stop();
    flapTiming = normalizeFlapTiming(FLAP_TIMING_DEFAULTS);
    delayOffset = DELAY_OFFSET_DEFAULT;
    departureBoardLogo = DEPARTURE_BOARD_LOGO_DEFAULT;
    departureBoardLogoSvg = "";
    renderNightMode();
    renderLiveControls();
    void loadScraperSchema();
    setLiveStatus("Live odjezdy byly vypnut\xE9 obnoven\xEDm nastaven\xED.");
    syncLensControls();
    syncDelayOffsetControls();
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
    const desired = desiredStates[getBoardIdentityKey(target)];
    const nearest = nearestDepartureForTarget(target);
    sendBoardAction(
      "apply-board",
      desired?.state || getBoardStateFromDeparture(nearest || departure),
      nearest && nearest.id !== departure.id ? "Odjezd byl ulo\u017Een. N\xE1stupi\u0161tn\xED tabule ukazuje bli\u017E\u0161\xED odjezd." : "\xDAdaje byly odesl\xE1ny na tabuli.",
      {
        target: desired?.target || target,
        revision: desired?.revision || departure.revision
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
  liveApiUrlInput?.addEventListener("change", () => {
    liveApiUrl = normalizeLiveApiUrl(
      liveApiUrlInput.value.trim() || getDefaultLiveApiUrl()
    );
    renderLiveControls();
    persistState();
    void loadScraperSchema();
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
    if (liveDeparturesEnabled && scraperWatchesItself()) {
      void engageScraperWatch();
    }
  });
  liveToggleButton?.addEventListener("click", () => {
    if (liveDeparturesEnabled) {
      stopLiveDepartures();
    } else {
      startLivePolling();
    }
  });
  var MANAGE_BLOCK_STATE_KEY = "pragotron.manage.blockState.v1";
  var readManageBlockState = () => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(MANAGE_BLOCK_STATE_KEY) || "{}"
      );
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch {
      return {};
    }
  };
  var rememberManageBlock = (element, collapsed) => {
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
    }
  };
  var applyStoredBlockState = (element, button, collapsedBlocks) => {
    const collapsed = Boolean(element?.id && collapsedBlocks[element.id]);
    element.classList.toggle("is-collapsed", collapsed);
    button?.setAttribute("aria-expanded", String(!collapsed));
  };
  var setupManageBlockToggles = () => {
    const collapsedBlocks = readManageBlockState();
    documentRef.querySelectorAll("#manage fieldset").forEach((fieldset) => {
      const legend = fieldset.querySelector(":scope > div > legend");
      if (!legend || legend.querySelector(".manage-block-toggle")) {
        return;
      }
      const heading = legend.parentElement;
      if (!heading) {
        return;
      }
      heading.classList.add("manage-block-heading");
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "manage-block-toggle";
      button.setAttribute("aria-expanded", "true");
      const mark = documentRef.createElement("span");
      mark.className = "manage-block-mark";
      mark.setAttribute("aria-hidden", "true");
      const label = documentRef.createElement("span");
      label.className = "manage-block-label";
      label.textContent = legend.textContent.trim();
      button.append(mark, label);
      legend.replaceChildren(button);
      applyStoredBlockState(fieldset, button, collapsedBlocks);
      button.addEventListener("click", () => {
        const collapsed = fieldset.classList.toggle("is-collapsed");
        button.setAttribute("aria-expanded", String(!collapsed));
        rememberManageBlock(fieldset, collapsed);
      });
    });
    documentRef.querySelectorAll(".station-profile-section").forEach((section) => {
      const button = section.querySelector(
        ":scope > .station-profile-section-heading .manage-block-toggle"
      );
      if (!button) {
        return;
      }
      applyStoredBlockState(section, button, collapsedBlocks);
      button.addEventListener("click", () => {
        const collapsed = section.classList.toggle("is-collapsed");
        button.setAttribute("aria-expanded", String(!collapsed));
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
          "Profil stanice nejde pou\u017E\xEDt. Dopl\u0148te n\xE1stupi\u0161t\u011B, koleje a aspo\u0148 jeden typ vlaku.",
          true
        );
        return;
      }
      departures = departures.map(normalizeDeparture).filter((departure) => departure.departureTime);
      fillCatalogSelects();
      persistState();
      publishStationProfile();
      syncAllTargetBoards().forEach((command) => {
        transport.publish("board:command", command);
      });
      publishDepartureSnapshot();
      renderDeparturesTable();
      setBoardFormStatus(
        `Profil stanice \u201E${profile.name}\u201C je ulo\u017Een\xFD a odeslan\xFD tabul\xEDm.`
      );
    }
  });
  setupManageBlockToggles();
  mountManageLayout(documentRef);
  window.addEventListener("pagehide", () => {
    releaseScraperWatch();
  });
  window.addEventListener("beforeunload", (event) => {
    event.preventDefault();
    event.returnValue = "Manage str\xE1nka mus\xED z\u016Fstat otev\u0159en\xE1. Obnoven\xED nebo zav\u0159en\xED p\u0159esko\u010D\xED animaci odjezdov\xE9 tabule a tabule p\u0159estanou dost\xE1vat data.";
  });
  if (!settingsUpdatedAt) {
    settingsUpdatedAt = Date.now();
    persistState();
  }
  publishStationProfile();
  renderLiveControls();
  publishDiscovery();
  publishDepartureSnapshot();
  heartbeatTimer = window.setInterval(publishDiscovery, 3e4);
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
  void loadScraperSchema().then(() => {
    if (liveDeparturesEnabled) {
      startLivePolling();
    }
  });
})();
