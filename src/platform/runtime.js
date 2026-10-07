import {
    DELAY_VALUES,
    FLAP_TIMING_DEFAULTS,
    TRAIN_TYPES,
    cloneBoardState,
    createEmptyBoardState,
    normalizeDelayOffset,
    normalizeFlapTiming
} from './data.js';
import { SplitFlapAudio } from './audio.js';
import {
    DelayFlapDisplay,
    DepartureTimeDisplay,
    SplitFlapDisplay,
    TrainFlapDisplay
} from './displays.js';
import { LensDisplay } from './lenses.js';

const readPath = (state, path) => {
    const keys = Array.isArray(path) ? path : [path];
    return keys.reduce(
        (value, key) => value === undefined || value === null ? undefined : value[key],
        state
    );
};

const writePath = (state, path, value) => {
    const keys = Array.isArray(path) ? path : [path];
    let target = state;

    keys.slice(0, -1).forEach((key, index) => {
        if (!target[key] || typeof target[key] !== 'object') {
            target[key] = typeof keys[index + 1] === 'number' ? [] : {};
        }
        target = target[key];
    });

    target[keys[keys.length - 1]] = value;
};

export class ComponentRegistry {
    constructor() {
        this.factories = new Map();
    }

    register(type, factory) {
        if (!type || typeof factory !== 'function') {
            throw new TypeError('Registrace komponenty vyžaduje typ a factory funkci.');
        }

        this.factories.set(type, factory);
        return this;
    }

    create(type, element, options = {}) {
        const factory = this.factories.get(type);
        if (!factory) {
            throw new Error(`Neznámý typ komponenty "${type}".`);
        }

        return factory(element, options);
    }
}

export const createDefaultRegistry = ({ audio = new SplitFlapAudio() } = {}) => {
    const registry = new ComponentRegistry();
    registry
        .register('split-flap', (element, options) =>
            new SplitFlapDisplay(element, { ...options, audio }))
        .register('delay-flap', (element, options) =>
            new DelayFlapDisplay(element, DELAY_VALUES, { ...options, audio }))
        .register('train-flap', (element, options) =>
            new TrainFlapDisplay(element, TRAIN_TYPES, { ...options, audio }))
        .register('departure-time', (element, options) =>
            new DepartureTimeDisplay(element, { ...options, audio }))
        .register('lens-display', (element, options) =>
            new LensDisplay(element, options));

    return registry;
};

export class BoardRuntime {
    constructor({
        root,
        slots,
        registry = createDefaultRegistry(),
        initialState = createEmptyBoardState(),
        flapTiming = FLAP_TIMING_DEFAULTS
    }) {
        if (!root) {
            throw new TypeError('BoardRuntime vyžaduje root element.');
        }

        this.root = root;
        this.slots = slots;
        this.registry = registry;
        this.initialState = cloneBoardState(initialState);
        this.flapTiming = normalizeFlapTiming(flapTiming);
        this.components = new Map();
        this.listeners = new Set();
        this.mounted = false;
    }

    mount() {
        if (this.mounted) {
            return this;
        }

        this.slots.forEach((definition) => {
            const element = definition.element
                || this.root.querySelector(definition.selector
                    || `[data-board-slot="${definition.id}"]`);

            if (!element) {
                throw new Error(`Slot tabule "${definition.id}" nebyl nalezen.`);
            }

            const component = this.registry.create(
                definition.type,
                element,
                definition.type === 'lens-display'
                    ? definition.options || {}
                    : {
                        ...(definition.options || {}),
                        timing: this.flapTiming
                    }
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

            if (immediate && typeof component.setImmediate === 'function') {
                if (definition.type === 'departure-time') {
                    if (value === null) {
                        if (typeof component.clearImmediate === 'function') {
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
                    component.setImmediate(value ?? '');
                }
                return;
            }

            if (definition.type === 'departure-time') {
                if (value === null) {
                    component.clear();
                } else {
                    component.set(value.hours, value.minutes);
                }
            } else if (value === '' && typeof component.clear === 'function') {
                component.clear();
            } else {
                component.set(value ?? '');
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
            if (!component || typeof component.getValue !== 'function') {
                return;
            }

            writePath(state, definition.statePath, component.getValue());
        });

        return state;
    }

    isSettled() {
        return [...this.components.values()].every((component) =>
            typeof component.isSettled !== 'function' || component.isSettled()
        );
    }

    getComponent(id) {
        return this.components.get(id);
    }

    setFlapTiming(timing) {
        this.flapTiming = normalizeFlapTiming(timing);
        this.components.forEach((component) => {
            component.setTiming?.(this.flapTiming);
        });
        return { ...this.flapTiming };
    }

    setDelayOffset(enabled) {
        this.components.forEach((component) => {
            component.setDelayOffset?.(enabled);
        });
        return normalizeDelayOffset(enabled);
    }

    getFlapTiming() {
        return { ...this.flapTiming };
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener musí být funkce.');
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
}

export const createBoard = (options) => new BoardRuntime(options).mount();
