const jobs = new Set();
let timer = null;
let timerDue = Infinity;

const arm = () => {
    let soonest = Infinity;
    jobs.forEach((job) => {
        if (!job.cancelled && job.due < soonest) {
            soonest = job.due;
        }
    });

    if (soonest === Infinity) {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        timerDue = Infinity;
        return;
    }

    if (timer !== null && Math.abs(timerDue - soonest) < 1) {
        return;
    }

    if (timer !== null) {
        clearTimeout(timer);
    }

    timerDue = soonest;
    timer = setTimeout(run, Math.max(0, soonest - performance.now()));
};

const run = () => {
    timer = null;
    timerDue = Infinity;
    const now = performance.now();
    const due = [];
    jobs.forEach((job) => {
        if (job.cancelled) {
            jobs.delete(job);
            return;
        }
        if (job.due <= now) {
            due.push(job);
        }
    });

    try {
        due.forEach((job) => {
            jobs.delete(job);
            if (!job.cancelled) {
                job.fire(now);
            }
        });
    } finally {
        arm();
    }
};

export const scheduleFlapStepAt = (due, fire) => {
    const job = {
        due: Number(due),
        fire,
        cancelled: false,
        cancel() {
            this.cancelled = true;
            jobs.delete(this);
        }
    };
    jobs.add(job);
    arm();
    return job;
};

export const scheduleFlapStep = (delay, fire) => scheduleFlapStepAt(
    performance.now() + Math.max(0, Number(delay) || 0),
    fire
);

export const nextFlapDeadline = (startedAt, duration) =>
    startedAt + Math.max(1, duration);
