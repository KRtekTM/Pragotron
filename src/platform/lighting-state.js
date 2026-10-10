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

const validFade = (fade) => NIGHT_FADE_MODES.some((mode) => mode.value === fade)
    ? fade
    : 'soft';

const LEGACY_LIGHT_DEFAULTS = Object.freeze({
    'top-left': { enabled: true, variation: true, intensity: 100, speed: 45, fade: 'soft' },
    'top-center': { enabled: true, variation: true, intensity: 85, speed: 60, fade: 'slow' },
    'top-right': { enabled: true, variation: true, intensity: 55, speed: 45, fade: 'flicker' },
    'bottom-left': { enabled: false, variation: false, intensity: 0, speed: 60, fade: 'soft' },
    'bottom-right': { enabled: true, variation: true, intensity: 75, speed: 55, fade: 'slow' }
});

const PREVIOUS_UNIFORM_DEFAULT = Object.freeze({
    enabled: true,
    variation: true,
    intensity: 100,
    speed: 45,
    fade: 'soft'
});

const matchesLampSetting = (setting, legacy) => [
    'enabled',
    'variation',
    'intensity',
    'speed',
    'fade'
].every((key) => String(setting?.[key]) === String(legacy[key]));

const isLegacyDefault = (id, setting) => {
    if (!setting || typeof setting !== 'object') {
        return false;
    }

    if (matchesLampSetting(setting, PREVIOUS_UNIFORM_DEFAULT)) {
        return true;
    }

    const legacy = LEGACY_LIGHT_DEFAULTS[id];
    return Boolean(legacy) && matchesLampSetting(setting, legacy);
};

export const cloneLampSetting = (setting) => ({
    id: setting.id,
    label: setting.label,
    enabled: Boolean(setting.enabled),
    variation: Boolean(setting.variation),
    intensity: Math.round(clamp(setting.intensity, 0, 100, 0)),
    speed: Math.round(clamp(setting.speed, 1, 120, 60) * 2) / 2,
    fade: validFade(setting.fade)
});

export class LightingSettings {
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
                )
                    ? {}
                    : storedSetting;
                return [
                    defaultSetting.id,
                    cloneLampSetting({ ...defaultSetting, ...savedSetting })
                ];
            })
        );

        const clock = initialClock || {};
        const clockSource = clock.enabled === true && Number(clock.intensity) === 50
            ? {}
            : clock;
        this.clockSettings = {
            enabled: typeof clockSource.enabled === 'boolean'
                ? clockSource.enabled
                : NIGHT_CLOCK_DEFAULTS.enabled,
            intensity: Math.round(
                clamp(
                    clockSource.intensity,
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
            throw new Error(`Neznámé světlo "${id}".`);
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
        return this.getClockSettings();
    }
}
