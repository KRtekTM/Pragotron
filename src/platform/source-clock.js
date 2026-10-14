const listeners = new Set();

let anchor = null;

const notify = () => {
    listeners.forEach((listener) => {
        listener();
    });
};

export const normalizeSourceClock = (value) => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const timeMs = Date.parse(value.time);
    if (!Number.isFinite(timeMs)) {
        return null;
    }

    const paceNumber = Number(value.pace);
    const pace = Number.isFinite(paceNumber)
        ? Math.min(120, Math.max(0, paceNumber))
        : 1;

    return {
        time: new Date(timeMs).toISOString(),
        pace
    };
};

export const hasSourceClock = () => anchor !== null;

export const sourcePace = () => anchor?.pace ?? 1;

export const sourceNow = () => {
    if (!anchor) {
        return new Date();
    }

    return new Date(
        anchor.timeMs + (Date.now() - anchor.receivedAt) * anchor.pace
    );
};

export const sourceClockSnapshot = () => {
    if (!anchor) {
        return null;
    }

    return {
        time: sourceNow().toISOString(),
        pace: anchor.pace
    };
};

export const setSourceClock = (value) => {
    const clock = normalizeSourceClock(value);
    if (!clock) {
        if (!anchor) {
            return false;
        }
        anchor = null;
        notify();
        return true;
    }

    const nextMs = Date.parse(clock.time);
    const receivedAt = Date.now();
    if (anchor && anchor.pace === clock.pace) {
        const projected = anchor.timeMs
            + ((receivedAt - anchor.receivedAt) * anchor.pace);
        const tolerance = Math.max(2000, anchor.pace * 5000);
        if (Math.abs(projected - nextMs) <= tolerance) {
            anchor = {
                timeMs: nextMs,
                receivedAt,
                pace: clock.pace
            };
            return false;
        }
    }

    anchor = {
        timeMs: nextMs,
        receivedAt,
        pace: clock.pace
    };
    notify();
    return true;
};

export const subscribeSourceClock = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// How long to wait in real time until a simulated timestamp.
// Null means the clock is frozen and that moment will not arrive.
export const sourceDelay = (simulatedMs, now = sourceNow()) => {
    const delta = simulatedMs - now.getTime();
    if (delta <= 0) {
        return 0;
    }

    const pace = sourcePace();
    if (pace <= 0) {
        return null;
    }

    return delta / pace;
};
