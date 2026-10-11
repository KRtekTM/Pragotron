export const LENS_COLORS = Object.freeze({
    green: Object.freeze({
        label: 'Zelená',
        glass: '#245c4a',
        light: '#35e995',
        core: '#5af3aa'
    }),
    yellow: Object.freeze({
        label: 'Žlutá',
        glass: '#6b4311',
        light: '#ff9d1c',
        core: '#ffc04a'
    }),
    red: Object.freeze({
        label: 'Červená',
        glass: '#702528',
        light: '#ff443c',
        core: '#ff694f'
    }),
    blue: Object.freeze({
        label: 'Modrá',
        glass: '#123f78',
        light: '#167ed9',
        core: '#4aa8f2'
    }),
    coolWhite: Object.freeze({
        label: 'Studená bílá',
        glass: '#74838b',
        light: '#effaff',
        core: '#d7f1f5'
    })
});

export const LENS_DEFAULTS = Object.freeze({
    color: 'green',
    enabled: true,
    blinking: true,
    blinkInterval: 0.4,
    blinkDelay: 0
});

export const LENS_BLINK_INTERVAL_MIN = 0.1;
export const LENS_BLINK_INTERVAL_MAX = 1.5;
export const LENS_PREDEPARTURE_SECONDS_MIN = 0;
export const LENS_PREDEPARTURE_SECONDS_MAX = 300;
export const LENS_PREDEPARTURE_SECONDS_STEP = 10;
export const LENS_PREDEPARTURE_DEFAULTS = Object.freeze({
    enabled: true,
    seconds: 90
});

const resolveBlinkInterval = (setting, fallback) => {
    const value = Number.isFinite(Number(setting?.blinkInterval))
        ? Number(setting.blinkInterval)
        : Number(setting?.blinkPeriod);

    return Number.isFinite(value)
        ? Math.min(
            LENS_BLINK_INTERVAL_MAX,
            Math.max(LENS_BLINK_INTERVAL_MIN, value)
        )
        : fallback;
};

export const parseLensColors = (value) => {
    const tokens = Array.isArray(value)
        ? value
        : String(value ?? '').split(/[,;/|]/);
    const colors = [];
    tokens.forEach((token) => {
        const name = String(token ?? '').trim();
        if (LENS_COLORS[name] && colors.length < 2) {
            colors.push(name);
        }
    });

    if (colors.length === 0) {
        return null;
    }

    return [colors[0], colors[1] || colors[0]];
};

const LENS_COLOR_STORAGE_KEY = 'pragotron.board.lensColors.v1';

