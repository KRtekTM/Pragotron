import {
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
    DEPARTURE_PLATFORM_VALUES,
    DEPARTURE_SECTOR_VALUES,
    DEPARTURE_TRACK_VALUES,
    DELAY_OFFSET_DEFAULT,
    FLAP_TIMING_DEFAULTS,
    TRAIN_NUMBER_FLAP_CARDS,
    TRAIN_TYPES,
    compareDeparturesByTime,
    formatStationName,
    resolveCanonicalTrainType,
    getTrainNumberCardStyle,
    normalizeDelayOffset,
    normalizeDepartureBoardRowCount,
    normalizeFlapTiming,
    parseDelayMinutes
} from './data.js';
import { SplitFlapAudio } from './audio.js';
import { nextFlapDeadline, scheduleFlapStepAt } from './flap-clock.js';
import {
    DelayFlapDisplay,
    DepartureTimeDisplay,
    SplitFlapDisplay,
    TrainFlapDisplay,
    clearFlapAnimation,
    restartFlapAnimation
} from './displays.js';
import {
    LensDisplay,
    LENS_DEFAULTS,
    createDefaultLensState,
    createEmptyLensState
} from './lenses.js';

const SHIFT_PAUSE_MS = 1000;
const ROW_SETTLE_CHECK_MS = 40;

const createDepartureRowElement = (index) => {
    const row = document.createElement('tr');
    row.dataset.departureRow = String(index + 1);
    row.innerHTML = [
        '<td><div class="lens-display departure-row-lenses" data-departure-slot="lenses" aria-label="Čočky"></div></td>',
        '<td><div class="train-flap-display" data-departure-slot="train" aria-label="Typ vlaku"></div></td>',
        '<td><div class="train-number-display" data-departure-slot="trainNumber" aria-label="Číslo vlaku"></div></td>',
        '<td><div class="flap-display" data-departure-slot="stationOne"></div></td>',
        '<td><div class="flap-display" data-departure-slot="stationTwo"></div></td>',
        '<td><div class="departure-time-display" data-departure-slot="departureTime" data-hours="0" data-minutes="0">',
        '<div class="time-flap time-hour-flap"></div>',
        '<span class="time-separator" aria-hidden="true">.</span>',
        '<div class="time-minute-group">',
        '<div class="time-flap time-minute-flap"></div>',
        '<div class="time-flap time-minute-flap"></div>',
        '</div></div></td>',
        '<td><div class="delay-flap-display" data-departure-slot="delay"></div></td>',
        '<td><div class="flap-display" data-departure-slot="platform"></div></td>',
        '<td><div data-departure-slot="track"></div></td>',
        '<td><div data-departure-slot="sector"></div></td>'
    ].join('');
    return row;
};

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


const createCatalogCards = (values) => values.map((value) => ({
    key: value || 'blank',
    value,
    background: 'var(--flap-background)',
    foreground: 'var(--flap-foreground)'
}));

const TRACK_CARDS = createCatalogCards(DEPARTURE_TRACK_VALUES);
const PLATFORM_CARDS = createCatalogCards(DEPARTURE_PLATFORM_VALUES);
const SECTOR_CARDS = createCatalogCards(DEPARTURE_SECTOR_VALUES);

const findCard = (cards, key) =>
    cards.find((card) => card.key === key) || cards[0];

