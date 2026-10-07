(() => {
  // src/platform/data.js
  var STATION_FLAP_SEQUENCE = Object.freeze([
    " ",
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
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ".",
    ",",
    ":",
    ";",
    "-",
    "/",
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
    "'"
  ]);
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
  var parseDelayMinutes = (value) => {
    if (value === "" || value === null || value === void 0) {
      return "";
    }
    const text = String(value).trim();
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*min\.?$/i);
    const numericValue = Number(match ? match[1].replace(",", ".") : value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : null;
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
      source: "images/InterCity_Austria.svg",
      background: "#fff",
      foreground: "#D80300"
    },
    {
      name: "Eurocity",
      source: "images/EuroCity_Logo.svg",
      background: "#fff",
      foreground: "#000"
    }
  ]);
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
  var DEFAULT_SOUND_URL = typeof document === "undefined" ? "split-flap.wav" : new URL("split-flap.wav", document.baseURI).href;

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
    enabled: false,
    blinking: true,
    blinkInterval: 0.2,
    blinkDelay: 0
  });
  var LENS_BLINK_INTERVAL_MIN = 0.1;
  var LENS_BLINK_INTERVAL_MAX = 1.5;
  var LENS_PREDEPARTURE_SECONDS_MIN = 0;
  var LENS_PREDEPARTURE_SECONDS_MAX = 300;
  var LENS_PREDEPARTURE_SECONDS_STEP = 10;
  var LENS_PREDEPARTURE_DEFAULTS = Object.freeze({
    enabled: false,
    seconds: 60
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
    const blinkInterval = resolveBlinkInterval(
      sharedOverrides,
      LENS_DEFAULTS.blinkInterval
    );
    return {
      lenses: Array.from({ length: numericCount }, (_, index) => ({
        ...LENS_DEFAULTS,
        ...normalizedOverrides,
        blinkInterval,
        blinkDelay: index * blinkInterval
      })),
      preDeparture
    };
  };
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
    const blinkInterval = lenses[0]?.blinkInterval || LENS_DEFAULTS.blinkInterval;
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
      ...defaults
    } = {}) {
      if (!element) {
        throw new TypeError("LensDisplay vy\u017Eaduje DOM element.");
      }
      this.element = element;
      this.count = Math.max(1, Math.floor(Number(count) || 2));
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
          preDeparture: normalizePreDeparture()
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
        preDeparture: normalizePreDeparture(source)
      };
    }
    renderLens(setting, index) {
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
      lens.style.setProperty("--lens-blink-delay", `${setting.blinkDelay}s`);
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
      this.element.replaceChildren(
        ...this.state.lenses.map((setting, index) => this.renderLens(setting, index))
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
      this.preDepartureActive = Boolean(isActive);
      this.render();
      return this.preDepartureActive;
    }
    clear() {
      return this.set("");
    }
    getValue() {
      return {
        lenses: this.state.lenses.map((setting) => ({ ...setting })),
        preDeparture: { ...this.state.preDeparture }
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
  var BOARD_TRANSPORT_CHANNEL = "pragotron.platformTable.channel.v1";
  var BOARD_TRANSPORT_STORAGE_KEY = "pragotron.platformTable.transport.v1";
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
      windowRef = globalThis.window
    } = {}) {
      this.id = createId("client");
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
      if (!message || message.version !== 1 || typeof message.messageId !== "string" || message.source === this.id || this.seenMessages.has(message.messageId)) {
        return;
      }
      this.remember(message.messageId);
      this.listeners.forEach((listener) => listener(message));
    }
    publish(type, payload = {}, requestId = createId("request")) {
      const message = {
        version: 1,
        messageId: createId("message"),
        requestId,
        source: this.id,
        type,
        payload,
        sentAt: Date.now()
      };
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

  // src/platform/sun-schedule.js
  var BRATISLAVA_SUN_LOCATION = Object.freeze({
    name: "Bratislava",
    latitude: 48.1486,
    longitude: 17.1077,
    timezoneId: "Europe/Bratislava"
  });
  var FALLBACK_REFRESH_MS = 15 * 60 * 1e3;

  // src/demos/platformTableManage.js
  var STORAGE_KEY = "pragotron.platformTable.state.v1";
  var documentRef = document;
  var storage = new LocalStorageAdapter(STORAGE_KEY);
  var savedState = storage.load();
  var transport = new BoardTransport();
  var boardForm = documentRef.querySelector("#boardForm");
  var stationInputs = [
    documentRef.querySelector("#stationOne"),
    documentRef.querySelector("#stationTwo")
  ];
  var trainTypeInput = documentRef.querySelector("#trainType");
  var departureTimeInput = documentRef.querySelector("#departureTime");
  var delayValueInput = documentRef.querySelector("#delayValue");
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
  var submitButton = boardForm.querySelector('button[type="submit"]');
  var lighting = new LightingSettings({
    initialLamps: savedState?.lamps || {},
    initialClock: savedState?.clockLight || NIGHT_CLOCK_DEFAULTS
  });
  var lensDisplay = new LensDisplay(documentRef.createElement("div"), {
    count: 2,
    defaultState: savedState?.lenses || createDefaultLensState()
  });
  var nightMode = savedState?.nightMode === true;
  var autoNightMode = savedState?.autoNightMode === true;
  var exampleActive = false;
  var boardActionInProgress = false;
  var pendingActions = /* @__PURE__ */ new Map();
  var exampleState = {
    stations: ["PRAHA", "BRATISLAVA"],
    train: "Eurocity",
    delay: "12",
    departureTime: {
      hours: 16,
      minutes: 20
    }
  };
  var DEPARTURE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  var setBoardFormStatus = (message, isError = false) => {
    boardFormStatus.textContent = message;
    boardFormStatus.classList.toggle("is-error", isError);
  };
  var setFormValues = (state) => {
    stationInputs.forEach((input, index) => {
      input.value = state.stations[index] || "";
    });
    trainTypeInput.value = state.train;
    departureTimeInput.value = `${String(state.departureTime.hours).padStart(2, "0")}:${String(state.departureTime.minutes).padStart(2, "0")}`;
    delayValueInput.value = state.delay === "" ? "" : String(state.delay);
  };
  var setSavedFormValues = (formState) => {
    const stationOne = typeof formState.stationOne === "string" ? formState.stationOne.slice(0, 14) : exampleState.stations[0];
    const stationTwo = typeof formState.stationTwo === "string" ? formState.stationTwo.slice(0, 14) : exampleState.stations[1];
    const train = TRAIN_TYPES.some((type) => type.name === formState.train) ? formState.train : exampleState.train;
    const departureTime = typeof formState.departureTime === "string" && DEPARTURE_TIME_PATTERN.test(formState.departureTime) ? formState.departureTime : `${String(exampleState.departureTime.hours).padStart(2, "0")}:${String(exampleState.departureTime.minutes).padStart(2, "0")}`;
    const parsedDelay = parseDelayMinutes(formState.delay);
    const delay = parsedDelay === null ? exampleState.delay : parsedDelay === "" ? "" : String(parsedDelay);
    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    trainTypeInput.value = train;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
  };
  var getLightingSettingsState = () => ({
    lamps: lighting.getLampSettings(),
    clockLight: lighting.getClockSettings(),
    nightMode,
    autoNightMode
  });
  var getSettingsState = () => ({
    ...getLightingSettingsState(),
    lenses: lensDisplay.getValue()
  });
  var persistState = () => {
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
  var publishSettings = ({ persist = true } = {}) => {
    if (persist) {
      persistState();
    }
    transport.publish("board:settings", getLightingSettingsState());
  };
  TRAIN_TYPES.forEach((type) => {
    const option = documentRef.createElement("option");
    option.value = type.name;
    option.textContent = type.name || "Bez typu vlaku";
    trainTypeInput.appendChild(option);
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
    variationLabel.append(variation, documentRef.createTextNode(" Kol\xEDs\xE1"));
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
    fadeLabel.appendChild(documentRef.createTextNode("Pohas\xEDn\xE1n\xED"));
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
    controls.blinking.checked = settings.some((setting) => setting.blinking);
    controls.firstColor.value = settings[0].color;
    controls.secondColor.value = (settings[1] || settings[0]).color;
    controls.blinkInterval.value = String(settings[0].blinkInterval);
    controls.blinkIntervalOutput.textContent = `${settings[0].blinkInterval.toFixed(1)} s`;
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
      blinking: controls.blinking.checked,
      color: index === 0 ? controls.firstColor.value : controls.secondColor.value,
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
    enabledLabel.append(enabled, documentRef.createTextNode(" Sv\xEDt\xED"));
    const blinkingLabel = documentRef.createElement("label");
    blinkingLabel.className = "lamp-control-check";
    const blinking = documentRef.createElement("input");
    blinking.type = "checkbox";
    blinkingLabel.append(blinking, documentRef.createTextNode(" Blik\xE1"));
    const preDepartureEnabledLabel = documentRef.createElement("label");
    preDepartureEnabledLabel.className = "lamp-control-check";
    const preDepartureEnabled = documentRef.createElement("input");
    preDepartureEnabled.type = "checkbox";
    preDepartureEnabledLabel.append(
      preDepartureEnabled,
      documentRef.createTextNode(" Rozblikat p\u0159ed odjezdem")
    );
    toggles.append(
      enabledLabel,
      blinkingLabel,
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
  var setAutomaticNightMode = (isEnabled, { persist = true, publish = true } = {}) => {
    autoNightMode = Boolean(isEnabled);
    renderNightMode();
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
      autoNightMode ? "Automatick\xFD re\u017Eim podle slunce zapnut." : "Automatick\xFD re\u017Eim podle slunce vypnut."
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
    resetAllSettingsButton
  ];
  var setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.toggle("is-updating", isBusy);
    boardForm.setAttribute("aria-busy", String(isBusy));
    boardActionButtons.forEach((button) => {
      button.disabled = isBusy;
      button.setAttribute("aria-disabled", String(isBusy));
    });
  };
  var finishBoardAction = (requestId, message) => {
    const pending = pendingActions.get(requestId);
    if (!pending) {
      return;
    }
    window.clearTimeout(pending.timeout);
    pendingActions.delete(requestId);
    setBoardActionBusy(false);
    if (message.payload?.ok === false) {
      setBoardFormStatus(
        message.payload.error || "Tabuli se nepoda\u0159ilo aktualizovat.",
        true
      );
      return;
    }
    setBoardFormStatus(pending.completedMessage);
  };
  transport.subscribe((message) => {
    if (message.type === "board:ready") {
      if (typeof message.payload?.nightMode === "boolean") {
        nightMode = message.payload.nightMode;
      }
      if (typeof message.payload?.autoNightMode === "boolean") {
        autoNightMode = message.payload.autoNightMode;
      }
      renderNightMode();
      transport.publish("board:settings", getLightingSettingsState());
      return;
    }
    if (message.type === "board:mode") {
      if (typeof message.payload?.nightMode === "boolean") {
        nightMode = message.payload.nightMode;
      }
      if (typeof message.payload?.autoNightMode === "boolean") {
        autoNightMode = message.payload.autoNightMode;
      }
      renderNightMode();
      persistState();
      return;
    }
    if (message.type === "command:ack") {
      finishBoardAction(message.payload?.requestId, message);
    }
  });
  var sendBoardAction = (action, state, completedMessage, { immediate = false, persist = true } = {}) => {
    if (boardActionInProgress) {
      return;
    }
    setBoardActionBusy(true);
    if (persist) {
      persistState();
    }
    const requestId = transport.publish("board:command", {
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
        "Tabule nen\xED p\u0159ipojena nebo nepotvrdila dokon\u010Den\xED akce.",
        true
      );
    }, 1e4);
    pendingActions.set(requestId, { completedMessage, timeout });
    setBoardFormStatus("Tabule se p\u0159enastavuje\u2026");
  };
  var getFormState = () => {
    const [hours, minutes] = departureTimeInput.value.split(":").map(Number);
    const parsedDelay = parseDelayMinutes(delayValueInput.value);
    return {
      stations: stationInputs.map((input) => input.value),
      train: trainTypeInput.value,
      delay: parsedDelay === "" ? "" : parsedDelay,
      departureTime: { hours, minutes },
      lenses: lensDisplay.getValue()
    };
  };
  var getEmptyState = () => ({
    ...createEmptyBoardState(),
    lenses: createDefaultLensState()
  });
  setFormValues(exampleState);
  if (savedState?.form && typeof savedState.form === "object") {
    setSavedFormValues(savedState.form);
  }
  syncClockLightControls();
  renderNightMode();
  startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
  startButton.setAttribute("aria-pressed", "false");
  startButton.addEventListener("click", () => {
    const showExample = !exampleActive;
    const state = showExample ? { ...exampleState, lenses: createDefaultLensState() } : getEmptyState();
    exampleActive = showExample;
    if (showExample) {
      setFormValues(exampleState);
    }
    startButton.textContent = showExample ? "Resetovat tabuli" : "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", String(showExample));
    sendBoardAction(
      showExample ? "apply-board" : "reset-board",
      state,
      showExample ? "P\u0159\xEDklad na\u010Dten." : "Tabule resetov\xE1na."
    );
  });
  resetAllSettingsButton.addEventListener("click", () => {
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
    NIGHT_LIGHT_DEFAULTS.forEach(
      (setting) => syncLampControls(lighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    setFormValues(exampleState);
    exampleActive = false;
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    sendBoardAction(
      "reset-all",
      {
        ...createEmptyBoardState(),
        lenses: createDefaultLensState()
      },
      "V\u0161echna nastaven\xED byla obnovena na v\xFDchoz\xED hodnoty.",
      { immediate: true, persist: false }
    );
  });
  boardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (boardActionInProgress) {
      return;
    }
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
    exampleActive = true;
    startButton.textContent = "Resetovat tabuli";
    startButton.setAttribute("aria-pressed", "true");
    sendBoardAction(
      "apply-board",
      getFormState(),
      "\xDAdaje byly odesl\xE1ny na tabuli."
    );
  });
  [...stationInputs, trainTypeInput, departureTimeInput, delayValueInput].forEach((input) => {
    input.addEventListener("input", persistState);
    input.addEventListener("change", persistState);
  });
  transport.publish("manage:hello", { page: "platformTableManage" });
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
})();
