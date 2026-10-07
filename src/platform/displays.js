import {
    DELAY_VALUES,
    getDisplayedDelay,
    getFlapDuration,
    parseDelayMinutes,
    STATION_CHARACTER_COUNT,
    STATION_FLAP_SEQUENCE,
    TRAIN_TYPES
} from './data.js';
import { SplitFlapAudio } from './audio.js';

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
    if (owner[property] !== null) {
        window.clearTimeout(owner[property]);
        owner[property] = null;
    }
};

const applyFlipTiming = (element, duration) => {
    element.style.setProperty('--flap-half-duration', `${duration / 2}ms`);
};

const clearFlipTiming = (element) => {
    element.style.removeProperty('--flap-half-duration');
};

export class SplitFlapDisplay {
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
        this.defaultValue = element.dataset.text || '';
        this.value = '';
        this.reducedMotion = prefersReducedMotion();
        this.initialize('');
    }

    normalize(value) {
        return String(value ?? '').toLocaleUpperCase('cs-CZ');
    }

    charactersFor(value) {
        return Array.from(this.normalize(value).slice(0, this.maxLength))
            .map((character) => this.sequence.includes(character) ? character : ' ')
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
        element.replaceChildren(
            this.createHalf('flap-half--top-current', current),
            this.createHalf('flap-half--top-next', next),
            this.createHalf('flap-half--bottom-current', current),
            this.createHalf('flap-half--bottom-next', next)
        );
    }

    createCharacter(current, next) {
        const character = document.createElement('span');
        character.className = 'flap-character';
        character.setAttribute('aria-hidden', 'true');
        this.renderCharacter(character, current, next);
        return character;
    }

    initialize(value) {
        const target = this.charactersFor(value);
        this.value = target.join('').trim();
        this.characters = [];
        this.element.replaceChildren();

        target.forEach((character, index) => {
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
                scheduleFrame(() => this.flip(state, character, index * 55));
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

    flip(state, target, delay = 0) {
        state.sequence += 1;
        const sequence = state.sequence;

        clearTimer(state, 'timer');
        state.element.classList.remove('is-flipping');
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
            state.element.classList.remove('is-flipping');
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
            state.element.classList.add('is-flipping');

            state.timer = window.setTimeout(() => {
                if (sequence !== state.sequence) {
                    return;
                }

                state.element.classList.remove('is-flipping');
                this.renderCharacter(state.element, next, next);
                state.value = next;
                state.timer = null;
                this.advance(state, target, sequence);
            }, flipDuration);
        }, delay);
    }

    set(value) {
        const target = this.charactersFor(value);
        this.value = target.join('').trim();
        this.updateLabel();

        this.characters.forEach((state, index) => {
            this.flip(state, target[index], index * 55);
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
            state.element.classList.remove('is-flipping');
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
    constructor(element, values = DELAY_VALUES, { audio = new SplitFlapAudio() } = {}) {
        this.element = element;
        this.values = values;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.defaultValue = element.dataset.delay || '';
        this.currentValue = '';
        this.targetValue = '';
        this.timer = null;
        this.sequence = 0;
        this.reducedMotion = prefersReducedMotion();
        this.render('', '');
        this.updateLabel();
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

        return getDisplayedDelay(numericValue, this.values);
    }

    createHalf(className, value) {
        const half = document.createElement('span');
        half.className = `delay-flap-half ${className}`;

        const content = document.createElement('span');
        content.className = 'delay-flap-content';

        if (value !== '') {
            const number = document.createElement('span');
            number.className = 'delay-flap-number';
            number.textContent = value;

            const unit = document.createElement('span');
            unit.className = 'delay-flap-unit';
            unit.textContent = 'min';

            content.append(number, unit);
        }

        half.appendChild(content);
        return half;
    }

    render(current, next) {
        this.element.replaceChildren(
            this.createHalf('delay-flap-half--top-current', current),
            this.createHalf('delay-flap-half--top-next', next),
            this.createHalf('delay-flap-half--bottom-current', current),
            this.createHalf('delay-flap-half--bottom-next', next)
        );
    }

    updateLabel() {
        this.element.setAttribute(
            'aria-label',
            this.currentValue === ''
                ? 'Bez meškania'
                : `Meškanie ${this.currentValue} minút`
        );
    }

    set(value) {
        const next = this.parse(value);
        const current = this.currentValue === undefined ? '' : this.currentValue;
        const sequence = ++this.sequence;
        this.targetValue = next;

        clearTimer(this, 'timer');
        this.element.classList.remove('is-flipping');
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
        this.element.classList.add('is-flipping');

        this.timer = window.setTimeout(() => {
            if (sequence !== this.sequence) {
                return;
            }

            this.render(next, next);
            this.element.classList.remove('is-flipping');
            this.timer = null;
        }, flipDuration);

        return this.currentValue;
    }

    setImmediate(value) {
        const next = this.parse(value);
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.targetValue = next;
        this.currentValue = next;
        this.element.classList.remove('is-flipping');
        clearFlipTiming(this.element);
        this.render(next, next);
        this.updateLabel();
    }

    clear() {
        const sequence = ++this.sequence;
        this.targetValue = '';
        clearTimer(this, 'timer');
        this.element.classList.remove('is-flipping');
        this.advanceToBlank(sequence);
    }

    advanceToBlank(sequence) {
        if (sequence !== this.sequence || this.currentValue === '') {
            return;
        }

        const currentIndex = this.values.indexOf(this.currentValue);
        const next = currentIndex >= 0 && currentIndex + 1 < this.values.length
            ? this.values[currentIndex + 1]
            : '';

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
        this.element.classList.add('is-flipping');

        this.timer = window.setTimeout(() => {
            if (sequence !== this.sequence) {
                return;
            }

            this.render(next, next);
            this.element.classList.remove('is-flipping');
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
        clearTimer(this, 'timer');
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class TrainFlapDisplay {
    constructor(element, types = TRAIN_TYPES, { audio = new SplitFlapAudio() } = {}) {
        this.element = element;
        this.types = types;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
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

    indexFor(value) {
        if (value === '' || value === null || value === undefined) {
            return 0;
        }

        const requested = String(value).trim();
        const normalized = requested.toLocaleLowerCase('cs-CZ');
        const index = this.types.findIndex((type) =>
            type.name.toLocaleLowerCase('cs-CZ') === normalized
            || type.source === requested
        );

        if (index === -1) {
            throw new RangeError(
                `Nepodporovaný typ vlaku "${value}". Povolené typy: ${
                    this.types.map((type) => type.name || '(prázdné)').join(', ')
                }`
            );
        }

        return index;
    }

    createHalf(className, type) {
        const half = document.createElement('span');
        half.className = `train-flap-half ${className}`;
        half.setAttribute('aria-hidden', 'true');
        half.style.setProperty('--train-flap-background', type.background);
        half.style.setProperty('--train-flap-foreground', type.foreground);

        const content = document.createElement('span');
        content.className = 'train-flap-content';

        if (type.source) {
            const image = document.createElement('img');
            image.src = type.source;
            image.alt = '';
            half.appendChild(image);
        } else if (type.text) {
            const text = document.createElement('span');
            text.className = 'train-flap-text';

            const mainText = document.createElement('span');
            mainText.className = 'train-flap-main';
            mainText.textContent = type.text;
            text.appendChild(mainText);

            if (type.suffix) {
                const suffix = document.createElement('span');
                suffix.className = 'train-flap-suffix';
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
            this.createHalf('train-flap-half--top-current', currentType),
            this.createHalf('train-flap-half--top-next', nextType),
            this.createHalf('train-flap-half--bottom-current', currentType),
            this.createHalf('train-flap-half--bottom-next', nextType)
        );
    }

    updateLabel() {
        const currentType = this.types[this.currentIndex];
        this.element.setAttribute(
            'aria-label',
            currentType.name || 'Bez typu vlaku'
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
            this.source = nextType.source || '';
            this.updateLabel();
            scheduleFrame(() => this.advance(sequence));
            return;
        }

        const flipDuration = getFlapDuration();
        applyFlipTiming(this.element, flipDuration);
        this.audio.play();
        this.element.classList.add('is-flipping');

        this.timer = window.setTimeout(() => {
            if (sequence !== this.sequence) {
                return;
            }

            this.render(nextType, nextType);
            this.element.classList.remove('is-flipping');
            this.currentIndex = nextIndex;
            this.source = nextType.source || '';
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

        clearTimer(this, 'timer');
        this.element.classList.remove('is-flipping');
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
        this.element.classList.remove('is-flipping');
        clearFlipTiming(this.element);
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
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class SequentialNumericFlap {
    constructor(element, minimum, maximum, { audio = new SplitFlapAudio() } = {}) {
        this.element = element;
        this.minimum = minimum;
        this.maximum = maximum;
        this.audio = audio;
        this.ownsAudio = audio instanceof SplitFlapAudio;
        this.currentValue = '';
        this.targetValue = '';
        this.timer = null;
        this.sequence = 0;
        this.reducedMotion = prefersReducedMotion();
        this.render(this.currentValue, this.currentValue);
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

    createHalf(className, value) {
        const half = document.createElement('span');
        half.className = `time-flap-half ${className}`;

        const content = document.createElement('span');
        content.className = 'time-flap-content';

        const number = document.createElement('span');
        number.className = 'time-flap-value';
        number.textContent = value === '' ? '' : String(value);
        content.appendChild(number);
        half.appendChild(content);
        return half;
    }

    render(current, next) {
        this.element.replaceChildren(
            this.createHalf('time-flap-half--top-current', current),
            this.createHalf('time-flap-half--top-next', next),
            this.createHalf('time-flap-half--bottom-current', current),
            this.createHalf('time-flap-half--bottom-next', next)
        );
    }

    set(value) {
        const nextTarget = this.parse(value);
        this.targetValue = nextTarget;
        this.sequence += 1;
        const sequence = this.sequence;

        clearTimer(this, 'timer');
        this.element.classList.remove('is-flipping');
        this.advance(sequence);
        return nextTarget;
    }

    setImmediate(value) {
        const nextTarget = this.parse(value);
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.targetValue = nextTarget;
        this.currentValue = nextTarget;
        this.element.classList.remove('is-flipping');
        clearFlipTiming(this.element);
        this.render(nextTarget, nextTarget);
    }

    clear() {
        this.targetValue = '';
        this.sequence += 1;
        const sequence = this.sequence;
        clearTimer(this, 'timer');
        this.element.classList.remove('is-flipping');
        this.advance(sequence);
    }

    clearImmediate() {
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.currentValue = '';
        this.targetValue = '';
        this.element.classList.remove('is-flipping');
        clearFlipTiming(this.element);
        this.render('', '');
    }

    advance(sequence) {
        if (sequence !== this.sequence || this.currentValue === this.targetValue) {
            return;
        }

        let next;
        if (this.currentValue === '') {
            next = this.minimum;
        } else if (this.targetValue === '') {
            next = this.currentValue === this.maximum
                ? ''
                : this.currentValue + 1;
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
        this.element.classList.add('is-flipping');

        this.timer = window.setTimeout(() => {
            if (sequence !== this.sequence) {
                return;
            }

            this.render(next, next);
            this.element.classList.remove('is-flipping');
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
        clearTimer(this, 'timer');
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class DepartureTimeDisplay {
    constructor(element, { audio = new SplitFlapAudio() } = {}) {
        this.element = element;
        this.defaultHours = Number(element.dataset.hours);
        this.defaultMinutes = Number(element.dataset.minutes);
        this.hour = new SequentialNumericFlap(
            element.querySelector('.time-hour-flap'),
            0,
            23,
            { audio }
        );
        this.minuteTens = new SequentialNumericFlap(
            element.querySelectorAll('.time-minute-flap')[0],
            0,
            5,
            { audio }
        );
        this.minuteOnes = new SequentialNumericFlap(
            element.querySelectorAll('.time-minute-flap')[1],
            0,
            9,
            { audio }
        );
        this.element.setAttribute('aria-label', 'Odjezd');
    }

    parseTime(hours, minutes) {
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

        return { hours, minutes };
    }

    updateLabel(hours, minutes) {
        this.element.setAttribute(
            'aria-label',
            `Odjezd ${hours}.${String(minutes).padStart(2, '0')}`
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
        this.element.setAttribute('aria-label', 'Odjezd');
    }

    clearImmediate() {
        this.hour.clearImmediate();
        this.minuteTens.clearImmediate();
        this.minuteOnes.clearImmediate();
        this.element.setAttribute('aria-label', 'Odjezd');
    }

    getValue() {
        const values = [
            this.hour.getValue(),
            this.minuteTens.getValue(),
            this.minuteOnes.getValue()
        ];

        if (values.every((value) => value === '')) {
            return null;
        }

        return {
            hours: values[0] === '' ? 0 : values[0],
            minutes: (values[1] === '' ? 0 : values[1]) * 10
                + (values[2] === '' ? 0 : values[2])
        };
    }

    isSettled() {
        return this.hour.isSettled()
            && this.minuteTens.isSettled()
            && this.minuteOnes.isSettled();
    }

    destroy() {
        this.hour.destroy();
        this.minuteTens.destroy();
        this.minuteOnes.destroy();
        this.element.replaceChildren();
    }
}