const cloneLensState = (value) => {
    const fallback = createDefaultLensState();
    const source = value && typeof value === 'object' ? value : fallback;

    return {
        lenses: Array.isArray(source.lenses)
            ? source.lenses.map((lens, index) => ({
                ...fallback.lenses[index],
                ...lens,
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

const toIdentificationLensState = (value) => {
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

const findCatalogValue = (values, value) => {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return '';
    }

    return values.find((candidate) => candidate === raw)
        || values.find((candidate) =>
            candidate.toLocaleLowerCase('cs-CZ')
            === raw.toLocaleLowerCase('cs-CZ')
        )
        || '';
};

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

const normalizeDeparture = (value) => {
    const source = value?.state && typeof value.state === 'object'
        ? {
            ...value,
            ...value.state,
            target: value.target || value.state.target
        }
        : value || {};
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
            target.platform || '',
            track,
            sector
        ])),
        stations: [
            formatStationName(
                source.stations?.[0]
                    || source.stationOne
                    || ''
            ),
            formatStationName(
                source.stations?.[1]
                    || source.stationTwo
                    || ''
            )
        ],
        train: (() => {
            const resolved = resolveCanonicalTrainType(
                source.train,
                source.operator
            );
            return TRAIN_TYPES.some((type) => type.name === resolved)
                ? resolved
                : '';
        })(),
        trainNumber: /^\d{1,4}$/.test(String(source.trainNumber || ''))
            ? String(source.trainNumber)
            : '',
        delay: parsedDelay === null ? '' : parsedDelay,
        departureTime,
        target: {
            platform: String(target.platform || '').trim(),
            track,
            sector
        },
        lenses: cloneLensState(source.lenses),
        preDepartureActive: value?.preDepartureActive !== false
    };
};

const sortDepartures = (
    departures,
    now = new Date(),
    applyOffset = DELAY_OFFSET_DEFAULT
) => departures
    .map(normalizeDeparture)
    .sort((first, second) =>
        compareDeparturesByTime(first, second, now, applyOffset)
    );

const rowSnapshot = (departure) => departure
    ? {
        id: departure.id,
        stations: [...departure.stations],
        train: departure.train,
        trainNumber: departure.trainNumber,
        delay: departure.delay,
        departureTime: departure.departureTime
            ? { ...departure.departureTime }
            : null,
        target: { ...departure.target },
        lenses: cloneLensState(departure.lenses),
        preDepartureActive: departure.preDepartureActive !== false
    }
    : null;

const sameRow = (first, second) =>
    JSON.stringify(rowSnapshot(first)) === JSON.stringify(rowSnapshot(second));

const sameRowExceptPreDeparture = (first, second) => {
    if (!first || !second) {
        return false;
    }

    const firstSnapshot = rowSnapshot(first);
    const secondSnapshot = rowSnapshot(second);
    firstSnapshot.preDepartureActive = true;
    secondSnapshot.preDepartureActive = true;
    return JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot)
        && first.preDepartureActive !== second.preDepartureActive;
};

