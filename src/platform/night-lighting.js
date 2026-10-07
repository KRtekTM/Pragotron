import {
    NIGHT_CLOCK_DEFAULTS,
    NIGHT_FADE_MODES,
    NIGHT_LIGHT_DEFAULTS
} from './data.js';

const clamp = (value, minimum, maximum, fallback) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
        ? Math.min(maximum, Math.max(minimum, numericValue))
        : fallback;
};

const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

const validFade = (fade) => NIGHT_FADE_MODES.some((mode) => mode.value === fade)
    ? fade
    : 'soft';

const cloneLamp = (setting) => ({
    id: setting.id,
    label: setting.label,
    enabled: Boolean(setting.enabled),
    variation: Boolean(setting.variation),
    intensity: Math.round(clamp(setting.intensity, 0, 100, 0)),
    speed: Math.round(clamp(setting.speed, 1, 120, 60) * 2) / 2,
    fade: validFade(setting.fade)
});

export class NightLighting {
    constructor({
        root,
        clockBlock = root?.querySelector('#clockBlock'),
        lampDefaults = NIGHT_LIGHT_DEFAULTS,
        initialLamps = {},
        initialClock = NIGHT_CLOCK_DEFAULTS
    } = {}) {
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
            enabled: typeof initialClock.enabled === 'boolean'
                ? initialClock.enabled
                : NIGHT_CLOCK_DEFAULTS.enabled,
            intensity: Math.round(
                clamp(
                    initialClock.intensity,
                    0,
                    100,
                    NIGHT_CLOCK_DEFAULTS.intensity
                )
            )
        };
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
            throw new Error(`Neznámé světlo "${id}".`);
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
            enabled: typeof patch.enabled === 'boolean'
                ? patch.enabled
                : this.clockSettings.enabled,
            intensity: Math.round(
                clamp(
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
