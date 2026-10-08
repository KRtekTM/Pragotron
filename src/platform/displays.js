import {
    DELAY_VALUES,
    DELAY_OFFSET_DEFAULT,
    FLAP_TIMING_DEFAULTS,
    getDisplayedDelay,
    getFlapDuration,
    normalizeDelayOffset,
    normalizeFlapTiming,
    parseDelayMinutes,
    STATION_CHARACTER_COUNT,
    STATION_FLAP_SEQUENCE,
    TRAIN_TYPES,
    findTrainType,
    formatStationName
} from './data.js';
import { SplitFlapAudio } from './audio.js';
import { nextFlapDeadline, scheduleFlapStep, scheduleFlapStepAt } from './flap-clock.js';

const scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(callback);
    }

    return window.setTimeout(callback, 0);
};

const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clearTimer = (owner, property) => {
    const timer = owner[property];
    if (timer == null) {
        return;
    }

    if (typeof timer.cancel === 'function') {
        timer.cancel();
    } else {
        window.clearTimeout(timer);
    }
    owner[property] = null;
};

const FLIP_CLASS = 'is-flipping';
const FLIP_CLASS_ALT = 'is-flipping-b';

const TOP_FLIP_FRAMES = [
    { transform: 'rotateX(0deg)' },
    { transform: 'rotateX(-90deg)' }
];
const BOTTOM_FLIP_FRAMES = [
    { transform: 'rotateX(90deg)' },
    { transform: 'rotateX(0deg)' }
];

const flapHalf = (element, marker) => {
    const halves = element.children;
    for (let index = 0; index < halves.length; index += 1) {
        if (halves[index].className.includes(marker)) {
            return halves[index];
        }
    }
    return null;
};

export const restartFlapAnimation = (element, duration) => {
    clearFlapAnimation(element);
    const top = flapHalf(element, 'top-current');
    const bottom = flapHalf(element, 'bottom-next');
    const half = Math.max(1, duration / 2);
    if (!top || !bottom || typeof top.animate !== 'function') {
        element._flapAlt = !element._flapAlt;
        element.style.setProperty('--flap-half-duration', `${half}ms`);
        element.classList.add(element._flapAlt ? FLIP_CLASS_ALT : FLIP_CLASS);
        return;
    }

    element._flapAnims = [
        top.animate(TOP_FLIP_FRAMES, {
            duration: half,
            easing: 'ease-in',
            fill: 'forwards'
        }),
        bottom.animate(BOTTOM_FLIP_FRAMES, {
            duration: half,
            delay: half,
            easing: 'ease-out',
            fill: 'forwards'
        })
    ];
};

export const clearFlapAnimation = (element) => {
    element.classList.remove(FLIP_CLASS, FLIP_CLASS_ALT);
    element.style.removeProperty('--flap-half-duration');
    if (element._flapAnims) {
        element._flapAnims.forEach((animation) => animation.cancel());
        element._flapAnims = null;
    }
};

export class SplitFlapDisplay {
    constructor(element, {
        audio = new SplitFlapAudio(),
        maxLength = STATION_CHARACTER_COUNT,
        sequence = STATION_FLAP_SEQUENCE,
        timing = FLAP_TIMING_DEFAULTS
    } = {}) {
        this.element = element;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.maxLength = maxLength;
        this.sequence = sequence;
        this.timing = normalizeFlapTiming(timing);
        this.characters = [];
        this.defaultValue = element.dataset.text || '';
        this.value = '';
        this.reducedMotion = prefersReducedMotion();
        this.initialize('');
    }

    setTiming(timing) {
        this.timing = normalizeFlapTiming(timing);
        return { ...this.timing };
    }

    normalize(value) {
        return String(value ?? '').toLocaleUpperCase('cs-CZ');
    }

    charactersFor(value) {
        return Array.from(formatStationName(value, {
            maxLength: this.maxLength,
            sequence: this.sequence
        }))
            .concat(Array(this.maxLength).fill(' '))
            .slice(0, this.maxLength);
    }