const withManagedLensColors = (state, template) => {
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

const setComponentValue = (component, value, immediate) => {
    if (immediate && typeof component.setImmediate === 'function') {
        component.setImmediate(value ?? '');
        return;
    }

    if ((value === '' || value === null || value === undefined)
        && typeof component.clear === 'function') {
        component.clear();
        return;
    }

    component.set(value ?? '');
};

export class CatalogFlapDisplay {
    constructor(
        element,
        cards,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            ownsAudio = audio instanceof SplitFlapAudio
        } = {}
    ) {
        if (!element || !Array.isArray(cards) || cards.length === 0) {
            throw new TypeError('CatalogFlapDisplay vyžaduje element a katalog.');
        }

        this.element = element;
        this.cards = cards;
        this.audio = audio;
        this.ownsAudio = ownsAudio;
        this.timing = normalizeFlapTiming(timing);
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.timer = null;
        this.sequence = 0;
        this.reducedMotion = prefersReducedMotion();
        this.element.classList.add('catalog-flap');
        this.render(this.cards[0], this.cards[0]);
    }

    setTiming(timing) {
        this.timing = normalizeFlapTiming(timing);
        return { ...this.timing };
    }

    indexFor(value) {
        const key = value && typeof value === 'object'
            ? value.key
            : String(value ?? '') || 'blank';
        const index = this.cards.findIndex((card) => card.key === key);

        if (index === -1) {
            throw new RangeError(`Hodnota "${value}" není v katalogu klapky.`);
        }

        return index;
    }

    ensureFaces() {
        if (this.faces) {
            return;
        }

        this.element.replaceChildren();
        this.faces = [
            'catalog-flap-half--top-current',
            'catalog-flap-half--top-next',
            'catalog-flap-half--bottom-current',
            'catalog-flap-half--bottom-next'
        ].map((className) => {
            const half = document.createElement('span');
            half.className = `catalog-flap-half ${className}`;
            const content = document.createElement('span');
            content.className = 'catalog-flap-content';
            half.appendChild(content);
            this.element.appendChild(half);
            return { half, content };
        });
    }

    paintFace(face, card) {
        face.half.style.setProperty(
            '--catalog-flap-background',
            card.background || 'var(--flap-background)'
        );
        face.half.style.setProperty(
            '--catalog-flap-foreground',
            card.foreground || 'var(--flap-foreground)'
        );
        face.content.textContent = card.value === '' ? '\u00a0' : card.value;
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

        clearTimer(this, 'timer');
        clearFlapAnimation(this.element);
        this.advance(sequence);
        return this.cards[this.targetIndex].value;
    }

    setImmediate(value) {
        const targetIndex = this.indexFor(value);
        this.sequence += 1;
        clearTimer(this, 'timer');
        this.currentIndex = targetIndex;
        this.targetIndex = targetIndex;
        clearFlapAnimation(this.element);
        this.render(this.cards[targetIndex], this.cards[targetIndex]);
    }

    clear() {
        return this.set('');
    }

    clearImmediate() {
        this.setImmediate('');
    }

    advance(sequence, tickNow = performance.now()) {
        if (sequence !== this.sequence
            || this.currentIndex === this.targetIndex) {
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
            scheduleFrame(() => this.advance(sequence));
            return;
        }

        const flipDuration = this.timing.duration
            + Math.floor(Math.random() * (this.timing.variation * 2 + 1))
            - this.timing.variation;
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
        clearTimer(this, 'timer');
        this.faces = null;
        this.element.replaceChildren();

        if (this.ownsAudio) {
            this.audio.destroy();
        }
    }
}

