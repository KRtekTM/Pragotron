(() => {
  // src/platform/data.js
  var STATION_CHARACTER_COUNT = 14;
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
  var STATION_FLIP_DURATION = 190;
  var FLAP_TIMING_VARIATION_MS = 10;
  var getFlapDuration = () => STATION_FLIP_DURATION + Math.floor(Math.random() * (FLAP_TIMING_VARIATION_MS * 2 + 1)) - FLAP_TIMING_VARIATION_MS;
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
  var NIGHT_LIGHT_DEFAULTS = Object.freeze([
    {
      id: "top-left",
      label: "Horn\xED lev\xE1",
      enabled: true,
      variation: true,
      intensity: 100,
      speed: 45,
      fade: "soft"
    },
    {
      id: "top-center",
      label: "Horn\xED st\u0159ed",
      enabled: true,
      variation: true,
      intensity: 85,
      speed: 60,
      fade: "slow"
    },
    {
      id: "top-right",
      label: "Horn\xED prav\xE1",
      enabled: true,
      variation: true,
      intensity: 55,
      speed: 45,
      fade: "flicker"
    },
    {
      id: "bottom-left",
      label: "Doln\xED lev\xE1",
      enabled: false,
      variation: false,
      intensity: 0,
      speed: 60,
      fade: "soft"
    },
    {
      id: "bottom-right",
      label: "Doln\xED prav\xE1",
      enabled: true,
      variation: true,
      intensity: 75,
      speed: 55,
      fade: "slow"
    }
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
  var cloneBoardState = (state) => {
    const source = state && typeof state === "object" ? state : {};
    return {
      ...source,
      stations: Array.isArray(source.stations) ? [source.stations[0] || "", source.stations[1] || ""] : ["", ""],
      train: source.train || "",
      delay: source.delay ?? "",
      departureTime: source.departureTime && typeof source.departureTime === "object" ? {
        hours: Number(source.departureTime.hours) || 0,
        minutes: Number(source.departureTime.minutes) || 0
      } : null
    };
  };

  // src/platform/audio.js
  var DEFAULT_SOUND_URL = typeof document === "undefined" ? "split-flap.wav" : new URL("split-flap.wav", document.baseURI).href;
  var SplitFlapAudio = class {
    constructor(source = DEFAULT_SOUND_URL) {
      this.template = typeof Audio === "function" ? new Audio(source) : null;
      if (this.template) {
        this.template.preload = "auto";
      }
    }
    play() {
      if (!this.template) {
        return;
      }
      const sound = this.template.cloneNode();
      sound.preload = "auto";
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) {
          return;
        }
        cleanedUp = true;
        sound.remove();
      };
      sound.addEventListener("ended", cleanup, { once: true });
      sound.addEventListener("error", cleanup, { once: true });
      try {
        const playback = sound.play();
        if (playback) {
          playback.catch(cleanup);
        }
      } catch {
        cleanup();
      }
    }
    destroy() {
      this.template?.pause();
      this.template = null;
    }
  };

  // src/platform/displays.js
  var scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 0);
  };
  var prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clearTimer = (owner, property) => {
    if (owner[property] !== null) {
      window.clearTimeout(owner[property]);
      owner[property] = null;
    }
  };
  var applyFlipTiming = (element, duration) => {
    element.style.setProperty("--flap-half-duration", `${duration / 2}ms`);
  };
  var clearFlipTiming = (element) => {
    element.style.removeProperty("--flap-half-duration");
  };
  var SplitFlapDisplay = class {
    constructor(element, {
      audio = new SplitFlapAudio(),
      maxLength = STATION_CHARACTER_COUNT,
      sequence = STATION_FLAP_SEQUENCE
    } = {}) {
      this.element = element;
      this.audio = audio;
      this.ownsAudio = audio instanceof SplitFlapAudio;
      this.maxLength = maxLength;
      this.sequence = sequence;
      this.characters = [];
      this.defaultValue = element.dataset.text || "";
      this.value = "";
      this.reducedMotion = prefersReducedMotion();
      this.initialize("");
    }
    normalize(value) {
      return String(value ?? "").toLocaleUpperCase("cs-CZ");
    }
    charactersFor(value) {
      return Array.from(this.normalize(value).slice(0, this.maxLength)).map((character) => this.sequence.includes(character) ? character : " ").concat(Array(this.maxLength).fill(" ")).slice(0, this.maxLength);
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
      element.replaceChildren(
        this.createHalf("flap-half--top-current", current),
        this.createHalf("flap-half--top-next", next),
        this.createHalf("flap-half--bottom-current", current),
        this.createHalf("flap-half--bottom-next", next)
      );
    }
    createCharacter(current, next) {
      const character = document.createElement("span");
      character.className = "flap-character";
      character.setAttribute("aria-hidden", "true");
      this.renderCharacter(character, current, next);
      return character;
    }
    initialize(value) {
      const target = this.charactersFor(value);
      this.value = target.join("").trim();
      this.characters = [];
      this.element.replaceChildren();
      target.forEach((character, index) => {
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
          scheduleFrame(() => this.flip(state, character, index * 55));
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
    flip(state, target, delay = 0) {
      state.sequence += 1;
      const sequence = state.sequence;
      clearTimer(state, "timer");
      state.element.classList.remove("is-flipping");
      clearFlipTiming(state.element);
      this.advance(state, target, sequence, delay);
    }
    advance(state, target, sequence, delay = 0) {
      if (sequence !== state.sequence || state.value === target) {
        return;
      }
      state.timer = window.setTimeout(() => {
        if (sequence !== state.sequence) {
          return;
        }
        const current = state.value;
        const next = this.nextCharacter(current, target);
        state.element.classList.remove("is-flipping");
        this.renderCharacter(state.element, current, next);
        if (this.reducedMotion) {
          this.renderCharacter(state.element, next, next);
          state.value = next;
          state.timer = null;
          this.advance(state, target, sequence);
          return;
        }
        const flipDuration = getFlapDuration();
        applyFlipTiming(state.element, flipDuration);
        this.audio.play();
        state.element.classList.add("is-flipping");
        state.timer = window.setTimeout(() => {
          if (sequence !== state.sequence) {
            return;
          }
          state.element.classList.remove("is-flipping");
          this.renderCharacter(state.element, next, next);
          state.value = next;
          state.timer = null;
          this.advance(state, target, sequence);
        }, flipDuration);
      }, delay);
    }
    set(value) {
      const target = this.charactersFor(value);
      this.value = target.join("").trim();
      this.updateLabel();
      this.characters.forEach((state, index) => {
        this.flip(state, target[index], index * 55);
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
        state.element.classList.remove("is-flipping");
        clearFlipTiming(state.element);
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
    constructor(element, values = DELAY_VALUES, { audio = new SplitFlapAudio() } = {}) {
      this.element = element;
      this.values = values;
      this.audio = audio;
      this.ownsAudio = audio instanceof SplitFlapAudio;
      this.defaultValue = element.dataset.delay || "";
      this.currentValue = "";
      this.targetValue = "";
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion();
      this.render("", "");
      this.updateLabel();
    }
    parse(value) {
      if (value === "" || value === null || value === void 0) {
        return "";
      }
      const match = String(value).trim().match(/^(\d+)\s*min\.?$/i) || String(value).trim().match(/^(\d+)$/);
      const numericValue = match ? Number(match[1]) : NaN;
      if (!this.values.includes(numericValue)) {
        throw new RangeError(
          `Nepodporovan\xE9 zpo\u017Ed\u011Bn\xED "${value}". Povolen\xE9 hodnoty: ${this.values.join(", ")}`
        );
      }
      return numericValue;
    }
    createHalf(className, value) {
      const half = document.createElement("span");
      half.className = `delay-flap-half ${className}`;
      const content = document.createElement("span");
      content.className = "delay-flap-content";
      if (value !== "") {
        const number = document.createElement("span");
        number.className = "delay-flap-number";
        number.textContent = value;
        const unit = document.createElement("span");
        unit.className = "delay-flap-unit";
        unit.textContent = "min";
        content.append(number, unit);
      }
      half.appendChild(content);
      return half;
    }
    render(current, next) {
      this.element.replaceChildren(
        this.createHalf("delay-flap-half--top-current", current),
        this.createHalf("delay-flap-half--top-next", next),
        this.createHalf("delay-flap-half--bottom-current", current),
        this.createHalf("delay-flap-half--bottom-next", next)
      );
    }
    updateLabel() {
      this.element.setAttribute(
        "aria-label",
        this.currentValue === "" ? "Bez me\u0161kania" : `Me\u0161kanie ${this.currentValue} min\xFAt`
      );
    }
    set(value) {
      const next = this.parse(value);
      const current = this.currentValue === void 0 ? "" : this.currentValue;
      const sequence = ++this.sequence;
      this.targetValue = next;
      clearTimer(this, "timer");
      this.element.classList.remove("is-flipping");
      this.render(current, next);
      this.currentValue = next;
      this.updateLabel();
      if (current === next || this.reducedMotion) {
        this.render(next, next);
        return this.currentValue;
      }
      const flipDuration = getFlapDuration();
      applyFlipTiming(this.element, flipDuration);
      this.audio.play();
      this.element.classList.add("is-flipping");
      this.timer = window.setTimeout(() => {
        if (sequence !== this.sequence) {
          return;
        }
        this.render(next, next);
        this.element.classList.remove("is-flipping");
        this.timer = null;
      }, flipDuration);
      return this.currentValue;
    }
    setImmediate(value) {
      const next = this.parse(value);
      this.sequence += 1;
      clearTimer(this, "timer");
      this.targetValue = next;
      this.currentValue = next;
      this.element.classList.remove("is-flipping");
      clearFlipTiming(this.element);
      this.render(next, next);
      this.updateLabel();
    }
    clear() {
      const sequence = ++this.sequence;
      this.targetValue = "";
      clearTimer(this, "timer");
      this.element.classList.remove("is-flipping");
      this.advanceToBlank(sequence);
    }
    advanceToBlank(sequence) {
      if (sequence !== this.sequence || this.currentValue === "") {
        return;
      }
      const currentIndex = this.values.indexOf(this.currentValue);
      const next = currentIndex >= 0 && currentIndex + 1 < this.values.length ? this.values[currentIndex + 1] : "";
      this.render(this.currentValue, next);
      this.currentValue = next;
      this.updateLabel();
      if (this.reducedMotion) {
        this.render(next, next);
        scheduleFrame(() => this.advanceToBlank(sequence));
        return;
      }
      const flipDuration = getFlapDuration();
      applyFlipTiming(this.element, flipDuration);
      this.audio.play();
      this.element.classList.add("is-flipping");
      this.timer = window.setTimeout(() => {
        if (sequence !== this.sequence) {
          return;
        }
        this.render(next, next);
        this.element.classList.remove("is-flipping");
        this.timer = null;
        this.advanceToBlank(sequence);
      }, flipDuration);
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
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var TrainFlapDisplay = class {
    constructor(element, types = TRAIN_TYPES, { audio = new SplitFlapAudio() } = {}) {
      this.element = element;
      this.types = types;
      this.audio = audio;
      this.ownsAudio = audio instanceof SplitFlapAudio;
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
    indexFor(value) {
      if (value === "" || value === null || value === void 0) {
        return 0;
      }
      const requested = String(value).trim();
      const normalized = requested.toLocaleLowerCase("cs-CZ");
      const index = this.types.findIndex(
        (type) => type.name.toLocaleLowerCase("cs-CZ") === normalized || type.source === requested
      );
      if (index === -1) {
        throw new RangeError(
          `Nepodporovan\xFD typ vlaku "${value}". Povolen\xE9 typy: ${this.types.map((type) => type.name || "(pr\xE1zdn\xE9)").join(", ")}`
        );
      }
      return index;
    }
    createHalf(className, type) {
      const half = document.createElement("span");
      half.className = `train-flap-half ${className}`;
      half.setAttribute("aria-hidden", "true");
      half.style.setProperty("--train-flap-background", type.background);
      half.style.setProperty("--train-flap-foreground", type.foreground);
      const content = document.createElement("span");
      content.className = "train-flap-content";
      if (type.source) {
        const image = document.createElement("img");
        image.src = type.source;
        image.alt = "";
        half.appendChild(image);
      } else if (type.text) {
        const text = document.createElement("span");
        text.className = "train-flap-text";
        const mainText = document.createElement("span");
        mainText.className = "train-flap-main";
        mainText.textContent = type.text;
        text.appendChild(mainText);
        if (type.suffix) {
          const suffix = document.createElement("span");
          suffix.className = "train-flap-suffix";
          suffix.textContent = type.suffix;
          text.appendChild(suffix);
        }
        content.appendChild(text);
        half.appendChild(content);
      }
      return half;
    }
    render(currentType, nextType) {
      this.element.replaceChildren(
        this.createHalf("train-flap-half--top-current", currentType),
        this.createHalf("train-flap-half--top-next", nextType),
        this.createHalf("train-flap-half--bottom-current", currentType),
        this.createHalf("train-flap-half--bottom-next", nextType)
      );
    }
    updateLabel() {
      const currentType = this.types[this.currentIndex];
      this.element.setAttribute(
        "aria-label",
        currentType.name || "Bez typu vlaku"
      );
    }
    advance(sequence) {
      if (sequence !== this.sequence || this.currentIndex === this.targetIndex) {
        return;
      }
      const nextIndex = (this.currentIndex + 1) % this.types.length;
      const currentType = this.types[this.currentIndex];
      const nextType = this.types[nextIndex];
      this.render(currentType, nextType);
      if (this.reducedMotion) {
        this.render(nextType, nextType);
        this.currentIndex = nextIndex;
        this.source = nextType.source || "";
        this.updateLabel();
        scheduleFrame(() => this.advance(sequence));
        return;
      }
      const flipDuration = getFlapDuration();
      applyFlipTiming(this.element, flipDuration);
      this.audio.play();
      this.element.classList.add("is-flipping");
      this.timer = window.setTimeout(() => {
        if (sequence !== this.sequence) {
          return;
        }
        this.render(nextType, nextType);
        this.element.classList.remove("is-flipping");
        this.currentIndex = nextIndex;
        this.source = nextType.source || "";
        this.timer = null;
        this.updateLabel();
        this.advance(sequence);
      }, flipDuration);
    }
    set(value) {
      const targetIndex = this.indexFor(value);
      this.targetIndex = targetIndex;
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      this.element.classList.remove("is-flipping");
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
      this.element.classList.remove("is-flipping");
      clearFlipTiming(this.element);
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
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var SequentialNumericFlap = class {
    constructor(element, minimum, maximum, { audio = new SplitFlapAudio() } = {}) {
      this.element = element;
      this.minimum = minimum;
      this.maximum = maximum;
      this.audio = audio;
      this.ownsAudio = audio instanceof SplitFlapAudio;
      this.currentValue = "";
      this.targetValue = "";
      this.timer = null;
      this.sequence = 0;
      this.reducedMotion = prefersReducedMotion();
      this.render(this.currentValue, this.currentValue);
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
    createHalf(className, value) {
      const half = document.createElement("span");
      half.className = `time-flap-half ${className}`;
      const content = document.createElement("span");
      content.className = "time-flap-content";
      const number = document.createElement("span");
      number.className = "time-flap-value";
      number.textContent = value === "" ? "" : String(value);
      content.appendChild(number);
      half.appendChild(content);
      return half;
    }
    render(current, next) {
      this.element.replaceChildren(
        this.createHalf("time-flap-half--top-current", current),
        this.createHalf("time-flap-half--top-next", next),
        this.createHalf("time-flap-half--bottom-current", current),
        this.createHalf("time-flap-half--bottom-next", next)
      );
    }
    set(value) {
      const nextTarget = this.parse(value);
      this.targetValue = nextTarget;
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      this.element.classList.remove("is-flipping");
      this.advance(sequence);
      return nextTarget;
    }
    setImmediate(value) {
      const nextTarget = this.parse(value);
      this.sequence += 1;
      clearTimer(this, "timer");
      this.targetValue = nextTarget;
      this.currentValue = nextTarget;
      this.element.classList.remove("is-flipping");
      clearFlipTiming(this.element);
      this.render(nextTarget, nextTarget);
    }
    clear() {
      this.targetValue = "";
      this.sequence += 1;
      const sequence = this.sequence;
      clearTimer(this, "timer");
      this.element.classList.remove("is-flipping");
      this.advance(sequence);
    }
    clearImmediate() {
      this.sequence += 1;
      clearTimer(this, "timer");
      this.currentValue = "";
      this.targetValue = "";
      this.element.classList.remove("is-flipping");
      clearFlipTiming(this.element);
      this.render("", "");
    }
    advance(sequence) {
      if (sequence !== this.sequence || this.currentValue === this.targetValue) {
        return;
      }
      let next;
      if (this.currentValue === "") {
        next = this.minimum;
      } else if (this.targetValue === "") {
        next = this.currentValue === this.maximum ? "" : this.currentValue + 1;
      } else {
        const direction = this.targetValue > this.currentValue ? 1 : -1;
        next = this.currentValue + direction;
      }
      const current = this.currentValue;
      this.render(current, next);
      if (this.reducedMotion) {
        this.render(next, next);
        this.currentValue = next;
        scheduleFrame(() => this.advance(sequence));
        return;
      }
      const flipDuration = getFlapDuration();
      applyFlipTiming(this.element, flipDuration);
      this.audio.play();
      this.element.classList.add("is-flipping");
      this.timer = window.setTimeout(() => {
        if (sequence !== this.sequence) {
          return;
        }
        this.render(next, next);
        this.element.classList.remove("is-flipping");
        this.currentValue = next;
        this.timer = null;
        this.advance(sequence);
      }, flipDuration);
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
      this.element.replaceChildren();
      if (this.ownsAudio) {
        this.audio.destroy();
      }
    }
  };
  var DepartureTimeDisplay = class {
    constructor(element, { audio = new SplitFlapAudio() } = {}) {
      this.element = element;
      this.defaultHours = Number(element.dataset.hours);
      this.defaultMinutes = Number(element.dataset.minutes);
      this.hour = new SequentialNumericFlap(
        element.querySelector(".time-hour-flap"),
        0,
        23,
        { audio }
      );
      this.minuteTens = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[0],
        0,
        5,
        { audio }
      );
      this.minuteOnes = new SequentialNumericFlap(
        element.querySelectorAll(".time-minute-flap")[1],
        0,
        9,
        { audio }
      );
      this.element.setAttribute("aria-label", "Odjezd");
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
        `Odjezd ${hours}.${String(minutes).padStart(2, "0")}`
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
      this.element.setAttribute("aria-label", "Odjezd");
    }
    clearImmediate() {
      this.hour.clearImmediate();
      this.minuteTens.clearImmediate();
      this.minuteOnes.clearImmediate();
      this.element.setAttribute("aria-label", "Odjezd");
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
    blinkInterval: 0.2,
    blinkDelay: 0
  });
  var LENS_BLINK_INTERVAL_MIN = 0.1;
  var LENS_BLINK_INTERVAL_MAX = 1.5;
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
  var createDefaultLensState = (count = 2, overrides = {}) => {
    const numericCount = Math.max(1, Math.floor(Number(count) || 2));
    const sharedOverrides = { ...overrides };
    const normalizedOverrides = {
      ...sharedOverrides,
      color: resolveColor(sharedOverrides, LENS_DEFAULTS.color)
    };
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
      }))
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
          )
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
        )
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
      lens.classList.toggle("is-on", setting.enabled);
      lens.classList.toggle("is-blinking", setting.enabled && setting.blinking);
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
    clear() {
      return this.set("");
    }
    getValue() {
      return {
        lenses: this.state.lenses.map((setting) => ({ ...setting }))
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
  var createDefaultRegistry = ({ audio = new SplitFlapAudio() } = {}) => {
    const registry = new ComponentRegistry();
    registry.register("split-flap", (element, options) => new SplitFlapDisplay(element, { ...options, audio })).register("delay-flap", (element, options) => new DelayFlapDisplay(element, DELAY_VALUES, { ...options, audio })).register("train-flap", (element, options) => new TrainFlapDisplay(element, TRAIN_TYPES, { ...options, audio })).register("departure-time", (element, options) => new DepartureTimeDisplay(element, { ...options, audio })).register("lens-display", (element, options) => new LensDisplay(element, options));
    return registry;
  };
  var BoardRuntime = class {
    constructor({
      root,
      slots,
      registry = createDefaultRegistry(),
      initialState = createEmptyBoardState()
    }) {
      if (!root) {
        throw new TypeError("BoardRuntime vy\u017Eaduje root element.");
      }
      this.root = root;
      this.slots = slots;
      this.registry = registry;
      this.initialState = cloneBoardState(initialState);
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
          definition.options || {}
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

  // src/platform/night-lighting.js
  var clamp2 = (value, minimum, maximum, fallback) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.min(maximum, Math.max(minimum, numericValue)) : fallback;
  };
  var randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  var validFade = (fade) => NIGHT_FADE_MODES.some((mode) => mode.value === fade) ? fade : "soft";
  var cloneLamp = (setting) => ({
    id: setting.id,
    label: setting.label,
    enabled: Boolean(setting.enabled),
    variation: Boolean(setting.variation),
    intensity: Math.round(clamp2(setting.intensity, 0, 100, 0)),
    speed: Math.round(clamp2(setting.speed, 1, 120, 60) * 2) / 2,
    fade: validFade(setting.fade)
  });
  var NightLighting = class {
    constructor({
      root,
      clockBlock = root?.querySelector("#clockBlock"),
      lampDefaults = NIGHT_LIGHT_DEFAULTS,
      initialLamps = {},
      initialClock = NIGHT_CLOCK_DEFAULTS
    } = {}) {
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
      this.settings = new Map(
        lampDefaults.map((defaultSetting) => {
          const savedSetting = initialLamps[defaultSetting.id] || {};
          return [
            defaultSetting.id,
            cloneLamp({ ...defaultSetting, ...savedSetting })
          ];
        })
      );
      this.clockSettings = {
        enabled: typeof initialClock.enabled === "boolean" ? initialClock.enabled : NIGHT_CLOCK_DEFAULTS.enabled,
        intensity: Math.round(
          clamp2(
            initialClock.intensity,
            0,
            100,
            NIGHT_CLOCK_DEFAULTS.intensity
          )
        )
      };
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
      const next = cloneLamp({ ...current, ...patch, id });
      this.settings.set(id, next);
      this.applyLampVisual(next);
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
      NIGHT_LIGHT_DEFAULTS.forEach((setting) => {
        this.settings.set(setting.id, cloneLamp(setting));
        this.applyLampVisual(this.settings.get(setting.id));
      });
      this.clockSettings = { ...NIGHT_CLOCK_DEFAULTS };
      this.applyClockVisual();
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
      this.applyClockVisual();
      return this.getClockSettings();
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
      const timer = this.flickerTimers.get(id);
      this.flickerTokens.set(id, (this.flickerTokens.get(id) || 0) + 1);
      if (timer !== void 0) {
        this.document.defaultView.clearTimeout(timer);
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
        (timer) => this.document.defaultView.clearTimeout(timer)
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

  // src/demos/platformTableDemo.js
  var STORAGE_KEY = "pragotron.platformTable.state.v1";
  var documentRef = document;
  var storage = new LocalStorageAdapter(STORAGE_KEY);
  var savedState = storage.load();
  var boardForm = documentRef.querySelector("#boardForm");
  var stationInputs = [
    documentRef.querySelector("#stationOne"),
    documentRef.querySelector("#stationTwo")
  ];
  var trainTypeInput = documentRef.querySelector("#trainType");
  var departureTimeInput = documentRef.querySelector("#departureTime");
  var delayValueInput = documentRef.querySelector("#delayValue");
  var boardFormStatus = documentRef.querySelector("#boardFormStatus");
  var screenElement = documentRef.querySelector("#skrin");
  var lensSettingsPanel = documentRef.querySelector("#lensSettingsPanel");
  var lensControls = documentRef.querySelector("#lensControls");
  var lampSettingsPanel = documentRef.querySelector("#lampSettingsPanel");
  var lampControls = documentRef.querySelector("#lampControls");
  var clockLightControl = documentRef.querySelector("#clockLightControl");
  var clockLightEnabledInput = documentRef.querySelector("#clockLightEnabled");
  var clockLightIntensityInput = documentRef.querySelector("#clockLightIntensity");
  var clockLightIntensityOutput = documentRef.querySelector("#clockLightIntensityOutput");
  var resetLampSettingsButton = documentRef.querySelector("#resetLampSettings");
  var nightModeButton = documentRef.querySelector("#nightModeButton");
  var startButton = documentRef.querySelector("#startButton");
  var resetAllSettingsButton = documentRef.querySelector("#resetAllSettings");
  var submitButton = boardForm.querySelector('button[type="submit"]');
  var defaultLensState = savedState?.lenses || createDefaultLensState();
  var emptyBoardState = {
    ...createEmptyBoardState(),
    lenses: defaultLensState
  };
  var board = createBoard({
    root: documentRef.querySelector(PLATFORM_TABLE_TEMPLATE.rootSelector),
    slots: PLATFORM_TABLE_TEMPLATE.slots,
    registry: createDefaultRegistry({ audio: new SplitFlapAudio() }),
    initialState: emptyBoardState
  });
  var lensDisplay = board.getComponent("lenses");
  var nightLighting = new NightLighting({
    root: screenElement,
    clockBlock: documentRef.querySelector("#clockBlock"),
    initialLamps: savedState?.lamps || {},
    initialClock: savedState?.clockLight || NIGHT_CLOCK_DEFAULTS
  }).mount();
  var analogClock = new AnalogClock(
    documentRef.querySelector("#pragotronAnalogClock")
  );
  try {
    analogClock.mount();
  } catch (error) {
    console.warn("Analogov\xE9 hodiny se nepoda\u0159ilo inicializovat.", error);
  }
  var stationDisplays = stationInputs.map(
    (_, index) => documentRef.querySelector(`[data-board-slot="station${index === 0 ? "One" : "Two"}"]`)
  );
  var exampleState = {
    stations: stationDisplays.map((display) => display.dataset.text || ""),
    train: documentRef.querySelector('[data-board-slot="train"]').dataset.type || "",
    delay: documentRef.querySelector('[data-board-slot="delay"]').dataset.delay || "",
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
  var cloneState = (state) => {
    const source = state && typeof state === "object" ? state : {};
    return {
      ...source,
      stations: Array.isArray(source.stations) ? [source.stations[0] || "", source.stations[1] || ""] : ["", ""],
      train: source.train || "",
      delay: source.delay ?? "",
      departureTime: source.departureTime && typeof source.departureTime === "object" ? {
        hours: Number(source.departureTime.hours) || 0,
        minutes: Number(source.departureTime.minutes) || 0
      } : null
    };
  };
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
  var setSavedFormValues = (formState2) => {
    const stationOne = typeof formState2.stationOne === "string" ? formState2.stationOne.slice(0, 14) : exampleState.stations[0];
    const stationTwo = typeof formState2.stationTwo === "string" ? formState2.stationTwo.slice(0, 14) : exampleState.stations[1];
    const train = TRAIN_TYPES.some((type) => type.name === formState2.train) ? formState2.train : exampleState.train;
    const departureTime = typeof formState2.departureTime === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(formState2.departureTime) ? formState2.departureTime : `${String(exampleState.departureTime.hours).padStart(2, "0")}:${String(exampleState.departureTime.minutes).padStart(2, "0")}`;
    const delay = formState2.delay === "" || DELAY_VALUES.some(
      (value) => String(value) === String(formState2.delay)
    ) ? String(formState2.delay) : String(exampleState.delay);
    stationInputs[0].value = stationOne;
    stationInputs[1].value = stationTwo;
    trainTypeInput.value = train;
    departureTimeInput.value = departureTime;
    delayValueInput.value = delay;
  };
  var persistState = () => {
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
    const option = documentRef.createElement("option");
    option.value = type.name;
    option.textContent = type.name || "Bez typu vlaku";
    trainTypeInput.appendChild(option);
  });
  DELAY_VALUES.forEach((value) => {
    const option = documentRef.createElement("option");
    option.value = value === "" ? "" : String(value);
    option.textContent = value === "" ? "Bez zpo\u017Ed\u011Bn\xED" : `${value} min`;
    delayValueInput.appendChild(option);
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
    const setting = nightLighting.updateLamp(id, readLampControls(id));
    syncLampControls(setting);
    persistState();
  };
  NIGHT_LIGHT_DEFAULTS.forEach((defaultSetting) => {
    const panel = documentRef.createElement("fieldset");
    panel.className = "lamp-control";
    const legend = documentRef.createElement("legend");
    legend.textContent = defaultSetting.label;
    panel.appendChild(legend);
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
    syncLampControls(nightLighting.getLampSettings()[defaultSetting.id]);
    [enabled, variation, intensity, speed, fade].forEach((input) => {
      input.addEventListener("input", () => updateLampFromControls(defaultSetting.id));
      input.addEventListener("change", () => updateLampFromControls(defaultSetting.id));
    });
  });
  var lensControlElements = /* @__PURE__ */ new Map();
  var syncLensControls = () => {
    const settings = lensDisplay.getValue().lenses;
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
  if (lensControls && lensDisplay) {
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
    toggles.append(enabledLabel, blinkingLabel);
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
    panel.append(
      toggles,
      firstColor.label,
      secondColor.label,
      blinkIntervalLabel
    );
    lensControls.replaceChildren(panel);
    lensControlElements.set("component", {
      enabled,
      blinking,
      firstColor: firstColor.select,
      secondColor: secondColor.select,
      blinkInterval,
      blinkIntervalOutput
    });
    [enabled, blinking, firstColor.select, secondColor.select, blinkInterval].forEach((input) => {
      input.addEventListener("input", updateLensFromControls);
      input.addEventListener("change", updateLensFromControls);
    });
    syncLensControls();
  }
  lampControls.appendChild(clockLightControl);
  var clockRedrawFrame = null;
  var requestClockRedraw = () => {
    if (clockRedrawFrame !== null) {
      return;
    }
    clockRedrawFrame = window.requestAnimationFrame(() => {
      clockRedrawFrame = null;
      analogClock.redraw();
    });
  };
  var syncClockLightControls = () => {
    const settings = nightLighting.getClockSettings();
    clockLightEnabledInput.checked = settings.enabled;
    clockLightIntensityInput.value = String(settings.intensity);
    clockLightIntensityOutput.textContent = `${settings.intensity}%`;
  };
  var updateClockLightFromControls = () => {
    nightLighting.setClockLight({
      enabled: clockLightEnabledInput.checked,
      intensity: Number(clockLightIntensityInput.value)
    });
    syncClockLightControls();
    requestClockRedraw();
  };
  clockLightEnabledInput.addEventListener("input", updateClockLightFromControls);
  clockLightIntensityInput.addEventListener("input", updateClockLightFromControls);
  [clockLightEnabledInput, clockLightIntensityInput].forEach((input) => {
    input.addEventListener("change", () => {
      updateClockLightFromControls();
      persistState();
    });
  });
  resetLampSettingsButton.addEventListener("click", () => {
    nightLighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach(
      (setting) => syncLampControls(nightLighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    requestClockRedraw();
    persistState();
    setBoardFormStatus("V\xFDchoz\xED nastaven\xED sv\u011Btel obnoveno.");
  });
  var setNightMode = (isNight, { persist = true } = {}) => {
    nightLighting.setNightMode(isNight);
    analogClock.transitionNightMode();
    lampSettingsPanel.hidden = !isNight;
    nightModeButton.textContent = isNight ? "\u2600\uFE0F Denn\xED re\u017Eim" : "\u{1F319} No\u010Dn\xED re\u017Eim";
    nightModeButton.setAttribute("aria-pressed", String(isNight));
    setBoardFormStatus(isNight ? "No\u010Dn\xED re\u017Eim zapnut." : "Denn\xED re\u017Eim zapnut.");
    if (persist) {
      persistState();
    }
  };
  nightModeButton.addEventListener(
    "click",
    () => setNightMode(!nightLighting.isNightMode())
  );
  var boardActionButtons = [submitButton, startButton, resetAllSettingsButton];
  var boardActionInProgress = false;
  var exampleActive = false;
  var setBoardActionBusy = (isBusy) => {
    boardActionInProgress = isBusy;
    boardForm.classList.toggle("is-updating", isBusy);
    boardForm.setAttribute("aria-busy", String(isBusy));
    boardActionButtons.forEach((button) => {
      button.disabled = isBusy;
      button.setAttribute("aria-disabled", String(isBusy));
    });
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
  var runBoardAction = (action, completedMessage) => {
    if (boardActionInProgress) {
      return;
    }
    setBoardActionBusy(true);
    try {
      action();
      persistState();
      setBoardFormStatus("Tabule se p\u0159enastavuje\u2026");
    } catch (error) {
      setBoardActionBusy(false);
      setBoardFormStatus(
        error instanceof Error ? error.message : "Tabuli se nepoda\u0159ilo p\u0159enastavit.",
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
  var applyBoardState = (showExample) => {
    board.setState(showExample ? exampleState : emptyBoardState);
    exampleActive = showExample;
    if (showExample) {
      setFormValues(exampleState);
    }
    startButton.textContent = showExample ? "Resetovat tabuli" : "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", String(showExample));
  };
  startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
  startButton.setAttribute("aria-pressed", "false");
  startButton.addEventListener("click", () => {
    if (boardActionInProgress) {
      return;
    }
    const showExample = !exampleActive;
    runBoardAction(
      () => applyBoardState(showExample),
      showExample ? "P\u0159\xEDklad na\u010Dten." : "Tabule resetov\xE1na."
    );
  });
  resetAllSettingsButton.addEventListener("click", () => {
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
    startButton.textContent = "Na\u010D\xEDst p\u0159\xEDklad";
    startButton.setAttribute("aria-pressed", "false");
    nightLighting.reset();
    NIGHT_LIGHT_DEFAULTS.forEach(
      (setting) => syncLampControls(nightLighting.getLampSettings()[setting.id])
    );
    syncClockLightControls();
    requestClockRedraw();
    syncLensControls();
    setNightMode(false, { persist: false });
    setBoardFormStatus("V\u0161echna nastaven\xED byla obnovena na v\xFDchoz\xED hodnoty.");
  });
  var formState = () => {
    const [hours, minutes] = departureTimeInput.value.split(":").map(Number);
    return {
      stations: stationInputs.map((input) => input.value),
      train: trainTypeInput.value,
      delay: delayValueInput.value,
      departureTime: { hours, minutes },
      lenses: board.getState().lenses || defaultLensState
    };
  };
  boardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (boardActionInProgress) {
      return;
    }
    if (!departureTimeInput.value) {
      setBoardFormStatus("Vypl\u0148te pros\xEDm \u010Das odjezdu.", true);
      departureTimeInput.focus();
      return;
    }
    runBoardAction(() => {
      board.setState(formState());
      exampleActive = true;
      startButton.textContent = "Resetovat tabuli";
      startButton.setAttribute("aria-pressed", "true");
    }, "\xDAdaje byly odesl\xE1ny na tabuli.");
  });
  [...stationInputs, trainTypeInput, departureTimeInput, delayValueInput].forEach((input) => {
    input.addEventListener("input", persistState);
    input.addEventListener("change", persistState);
  });
  if (savedState?.form && typeof savedState.form === "object") {
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
})();
