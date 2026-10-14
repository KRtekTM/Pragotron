import {
    getSunrise,
    getSunset
} from '../../node_modules/sunrise-sunset-js/dist/index.js';

export const BRNO_SUN_LOCATION = Object.freeze({
    name: 'Brno',
    latitude: 49.1951,
    longitude: 16.6068,
    timezoneId: 'Europe/Prague'
});

export const BRATISLAVA_SUN_LOCATION = Object.freeze({
    name: 'Bratislava',
    latitude: 48.1486,
    longitude: 17.1077,
    timezoneId: 'Europe/Bratislava'
});
export const SUN_SCHEDULE_MODES = Object.freeze({
    LOCATION: 'location',
    TIMES: 'times'
});
export const DEFAULT_SUN_TIMES = Object.freeze({
    sunrise: '06:00',
    sunset: '18:00'
});

const FALLBACK_REFRESH_MS = 15 * 60 * 1000;
const MINIMUM_TIMER_DELAY_MS = 1000;

const isValidDate = (value) =>
    value instanceof Date && Number.isFinite(value.getTime());

const getCalculationDate = (value) =>
    isValidDate(value) ? new Date(value.getTime()) : new Date();

const getOptions = (location) => location.timezoneId
    ? { timezoneId: location.timezoneId }
    : undefined;

const normalizeTime = (value, fallback) => {
    const text = String(value ?? '').trim();
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
};

export const normalizeSunScheduleSettings = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {};
    const location = source.location && typeof source.location === 'object'
        ? source.location
        : BRNO_SUN_LOCATION;
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    return {
        mode: source.mode === SUN_SCHEDULE_MODES.TIMES
            ? SUN_SCHEDULE_MODES.TIMES
            : SUN_SCHEDULE_MODES.LOCATION,
        location: {
            name: String(location.name || 'Vybraná poloha').trim().slice(0, 80),
            latitude: Number.isFinite(latitude)
                ? Math.max(-85, Math.min(85, latitude))
                : BRNO_SUN_LOCATION.latitude,
            longitude: Number.isFinite(longitude)
                ? Math.max(-180, Math.min(180, longitude))
                : BRNO_SUN_LOCATION.longitude,
            timezoneId: String(location.timezoneId || '').trim()
                || undefined
        },
        times: {
            sunrise: normalizeTime(
                source.times?.sunrise,
                DEFAULT_SUN_TIMES.sunrise
            ),
            sunset: normalizeTime(
                source.times?.sunset,
                DEFAULT_SUN_TIMES.sunset
            )
        }
    };
};

const manualBoundary = (date, value) => {
    const [hours, minutes] = value.split(':').map(Number);
    const boundary = new Date(date.getTime());
    boundary.setHours(hours, minutes, 0, 0);
    return boundary;
};

const calculateManualSchedule = (date, times) => {
    const sunrise = manualBoundary(date, times.sunrise);
    const sunset = manualBoundary(date, times.sunset);
    return {
        date,
        sunrise,
        sunset,
        isNight: date < sunrise || date >= sunset
    };
};

export const calculateSunSchedule = (
    date = new Date(),
    location = BRNO_SUN_LOCATION
) => {
    const current = getCalculationDate(date);
    const options = getOptions(location);
    const sunrise = getSunrise(
        location.latitude,
        location.longitude,
        current,
        options
    );
    const sunset = getSunset(
        location.latitude,
        location.longitude,
        current,
        options
    );

    let isNight;
    if (isValidDate(sunrise) && isValidDate(sunset)) {
        isNight = current < sunrise || current >= sunset;
    } else if (isValidDate(sunrise)) {
        isNight = current < sunrise;
    } else if (isValidDate(sunset)) {
        isNight = current >= sunset;
    } else {
        // The default Brno location never reaches this branch. Treat
        // an unresolvable solar day as night so the cabinet is not overlit.
        isNight = true;
    }

    return {
        date: current,
        sunrise: isValidDate(sunrise) ? sunrise : null,
        sunset: isValidDate(sunset) ? sunset : null,
        isNight
    };
};

const addCalendarDay = (date) => {
    const nextDate = new Date(date.getTime());
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
};

export class SunSchedule {
    constructor({
        location = BRNO_SUN_LOCATION,
        mode = SUN_SCHEDULE_MODES.LOCATION,
        times = DEFAULT_SUN_TIMES,
        settings = null,
        onChange = () => {},
        timerApi = globalThis.window,
        now = () => new Date(),
        clockRate = () => 1
    } = {}) {
        this.settings = normalizeSunScheduleSettings(settings || {
            mode,
            location,
            times
        });
        this.onChange = onChange;
        this.timerApi = timerApi || globalThis;
        this.now = typeof now === 'function' ? now : () => new Date();
        this.clockRate = typeof clockRate === 'function' ? clockRate : () => 1;
        this.timer = null;
        this.running = false;
        this.currentIsNight = null;
    }

    getState(date = this.now()) {
        return this.settings.mode === SUN_SCHEDULE_MODES.TIMES
            ? calculateManualSchedule(
                getCalculationDate(date),
                this.settings.times
            )
            : calculateSunSchedule(date, this.settings.location);
    }

    setSettings(value) {
        this.settings = normalizeSunScheduleSettings(value);
        if (this.running) {
            this.update();
        }
        return this;
    }

    getSettings() {
        return {
            ...this.settings,
            location: { ...this.settings.location },
            times: { ...this.settings.times }
        };
    }

    start() {
        if (this.running) {
            return this;
        }

        this.running = true;
        this.update();
        return this;
    }

    stop() {
        this.running = false;
        this.currentIsNight = null;

        if (this.timer !== null) {
            this.timerApi.clearTimeout(this.timer);
            this.timer = null;
        }
    }

    update(date = this.now()) {
        if (!this.running) {
            return;
        }

        const state = this.getState(date);
        if (state.isNight !== this.currentIsNight) {
            this.currentIsNight = state.isNight;
            this.onChange(state.isNight, state);
        }

        this.scheduleNextBoundary(state);
    }

    scheduleNextBoundary(state) {
        if (!this.running) {
            return;
        }

        if (this.timer !== null) {
            this.timerApi.clearTimeout(this.timer);
            this.timer = null;
        }

        const now = state.date.getTime();
        const tomorrow = this.getState(addCalendarDay(state.date));
        const boundaries = [
            state.sunrise,
            state.sunset,
            tomorrow.sunrise,
            tomorrow.sunset
        ]
            .filter(isValidDate)
            .map((boundary) => boundary.getTime())
            .filter((time) => time > now)
            .sort((first, second) => first - second);
        const nextBoundary = boundaries[0];
        const rate = Number(this.clockRate());
        const delay = nextBoundary === undefined || rate <= 0
            ? FALLBACK_REFRESH_MS
            : Math.max(
                MINIMUM_TIMER_DELAY_MS,
                (nextBoundary - now + 50) / rate
            );

        this.timer = this.timerApi.setTimeout(() => {
            this.timer = null;
            this.update();
        }, delay);
    }

    destroy() {
        this.stop();
    }
}
