export const DEFAULT_CLOCK_OPTIONS = Object.freeze({
    size: 512,
    sweepingMinutes: false,
    sweepingSeconds: true,
    showNumerals: false,
    brandText: '',
    brandText2: '',
    secondHandEnabled: false,
    showMinuteLines: false
});

export class AnalogClock {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...DEFAULT_CLOCK_OPTIONS, ...options };
        this.mounted = false;
    }

    mount() {
        if (this.mounted) {
            return this;
        }

        const jquery = window.jQuery;
        if (!jquery?.fn?.thooClock) {
            throw new Error('AnalogClock vyžaduje načtený jquery.thooClock plugin.');
        }

        jquery(this.element).thooClock(this.options);
        this.mounted = true;
        return this;
    }

    redraw() {
        this.element?.redraw?.();
    }

    transitionNightMode() {
        if (typeof this.element?.transitionNightMode === 'function') {
            this.element.transitionNightMode();
            return;
        }

        this.redraw();
    }

    destroy() {
        if (!this.mounted) {
            return;
        }

        this.element?.destroy?.();
        this.mounted = false;
    }
}