export class TrainNumberDisplay {
    constructor(
        element,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS
        } = {}
    ) {
        this.element = element;
        this.audio = audio;
        this.slots = [];
        this.timing = normalizeFlapTiming(timing);
        this.element.classList.add('train-number-display');
        this.element.replaceChildren();

        for (let index = 0; index < 4; index += 1) {
            const slotElement = document.createElement('span');
            slotElement.className = 'train-number-slot';
            this.element.appendChild(slotElement);
            this.slots.push(new CatalogFlapDisplay(
                slotElement,
                TRAIN_NUMBER_FLAP_CARDS,
                {
                    audio,
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
        const number = String(value.number ?? value.trainNumber ?? '')
            .replace(/\D/g, '')
            .slice(-4)
            .padStart(4, ' ');
        const style = getTrainNumberCardStyle(value.train);

        return Array.from(number, (digit) => digit === ' '
            ? findCard(TRAIN_NUMBER_FLAP_CARDS, 'blank')
            : findCard(
                TRAIN_NUMBER_FLAP_CARDS,
                `${style}-${digit}`
            ));
    }

    set(value) {
        this.targetCards(value).forEach((card, index) =>
            this.slots[index].set(card)
        );
        return String(value?.number ?? value?.trainNumber ?? '');
    }

    setImmediate(value) {
        this.targetCards(value).forEach((card, index) =>
            this.slots[index].setImmediate(card)
        );
    }

    clear() {
        this.set({ number: '', train: '' });
    }

    clearImmediate() {
        this.setImmediate({ number: '', train: '' });
    }

    getValue() {
        return this.slots.map((slot) => slot.getValue()).join('');
    }

    isSettled() {
        return this.slots.every((slot) => slot.isSettled());
    }

    destroy() {
        this.slots.forEach((slot) => slot.destroy());
        this.slots = [];
        this.element.replaceChildren();
    }
}

export class DepartureBoardRow {
    constructor(
        element,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            rowIndex = 0,
            applyDelayOffset = DELAY_OFFSET_DEFAULT,
            lensColorTemplate = null,
            synchronizeRows = true
        } = {}
    ) {
        this.element = element;
        this.timing = normalizeFlapTiming(timing);
        this.rowIndex = Math.max(0, Math.floor(Number(rowIndex) || 0));
        this.lensColorTemplate = lensColorTemplate;
        this.synchronizeRows = synchronizeRows !== false;
        this.stationOne = new SplitFlapDisplay(
            element.querySelector('[data-departure-slot="stationOne"]'),
            { audio, maxLength: 14, timing: this.timing }
        );
        this.train = new TrainFlapDisplay(
            element.querySelector('[data-departure-slot="train"]'),
            undefined,
            { audio, timing: this.timing }
        );
        this.trainNumber = new TrainNumberDisplay(
            element.querySelector('[data-departure-slot="trainNumber"]'),
            { audio, timing: this.timing }
        );
        this.stationTwo = new SplitFlapDisplay(
            element.querySelector('[data-departure-slot="stationTwo"]'),
            { audio, maxLength: 14, timing: this.timing }
        );
        this.departureTime = new DepartureTimeDisplay(
            element.querySelector('[data-departure-slot="departureTime"]'),
            { audio, timing: this.timing }
        );
        this.delay = new DelayFlapDisplay(
            element.querySelector('[data-departure-slot="delay"]'),
            undefined,
            {
                audio,
                timing: this.timing,
                applyDelayOffset
            }
        );
        this.platform = new CatalogFlapDisplay(
            element.querySelector('[data-departure-slot="platform"]'),
            PLATFORM_CARDS,
            { audio, timing: this.timing, ownsAudio: false }
        );
        this.track = new CatalogFlapDisplay(
            element.querySelector('[data-departure-slot="track"]'),
            TRACK_CARDS,
            { audio, timing: this.timing, ownsAudio: false }
        );
        this.sector = new CatalogFlapDisplay(
            element.querySelector('[data-departure-slot="sector"]'),
            SECTOR_CARDS,
            { audio, timing: this.timing, ownsAudio: false }
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
        this.lenses.set(this.withBoardLensOptions(
            withManagedLensColors(current, this.lensColorTemplate)
        ));
    }

    setSynchronizeRows(enabled) {
        this.synchronizeRows = enabled !== false;
        const current = this.lenses.getValue();
        this.lenses.set(this.withBoardLensOptions(current));
        return this.synchronizeRows;
    }

    withBoardLensOptions(state) {
        if (!state) {
            return state;
        }

        return {
            ...state,
            synchronizeRows: this.synchronizeRows !== false
        };
    }

    paintLenses(state, { preDepartureActive = true } = {}) {
        this.lenses.set(this.withBoardLensOptions(
            withManagedLensColors(state, this.lensColorTemplate)
        ));
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
        identificationActive = false
    } = {}) {
        const departure = value ? normalizeDeparture(value) : null;
        setComponentValue(
            this.stationOne,
            departure?.stations[0] || '',
            immediate
        );
        setComponentValue(
            this.train,
            departure?.train || '',
            immediate
        );
        const numberValue = {
            number: departure?.trainNumber || '',
            train: departure?.train || ''
        };
        if (immediate) {
            this.trainNumber.setImmediate(numberValue);
        } else {
            this.trainNumber.set(numberValue);
        }
        setComponentValue(
            this.stationTwo,
            departure?.stations[1] || '',
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
            departure?.delay ?? '',
            immediate
        );
        setComponentValue(
            this.platform,
            departure?.target.platform || '',
            immediate
        );
        if (immediate) {
            this.track.setImmediate(departure?.target.track || '');
            this.sector.setImmediate(departure?.target.sector || '');
        } else {
            this.track.set(departure?.target.track || '');
            this.sector.set(departure?.target.sector || '');
        }

        if (identificationActive) {
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
        return this.components.every((component) =>
            typeof component.isSettled !== 'function'
            || component.isSettled()
        );
    }

    destroy() {
        this.components.forEach((component) => component.destroy?.());
        this.components = [];
    }
}

export class DepartureBoardDisplay {
    constructor(
        root,
        {
            audio = new SplitFlapAudio(),
            timing = FLAP_TIMING_DEFAULTS,
            rowSelector = '[data-departure-row]',
            rowCount = DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
            applyDelayOffset = DELAY_OFFSET_DEFAULT,
            lensSettings = null,
            synchronizeRows = true
        } = {}
    ) {
        if (!root) {
            throw new TypeError('DepartureBoardDisplay vyžaduje root element.');
        }

        this.root = root;
        this.audio = audio;
        this.timing = normalizeFlapTiming(timing);
        this.applyDelayOffset = normalizeDelayOffset(applyDelayOffset);
        this.lensSettings = lensSettings?.lenses ? lensSettings : null;
        this.synchronizeRows = synchronizeRows !== false;
        this.rowSelector = rowSelector;
        this.rows = [...root.querySelectorAll(rowSelector)].map(
            (element, index) => new DepartureBoardRow(element, {
                audio,
                timing: this.timing,
                rowIndex: index,
                applyDelayOffset: this.applyDelayOffset,
                lensColorTemplate: this.lensSettings,
                synchronizeRows: this.synchronizeRows
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
        this.root.setAttribute('aria-busy', 'false');
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

    setSynchronizeRows(enabled) {
        this.synchronizeRows = enabled !== false;
        this.rows.forEach((row) => row.setSynchronizeRows(this.synchronizeRows));
        if (this.identificationActive) {
            this.applyIdentificationLenses();
        }
        return this.synchronizeRows;
    }

    getRowContainer() {
        return this.root.tBodies?.[0]
            || this.root.querySelector('tbody')
            || this.root;
    }

    interruptQueue() {
        this.queueGeneration += 1;
        clearTimer(this, 'waitTimer');
        if (this.waitResolve) {
            const resolve = this.waitResolve;
            this.waitResolve = null;
            resolve();
        }
        this.processing = false;
        this.root.setAttribute('aria-busy', 'false');
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
                lensColorTemplate: this.lensSettings,
                synchronizeRows: this.synchronizeRows
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

    update(departures, { immediate = false } = {}) {
        const nextRows = sortDepartures(
            Array.isArray(departures) ? departures : [],
            new Date(),
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

        const removedDisplayedRow = this.displayedRows.some((departure) =>
            departure && !nextIds.has(departure.id)
        );
        const displayedRowAssignmentsChanged = this.displayedRows.some(
            (departure, index) =>
                departure && departure.id !== nextRows[index]?.id
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
        this.root.setAttribute('aria-busy', 'true');

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

                // A newer snapshot may have arrived while this row was
                // animating. Do not mark the old target as displayed, or a
                // later shift can briefly retarget individual components
                // (especially the train-number flaps) to stale data.
                if (!sameRow(target, this.targetRows[index])) {
                    continue;
                }

                this.displayedRows[index] = rowSnapshot(target);
            }
        } finally {
            if (generation === this.queueGeneration) {
                this.processing = false;
                this.root.setAttribute('aria-busy', 'false');
            }
        }
    }

    isSettled() {
        return !this.processing && this.findNextChange() === -1;
    }

    getValue() {
        return this.displayedRows.map((departure) =>
            departure ? rowSnapshot(departure) : null
        );
    }

    destroy() {
        this.destroyed = true;
        clearTimer(this, 'waitTimer');
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
        this.root.setAttribute('aria-busy', 'false');
    }
}

