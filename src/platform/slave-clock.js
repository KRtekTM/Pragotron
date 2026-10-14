// A subordinate clock runs its own seconds. The master only decides the
// minute: the slave waits on second 59 for that impulse, or steps the minute
// early when the impulse arrives first.
export const createSlaveClock = ({
    hasSourceClock = () => false,
    sourceNow = () => new Date(),
    sourcePace = () => 1,
    realNow = () => Date.now()
} = {}) => {
    let minuteKey = '';
    let minuteDate = null;
    let secondOrigin = 0;
    let secondOriginReal = 0;
    let holding = false;
    let pace = 1;

    const minuteKeyOf = (date) => [
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes()
    ].join('-');

    const readSeconds = (nowReal) => {
        if (holding) {
            return 59;
        }

        return secondOrigin + (((nowReal - secondOriginReal) * pace) / 1000);
    };

    const alignSeconds = (master, nowReal, nextPace) => {
        const seconds = master.getSeconds()
            + (master.getMilliseconds() / 1000);
        secondOrigin = seconds >= 59 ? 59 : Math.max(0, seconds);
        secondOriginReal = nowReal;
        holding = secondOrigin >= 59;
        pace = nextPace;
    };

    const now = () => {
        if (!hasSourceClock()) {
            minuteKey = '';
            minuteDate = null;
            holding = false;
            return new Date();
        }

        const master = sourceNow();
        if (!(master instanceof Date) || !Number.isFinite(master.getTime())) {
            return new Date();
        }

        const nextKey = minuteKeyOf(master);
        const paceNumber = Number(sourcePace());
        const nextPace = Number.isFinite(paceNumber)
            ? Math.max(0, paceNumber)
            : 1;
        const nowReal = realNow();

        if (!minuteDate) {
            minuteDate = new Date(master.getTime());
            minuteDate.setSeconds(0, 0);
            minuteKey = nextKey;
            alignSeconds(master, nowReal, nextPace);
        } else if (nextKey !== minuteKey) {
            const nextMinute = new Date(master.getTime());
            nextMinute.setSeconds(0, 0);
            const delta = nextMinute.getTime() - minuteDate.getTime();
            minuteDate = nextMinute;
            minuteKey = nextKey;
            if (delta !== 60_000) {
                alignSeconds(master, nowReal, nextPace);
            } else if (holding) {
                secondOrigin = 0;
                secondOriginReal = nowReal;
                holding = false;
                pace = nextPace;
            } else if (nextPace !== pace) {
                const seconds = Math.min(59, Math.max(0, readSeconds(nowReal)));
                secondOrigin = seconds >= 59 ? 59 : seconds;
                secondOriginReal = nowReal;
                holding = secondOrigin >= 59;
                pace = nextPace;
            } else {
                pace = nextPace;
            }
        } else if (nextPace !== pace) {
            const seconds = Math.min(59, Math.max(0, readSeconds(nowReal)));
            secondOrigin = seconds >= 59 ? 59 : seconds;
            secondOriginReal = nowReal;
            holding = secondOrigin >= 59;
            pace = nextPace;
        }

        let seconds = readSeconds(nowReal);
        if (seconds >= 59) {
            seconds = 59;
            holding = true;
        }

        const shown = new Date(minuteDate.getTime());
        const whole = Math.floor(seconds);
        const millis = Math.min(999, Math.floor((seconds - whole) * 1000));
        shown.setSeconds(whole, millis);
        return shown;
    };

    return { now };
};
