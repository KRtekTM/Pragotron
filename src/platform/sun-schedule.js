import {
    getSunrise,
    getSunset
} from '../../node_modules/sunrise-sunset-js/dist/index.js';

export const BRATISLAVA_SUN_LOCATION = Object.freeze({
    name: 'Bratislava',
    latitude: 48.1486,
    longitude: 17.1077,
    timezoneId: 'Europe/Bratislava'
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

export const calculateSunSchedule = (
    date = new Date(),
    location = BRATISLAVA_SUN_LOCATION
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
        // The default Bratislava location never reaches this branch. Treat
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
        location = BRATISLAVA_SUN_LOCATION,
        onChange = () => {},
        timerApi = globalThis.window
    } = {}) {
        this.location = location;
        this.onChange = onChange;
        this.timerApi = timerApi || globalThis;
        this.timer = null;
        this.running = false;
        this.currentIsNight = null;
    }

    getState(date = new Date()) {
        return calculateSunSchedule(date, this.location);
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

    update(date = new Date()) {
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
        const delay = nextBoundary === undefined
            ? FALLBACK_REFRESH_MS
            : Math.max(
                MINIMUM_TIMER_DELAY_MS,
                nextBoundary - now + 50
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