    glyphFor(character) {
        return character === ' ' ? '\u00a0' : character;
    }

    createHalf(className, character) {
        const half = document.createElement('span');
        const timeHalfClass = className.replace('flap-half', 'time-flap-half');
        half.className = `flap-half ${className} time-flap-half ${timeHalfClass}`;

        const glyph = document.createElement('span');
        glyph.className = 'flap-glyph time-flap-content';

        const glyphText = document.createElement('span');
        glyphText.className = 'flap-glyph-text time-flap-value';
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
        const character = document.createElement('span');
        character.className = 'flap-character';
        character.setAttribute('aria-hidden', 'true');
        const texts = [
            'flap-half--top-current',
            'flap-half--top-next',
            'flap-half--bottom-current',
            'flap-half--bottom-next'
        ].map((className) => {
            const half = this.createHalf(className, ' ');
            character.appendChild(half);
            return half.querySelector('.flap-glyph-text');
        });
        character._flapTexts = texts;
        this.renderCharacter(character, current, next);
        return character;
    }

    initialize(value) {
        const target = this.charactersFor(value);
        this.value = target.join('').trim();
        this.characters = [];
        this.element.replaceChildren();

        target.forEach((character) => {
            const element = this.createCharacter(' ', ' ');
            const state = {
                element,
                value: ' ',
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
        this.element.setAttribute('aria-label', this.value.trim());
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

        clearTimer(state, 'timer');
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
                this.audio.play(undefined, flipDuration);
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
        this.value = target.join('').trim();
        this.updateLabel();

        const tickNow = performance.now();
        this.characters.forEach((state, index) => {
            this.flip(state, target[index], 0, tickNow);
        });

        return this.value;
    }

    setImmediate(value) {
        const target = this.charactersFor(value);
        this.value = target.join('').trim();
        this.updateLabel();

        this.characters.forEach((state, index) => {
            state.sequence += 1;
            clearTimer(state, 'timer');
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
        return this.characters.every((state, index) =>
            state.value === target[index] && state.timer === null
        );
    }

    destroy() {
        this.characters.forEach((state) => {
            state.sequence += 1;
            clearTimer(state, 'timer');
        });
        this.characters = [];
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class DelayFlapDisplay {
    constructor(
        element,
        values = DELAY_VALUES,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            applyDelayOffset = DELAY_OFFSET_DEFAULT
        } = {}
    ) {
        this.element = element;
        this.values = values;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.timing = normalizeFlapTiming(timing);
        this.applyDelayOffset = normalizeDelayOffset(applyDelayOffset);
        this.sourceValue = '';
        this.defaultValue = element.dataset.delay || '';
        this.currentValue = '';
        this.targetValue = '';
        this.timer = null;
        this.sequence = 0;
        this.reducedMotion = prefersReducedMotion();
        this.render('', '');
        this.updateLabel();
    }

    setTiming(timing) {
        this.timing = normalizeFlapTiming(timing);
        return { ...this.timing };
    }

    parse(value) {
        if (value === '' || value === null || value === undefined) {
            return '';
        }

        const numericValue = parseDelayMinutes(value);

        if (numericValue === null) {
            throw new RangeError(
                `Neplatné zpoždění "${value}". Zadejte nezáporné minuty.`
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
            'delay-flap-half--top-current',
            'delay-flap-half--top-next',
            'delay-flap-half--bottom-current',
            'delay-flap-half--bottom-next'
        ].map((className) => {
            const half = document.createElement('span');
            half.className = `delay-flap-half ${className}`;
            const content = document.createElement('span');
            content.className = 'delay-flap-content';
            const number = document.createElement('span');
            number.className = 'delay-flap-number';
            const unit = document.createElement('span');
            unit.className = 'delay-flap-unit';
            unit.textContent = 'min';
            content.append(number, unit);
            half.appendChild(content);
            this.element.appendChild(half);
            return { number, unit };
        });
    }

    paintFace(face, value) {
        const blank = value === '';
        face.number.classList.toggle('is-blank', blank);
        face.unit.classList.toggle('is-blank', blank);
        face.number.textContent = blank ? '' : String(value);
        face.unit.textContent = blank ? '' : 'min';
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
            'aria-label',
            this.targetValue === ''
                ? 'Bez meškania'
                : `Meškanie ${this.targetValue} minút`
        );
    }

    set(value) {
        this.sourceValue = value;
        const next = this.parse(value);
        const sequence = ++this.sequence;
        this.targetValue = next;

        clearTimer(this, 'timer');
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
        clearTimer(this, 'timer');
        this.targetValue = next;
        this.currentValue = next;
        clearFlapAnimation(this.element);
        this.render(next, next);
        this.updateLabel();
    }

    clear() {
        return this.set('');
    }

    advanceToBlank(sequence) {
        this.advance(sequence);
    }

    advance(sequence, tickNow = performance.now()) {
        if (sequence !== this.sequence || this.currentValue === this.targetValue) {
            return;
        }

        // A physical delay flap has one cyclic catalog. It may only advance
        // to the next card; it must never take a shorter reverse route.
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
        const startedAt = typeof tickNow === 'number' ? tickNow : performance.now();
        restartFlapAnimation(this.element, flipDuration);
        if (!this.audio.muted) {
            this.audio.play('pitched', flipDuration);
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
        clearTimer(this, 'timer');
        this.faces = null;
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class TrainFlapDisplay {
    constructor(
        element,
        types = TRAIN_TYPES,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS
        } = {}
    ) {
        this.element = element;
        this.types = types;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.timing = normalizeFlapTiming(timing);
        this.defaultValue = element.dataset.type || element.dataset.src || '';
        this.defaultSource = element.dataset.src || this.defaultValue;
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.source = '';
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
        if (value === '' || value === null || value === undefined) {
            return 0;
        }

        const match = findTrainType(value, this.types);
        const index = match ? this.types.indexOf(match) : -1;

        if (index === -1) {
            throw new RangeError(
                `Nepodporovaný typ vlaku "${value}". Povolené typy: ${
                    this.types.map((type) => type.name || '(prázdné)').join(', ')
                }`
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
            'train-flap-half--top-current',
            'train-flap-half--top-next',
            'train-flap-half--bottom-current',
            'train-flap-half--bottom-next'
        ].map((className) => {
            const half = document.createElement('span');
            half.className = `train-flap-half ${className}`;
            half.setAttribute('aria-hidden', 'true');
            this.element.appendChild(half);
            return {
                half,
                kind: 'empty',
                image: null,
                textWrap: null,
                main: null,
                suffix: null
            };
        });
    }

    paintFace(face, type) {
        face.half.style.setProperty('--train-flap-background', type.background);
        face.half.style.setProperty('--train-flap-foreground', type.foreground);

        if (type.source) {
            if (face.kind !== 'image') {
                face.kind = 'image';
                const content = document.createElement('span');
                content.className = 'train-flap-content train-flap-content--image';
                face.half.replaceChildren(content);
                face.content = content;
                face.source = '';
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
            if (face.kind !== 'empty') {
                face.kind = 'empty';
                face.half.replaceChildren();
                face.image = null;
                face.textWrap = null;
                face.main = null;
                face.suffix = null;
            }
            return;
        }

        if (face.kind !== 'text') {
            face.kind = 'text';
            const content = document.createElement('span');
            content.className = 'train-flap-content';
            const textWrap = document.createElement('span');
            textWrap.className = 'train-flap-text';
            const main = document.createElement('span');
            main.className = 'train-flap-main';
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
                face.suffix = document.createElement('span');
                face.suffix.className = 'train-flap-suffix';
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
            'aria-label',
            currentType.name || 'Bez typu vlaku'
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
            this.source = nextType.source || '';
            this.updateLabel();
            scheduleFrame(() => this.advance(sequence));
            return;
        }

        const flipDuration = getFlapDuration(this.timing);
        restartFlapAnimation(this.element, flipDuration);
        if (!this.audio.muted) {
            this.audio.play('pitched', flipDuration);
        }

        this.timer = scheduleFlapStepAt(
            nextFlapDeadline(tickNow, flipDuration),
            (nextTick) => {
                if (sequence !== this.sequence) {
                    return;
                }

                this.currentIndex = nextIndex;
                this.source = nextType.source || '';
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

        clearTimer(this, 'timer');
        clearFlapAnimation(this.element);
        this.render(this.types[this.currentIndex], this.types[this.currentIndex]);
        this.advance(sequence);
        return this.types[targetIndex].name;
    }

    setImmediate(value) {
        const targetIndex = this.indexFor(value);
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.currentIndex = targetIndex;
        this.targetIndex = targetIndex;
        this.source = this.types[targetIndex].source || '';
        clearFlapAnimation(this.element);
        this.render(this.types[targetIndex], this.types[targetIndex]);
        this.updateLabel();
    }

    clear() {
        this.set('');
    }

    getValue() {
        return this.types[this.currentIndex].name;
    }

    isSettled() {
        return this.currentIndex === this.targetIndex && this.timer === null;
    }

    destroy() {
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.faces = null;
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class SequentialNumericFlap {
    constructor(
        element,
        minimum,
        maximum,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            includeBlank = true
        } = {}
    ) {
        this.element = element;
        this.minimum = minimum;
        this.maximum = maximum;
        this.includeBlank = includeBlank !== false;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.timing = normalizeFlapTiming(timing);
        this.currentValue = '';
        this.targetValue = '';
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
        if (!Number.isInteger(numericValue)
            || numericValue < this.minimum
            || numericValue > this.maximum) {
            throw new RangeError(
                `Hodnota ${value} není v rozsahu ${this.minimum}-${this.maximum}.`
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
            'time-flap-half--top-current',
            'time-flap-half--top-next',
            'time-flap-half--bottom-current',
            'time-flap-half--bottom-next'
        ].map((className) => {
            const half = document.createElement('span');
            half.className = `time-flap-half ${className}`;
            const content = document.createElement('span');
            content.className = 'time-flap-content';
            const number = document.createElement('span');
            number.className = 'time-flap-value';
            content.appendChild(number);
            half.appendChild(content);
            this.element.appendChild(half);
            return number;
        });
    }

    render(current, next) {
        this.ensureFaces();
        const currentText = current === '' ? '' : String(current);
        const nextText = next === '' ? '' : String(next);
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

        clearTimer(this, 'timer');
        clearFlapAnimation(this.element);
        this.advance(sequence);
        return nextTarget;
    }

    setImmediate(value) {
        const nextTarget = this.parse(value);
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.targetValue = nextTarget;
        this.currentValue = nextTarget;
        clearFlapAnimation(this.element);
        this.render(nextTarget, nextTarget);
    }

    clear() {
        this.targetValue = '';
        this.sequence += 1;
        const sequence = this.sequence;
        clearTimer(this, 'timer');
        clearFlapAnimation(this.element);
        this.advance(sequence);
    }

    clearImmediate() {
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.currentValue = '';
        this.targetValue = '';
        clearFlapAnimation(this.element);
        this.render('', '');
    }

    advance(sequence, tickNow = performance.now()) {
        if (sequence !== this.sequence || this.currentValue === this.targetValue) {
            return;
        }

        // Numeric flaps use a forward-only cycle. The blank card sits between
        // the maximum and the minimum, except where a clock has no blank.
        let next;
        if (this.currentValue === '') {
            next = this.minimum;
        } else if (this.currentValue === this.maximum) {
            next = this.includeBlank ? '' : this.minimum;
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
            this.audio.play(undefined, flipDuration);
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
        clearTimer(this, 'timer');
        this.faces = null;
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class DepartureTimeDisplay {
    constructor(
        element,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            label = 'Odjezd',
            includeBlank = true
        } = {}
    ) {
        this.element = element;
        this.label = label || 'Odjezd';
        this.defaultHours = Number(element.dataset.hours);
        this.defaultMinutes = Number(element.dataset.minutes);
        const flapOptions = { audio, timing, includeBlank };
        this.hour = new SequentialNumericFlap(
            element.querySelector('.time-hour-flap'),
            0,
            23,
            flapOptions
        );
        this.minuteTens = new SequentialNumericFlap(
            element.querySelectorAll('.time-minute-flap')[0],
            0,
            5,
            flapOptions
        );
        this.minuteOnes = new SequentialNumericFlap(
            element.querySelectorAll('.time-minute-flap')[1],
            0,
            9,
            flapOptions
        );
        const secondFlaps = element.querySelectorAll('.time-second-flap');
        this.secondTens = secondFlaps.length >= 2
            ? new SequentialNumericFlap(secondFlaps[0], 0, 5, flapOptions)
            : null;
        this.secondOnes = secondFlaps.length >= 2
            ? new SequentialNumericFlap(secondFlaps[1], 0, 9, flapOptions)
            : null;
        this.element.setAttribute('aria-label', this.label);
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
        if (minutes === undefined && typeof hours === 'string') {
            const match = hours.trim().match(/^(\d{1,2})[.:](\d{2})$/);
            if (!match) {
                throw new TypeError('Čas odjezdu musí mít formát HH.MM.');
            }

            hours = Number(match[1]);
            minutes = Number(match[2]);
        }

        hours = Number(hours);
        minutes = Number(minutes);

        if (!Number.isInteger(hours) || hours < 0 || hours > 23
            || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
            throw new RangeError('Čas odjezdu musí být mezi 00.00 a 23.59.');
        }

        if (!this.secondTens || seconds === undefined) {
            return { hours, minutes, seconds: null };
        }

        seconds = Number(seconds);
        if (!Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
            throw new RangeError('Vteřiny musí být mezi 0 a 59.');
        }

        return { hours, minutes, seconds };
    }

    updateLabel(hours, minutes, seconds) {
        const clock = `${hours}.${String(minutes).padStart(2, '0')}`;
        this.element.setAttribute(
            'aria-label',
            seconds === null || seconds === undefined
                ? `${this.label} ${clock}`
                : `${this.label} ${clock}.${String(seconds).padStart(2, '0')}`
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
        this.element.setAttribute('aria-label', this.label);
    }

    clearImmediate() {
        this.hour.clearImmediate();
        this.minuteTens.clearImmediate();
        this.minuteOnes.clearImmediate();
        this.secondTens?.clearImmediate();
        this.secondOnes?.clearImmediate();
        this.element.setAttribute('aria-label', this.label);
    }

    getValue() {
        const values = [
            this.hour.getValue(),
            this.minuteTens.getValue(),
            this.minuteOnes.getValue()
        ];
        const secondValues = this.secondTens
            ? [this.secondTens.getValue(), this.secondOnes.getValue()]
            : [];

        if (values.concat(secondValues).every((value) => value === '')) {
            return null;
        }

        const time = {
            hours: values[0] === '' ? 0 : values[0],
            minutes: (values[1] === '' ? 0 : values[1]) * 10
                + (values[2] === '' ? 0 : values[2])
        };
        if (this.secondTens) {
            time.seconds = (secondValues[0] === '' ? 0 : secondValues[0]) * 10
                + (secondValues[1] === '' ? 0 : secondValues[1]);
        }
        return time;
    }

    isSettled() {
        return this.hour.isSettled()
            && this.minuteTens.isSettled()
            && this.minuteOnes.isSettled()
            && (this.secondTens?.isSettled() ?? true)
            && (this.secondOnes?.isSettled() ?? true);
    }

    destroy() {
        this.hour.destroy();
        this.minuteTens.destroy();
        this.minuteOnes.destroy();
        this.secondTens?.destroy();
        this.secondOnes?.destroy();
        this.element.replaceChildren();
    }
}