export const readStoredLensColors = (storage = globalThis.sessionStorage) => {
    try {
        const raw = storage?.getItem(LENS_COLOR_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        return parseLensColors(JSON.parse(raw));
    } catch {
        return null;
    }
};

export const writeStoredLensColors = (
    colors,
    storage = globalThis.sessionStorage
) => {
    const parsed = parseLensColors(colors);
    if (!parsed) {
        return null;
    }

    try {
        storage?.setItem(LENS_COLOR_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
        // The board can still keep the colors for this page view.
    }

    return parsed;
};

export const readLensColorOverride = (location = globalThis.location) => {
    try {
        const params = new URLSearchParams(location?.search || '');
        if (!params.has('lenses')) {
            return null;
        }

        return parseLensColors(params.get('lenses'));
    } catch {
        return null;
    }
};

const clearStoredLensColors = (storage) => {
    try {
        storage?.removeItem(LENS_COLOR_STORAGE_KEY);
    } catch {
        // The board still starts from the URL colors or the manage default.
    }
};

export const readInitialLensColors = (
    location = globalThis.location,
    storage = globalThis.sessionStorage
) => {
    const override = readLensColorOverride(location);
    clearStoredLensColors(storage);
    return override;
};

const resolveColor = (setting, fallback) => {
    const candidates = [
        setting?.color,
        setting?.glassColor,
        setting?.lightColor
    ];
    return candidates.find((value) =>
        typeof value === 'string' && LENS_COLORS[value]
    ) || fallback;
};

const positiveModulo = (value, divisor) =>
    ((value % divisor) + divisor) % divisor;

const lensBlinkEntries = new Map();
let lensBlinkFrame = 0;

const prefersReducedMotion = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const lensBlinkOpacity = (phase) =>
    phase < LENS_DEFAULTS.blinkInterval ? '0.95' : '0';

const paintLensBlinks = () => {
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

    if (lensBlinkEntries.size > 0
        && typeof window.requestAnimationFrame === 'function') {
        lensBlinkFrame = window.requestAnimationFrame(paintLensBlinks);
    }
};

const syncLensBlink = (lens, light, {
    now,
    lensIndex,
    rowIndex,
    synchronizeRows,
    active
}) => {
    const canShareClock = active
        && !prefersReducedMotion()
        && typeof window !== 'undefined'
        && typeof window.requestAnimationFrame === 'function';
    if (!canShareClock) {
        lensBlinkEntries.delete(light);
        light.style.opacity = '';
        lens.classList.remove('is-blink-synced');
        return;
    }

    lensBlinkEntries.set(light, {
        lensIndex,
        rowIndex,
        synchronizeRows
    });
    lens.classList.add('is-blink-synced');
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

/**
 * Return the phase that should be used for a lens animation at this instant.
 *
 * The phase is based on the wall clock instead of the time at which a
 * particular row happened to render. That keeps all rows (and the Manage
 * preview) on the same interval even though rows are updated sequentially.
 */
export const getLensBlinkPhase = ({
    now = Date.now(),
    lensIndex = 0,
    rowIndex = 0,
    synchronizeRows = true
} = {}) => {
    const interval = LENS_DEFAULTS.blinkInterval;
    const period = interval * 2;
    const globalPhase = positiveModulo(Number(now) / 1000, period);
    const lensOffset = Math.abs(Number(lensIndex) || 0) * interval;
    const rowOffset = synchronizeRows
        ? 0
        : (Math.abs(Number(rowIndex) || 0) % 2) * interval;

    return positiveModulo(globalPhase + lensOffset + rowOffset, period);
};

const normalizePreDeparture = (setting = {}) => {
    const source = setting?.preDeparture || setting;
    const enabled = typeof source?.enabled === 'boolean'
        ? source.enabled
        : typeof setting?.preDepartureEnabled === 'boolean'
            ? setting.preDepartureEnabled
            : LENS_PREDEPARTURE_DEFAULTS.enabled;
    const rawSeconds = source?.seconds
        ?? setting?.preDepartureSeconds
        ?? LENS_PREDEPARTURE_DEFAULTS.seconds;
    const numericSeconds = Number(rawSeconds);
    const seconds = Number.isFinite(numericSeconds)
        ? Math.round(
            Math.min(
                LENS_PREDEPARTURE_SECONDS_MAX,
                Math.max(LENS_PREDEPARTURE_SECONDS_MIN, numericSeconds)
            ) / LENS_PREDEPARTURE_SECONDS_STEP
        ) * LENS_PREDEPARTURE_SECONDS_STEP
        : LENS_PREDEPARTURE_DEFAULTS.seconds;

    return { enabled, seconds };
};

export const createDefaultLensState = (count = 2, overrides = {}) => {
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
    // Lens pairs are one component. Their interval is intentionally fixed so
    // every departure row can share the same physical-looking phase.
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

export const createEmptyLensState = (count = 2) => createDefaultLensState(
    count,
    {
        enabled: false,
        preDeparture: {
            enabled: false,
            seconds: LENS_PREDEPARTURE_DEFAULTS.seconds
        }
    }
);

const clamp = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(maximum, Math.max(minimum, number))
        : fallback;
};

const cloneLens = (setting, fallback, index) => ({
    color: resolveColor(setting, fallback.color),
    enabled: typeof setting?.enabled === 'boolean'
        ? setting.enabled
        : fallback.enabled,
    blinking: typeof setting?.blinking === 'boolean'
        ? setting.blinking
        : fallback.blinking,
    blinkInterval: resolveBlinkInterval(setting, fallback.blinkInterval),
    blinkDelay: clamp(
        setting?.blinkDelay,
        0,
        30,
        fallback.blinkDelay
    )
});

const synchronizeLensTiming = (lenses) => {
    const blinkInterval = LENS_DEFAULTS.blinkInterval;

    return lenses.map((lens, index) => ({
        ...lens,
        blinkInterval,
        blinkDelay: index * blinkInterval
    }));
};

export class LensDisplay {
    constructor(element, {
        count = 2,
        defaultState,
        rowIndex = 0,
        ...defaults
    } = {}) {
        if (!element) {
            throw new TypeError('LensDisplay vyžaduje DOM element.');
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
        if (!Object.prototype.hasOwnProperty.call(defaults, 'blinkDelay')) {
            delete defaultOverrides.blinkDelay;
        }
        this.defaultState = defaultState
            || createDefaultLensState(this.count, defaultOverrides);
        this.state = this.normalize(this.defaultState);
        this.preDepartureActive = true;
        this.render();
    }

    normalize(value) {
        if (value === '' || value === null || value === undefined) {
            return {
                lenses: synchronizeLensTiming(
                    Array.from({ length: this.count }, (_, index) =>
                        cloneLens(
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

        const source = Array.isArray(value)
            ? { lenses: value }
            : value;
        const values = Array.isArray(source?.lenses)
            ? source.lenses
            : [source];

        return {
            lenses: synchronizeLensTiming(
                Array.from({ length: this.count }, (_, index) =>
                    cloneLens(
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
        const lens = document.createElement('span');
        const color = LENS_COLORS[setting.color];

        lens.className = 'lens';
        lens.dataset.lensIndex = String(index);
        lens.setAttribute('aria-hidden', 'true');
        lens.style.setProperty('--lens-glass-color', color.glass);
        lens.style.setProperty('--lens-light-color', color.light);
        lens.style.setProperty('--lens-light-core-color', color.core);
        lens.style.setProperty(
            '--lens-blink-duration',
            `${LENS_DEFAULTS.blinkInterval * 2}s`
        );
        lens.style.setProperty(
            '--lens-blink-delay',
            `${-getLensBlinkPhase({
                now,
                lensIndex: index,
                rowIndex: this.rowIndex,
                synchronizeRows: this.state.synchronizeRows
            })}s`
        );
        const preDepartureActive = !this.state.preDeparture.enabled
            || this.preDepartureActive;
        const blinking = setting.enabled
            && setting.blinking
            && preDepartureActive;
        lens.classList.toggle(
            'is-on',
            setting.enabled && preDepartureActive
        );
        lens.classList.toggle('is-blinking', blinking);

        const lightElement = document.createElement('span');
        lightElement.className = 'lens-light';
        if (blinking
            && !prefersReducedMotion()
            && typeof window.requestAnimationFrame === 'function') {
            lens.classList.add('is-blink-synced');
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
            ...this.state.lenses.map((setting, index) =>
                this.renderLens(setting, index, now))
        );
        this.element.classList.add('lens-display');
        this.element.setAttribute('role', 'img');
        this.element.setAttribute(
            'aria-label',
            `${this.state.lenses.length} signalizačních čoček`
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
        if (nextValue === this.preDepartureActive
            && this.element.childElementCount === this.state.lenses.length) {
            return this.preDepartureActive;
        }

        this.preDepartureActive = nextValue;
        this.applyActivity();
        return this.preDepartureActive;
    }

    applyActivity() {
        const lenses = this.element.querySelectorAll(':scope > .lens');
        if (lenses.length !== this.state.lenses.length) {
            this.render();
            return;
        }

        const now = Date.now();
        const preDepartureActive = !this.state.preDeparture.enabled
            || this.preDepartureActive;
        this.state.lenses.forEach((setting, index) => {
            const lens = lenses[index];
            const blinking = setting.enabled
                && setting.blinking
                && preDepartureActive;
            const phase = getLensBlinkPhase({
                now,
                lensIndex: index,
                rowIndex: this.rowIndex,
                synchronizeRows: this.state.synchronizeRows
            });
            lens.style.setProperty(
                '--lens-blink-duration',
                `${LENS_DEFAULTS.blinkInterval * 2}s`
            );
            lens.style.setProperty('--lens-blink-delay', `${-phase}s`);
            lens.classList.toggle(
                'is-on',
                setting.enabled && preDepartureActive
            );
            lens.classList.toggle('is-blinking', blinking);
            const light = lens.querySelector(':scope > .lens-light');
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
        return this.set('');
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
        this.element.removeAttribute('aria-label');
    }
}
