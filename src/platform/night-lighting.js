import {
    NIGHT_CLOCK_DEFAULTS,
    NIGHT_LIGHT_DEFAULTS
} from './data.js';
import { LightingSettings } from './lighting-state.js';

const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

export class NightLighting extends LightingSettings {
    constructor({
        root,
        clockBlock = root?.querySelector('#clockBlock'),
        lampDefaults = NIGHT_LIGHT_DEFAULTS,
        initialLamps = {},
        initialClock = NIGHT_CLOCK_DEFAULTS
    } = {}) {
        super({ lampDefaults, initialLamps, initialClock });

        if (!root) {
            throw new TypeError('NightLighting vyžaduje root element.');
        }

        this.root = root;
        this.document = root.ownerDocument;
        this.clockBlock = clockBlock;
        this.lightElements = new Map(
            Array.from(root.querySelectorAll('.night-light')).map((light) => [
                light.dataset.lightId,
                light
            ])
        );
        this.flickerTimers = new Map();
        this.flickerTokens = new Map();
        this.visibilityHandler = () => this.handleVisibilityChange();
        this.mounted = false;
    }

    mount() {
        if (this.mounted) {
            return this;
        }

        this.document.addEventListener('visibilitychange', this.visibilityHandler);
        this.handleVisibilityChange();
        this.applyClockVisual();
        this.settings.forEach((setting) => this.applyLampVisual(setting));
        this.root.classList.add('night-lighting-ready');
        this.mounted = true;
        return this;
    }

    handleVisibilityChange() {
        this.root.classList.toggle('page-hidden', this.document.hidden);
        this.syncFlicker();
    }

    setNightMode(isNight) {
        this.root.classList.toggle('night-mode', Boolean(isNight));
        this.syncFlicker();
    }

    isNightMode() {
        return this.root.classList.contains('night-mode');
    }

    updateLamp(id, patch) {
        const next = super.updateLamp(id, patch);
        this.applyLampVisual(next);
        return next;
    }

    reset() {
        super.reset();
        this.settings.forEach((setting) => this.applyLampVisual(setting));
        this.applyClockVisual();
    }

    setClockLight(patch = {}) {
        const settings = super.setClockLight(patch);
        this.applyClockVisual();
        return settings;
    }

    applyClockVisual() {
        if (!this.clockBlock) {
            return;
        }

        this.clockBlock.style.setProperty(
            '--clock-light-intensity',
            this.clockSettings.enabled
                ? String(this.clockSettings.intensity / 100)
                : '0'
        );
        this.clockBlock.style.setProperty(
            '--clock-light-enabled',
            this.clockSettings.enabled ? '1' : '0'
        );
    }

    applyLampVisual(setting) {
        const light = this.lightElements.get(setting.id);
        if (!light) {
            return;
        }

        light.style.setProperty(
            '--lamp-opacity',
            setting.enabled && setting.intensity > 0
                ? String(setting.intensity / 100)
                : '0'
        );
        light.style.setProperty('--lamp-cycle', `${setting.speed}s`);
        light.dataset.fade = setting.fade;
        light.classList.toggle(
            'is-off',
            !setting.enabled || setting.intensity === 0
        );
        light.classList.toggle(
            'is-steady',
            !setting.variation || setting.fade === 'none'
        );
        this.updateFlicker(setting);
    }

    stopFlicker(light) {
        const id = light.dataset.lightId;
        const timer = this.flickerTimers.get(id);
        this.flickerTokens.set(id, (this.flickerTokens.get(id) || 0) + 1);

        if (timer !== undefined) {
            this.document.defaultView.clearTimeout(timer);
            this.flickerTimers.delete(id);
        }

        light.style.removeProperty('--lamp-flicker-brightness');
        light.style.removeProperty('--lamp-flicker-opacity');
        light.style.removeProperty('--lamp-flicker-transition');
    }

    updateFlicker(setting) {
        const light = this.lightElements.get(setting.id);
        if (!light) {
            return;
        }

        this.stopFlicker(light);
        const reducedMotion = this.document.defaultView.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (this.document.hidden
            || !this.isNightMode()
            || !setting.enabled
            || setting.intensity <= 0
            || !setting.variation
            || setting.fade !== 'flicker'
            || reducedMotion) {
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
                '--lamp-flicker-brightness',
                String(isDip
                    ? randomBetween(0.72, 0.88)
                    : randomBetween(0.94, 1.03))
            );
            light.style.setProperty(
                '--lamp-flicker-opacity',
                String(isDip
                    ? randomBetween(0.28, 0.46)
                    : randomBetween(0.48, 0.66))
            );
            light.style.setProperty(
                '--lamp-flicker-transition',
                `${randomBetween(90, 360).toFixed(0)}ms`
            );

            const cycleDuration = Math.max(1, setting.speed) * 1000;
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
        this.flickerTimers.forEach((timer) =>
            this.document.defaultView.clearTimeout(timer)
        );
        this.flickerTimers.clear();
        this.document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.settings.forEach((setting) => {
            const light = this.lightElements.get(setting.id);
            if (light) {
                this.stopFlicker(light);
            }
        });
        this.root.classList.remove('night-lighting-ready');
        this.mounted = false;
    }
}
