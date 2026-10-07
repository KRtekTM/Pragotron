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
    blinkInterval: 0.2,
    blinkDelay: 0
});

export const LENS_BLINK_INTERVAL_MIN = 0.1;
export const LENS_BLINK_INTERVAL_MAX = 1.5;

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

export const createDefaultLensState = (count = 2, overrides = {}) => {
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
    const blinkInterval =
        lenses[0]?.blinkInterval || LENS_DEFAULTS.blinkInterval;

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
        ...defaults
    } = {}) {
        if (!element) {
            throw new TypeError('LensDisplay vyžaduje DOM element.');
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
        if (!Object.prototype.hasOwnProperty.call(defaults, 'blinkDelay')) {
            delete defaultOverrides.blinkDelay;
        }
        this.defaultState = defaultState
            || createDefaultLensState(this.count, defaultOverrides);
        this.state = this.normalize(this.defaultState);
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
                )
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
            )
        };
    }

    renderLens(setting, index) {
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
            `${setting.blinkInterval * 2}s`
        );
        lens.style.setProperty('--lens-blink-delay', `${setting.blinkDelay}s`);
        lens.classList.toggle('is-on', setting.enabled);
        lens.classList.toggle('is-blinking', setting.enabled && setting.blinking);

        const lightElement = document.createElement('span');
        lightElement.className = 'lens-light';
        lens.appendChild(lightElement);

        return lens;
    }

    render() {
        this.element.replaceChildren(
            ...this.state.lenses.map((setting, index) =>
                this.renderLens(setting, index))
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

    clear() {
        return this.set('');
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
        this.element.removeAttribute('aria-label');
    }
}
