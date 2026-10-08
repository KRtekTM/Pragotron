export const applyFlipTiming = (element, duration) => {
    element.style.setProperty('--flap-half-duration', `${duration / 2}ms`);
};

export const clearFlipTiming = (element) => {
    element.style.removeProperty('--flap-half-duration');
};

export const nowMs = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

const pendingFlipStarts = new Set();
const pendingFlipAudio = new Set();
let flipStartFrame = 0;

const dueFlipCallbacks = [];
let dueFlipFrame = 0;
let flipHandleId = 0;
const flipHandles = new Map();

const flushFlipStarts = () => {
    flipStartFrame = 0;
    pendingFlipStarts.forEach((element) => {
        element.classList.add('is-flipping');
    });
    pendingFlipStarts.clear();
    pendingFlipAudio.forEach((audio) => {
        audio.play?.();
    });
    pendingFlipAudio.clear();
};

const scheduleFlushFlipStarts = () => {
    if (flipStartFrame) {
        return;
    }

    if (typeof window.requestAnimationFrame === 'function') {
        flipStartFrame = window.requestAnimationFrame(flushFlipStarts);
        return;
    }

    flipStartFrame = window.setTimeout(flushFlipStarts, 0);
};

export const startFlip = (element, duration, audio) => {
    applyFlipTiming(element, duration);
    element.classList.remove('is-flipping');
    pendingFlipStarts.add(element);
    if (audio) {
        pendingFlipAudio.add(audio);
    }

    scheduleFlushFlipStarts();
};

const runDueFlipCallbacks = () => {
    dueFlipFrame = 0;
    if (!dueFlipCallbacks.length) {
        return;
    }

    const batch = dueFlipCallbacks.splice(0);
    for (let index = 0; index < batch.length; index += 1) {
        const entry = batch[index];
        if (!entry.cancelled) {
            entry.callback();
        }
    }
};

const queueDueFlipCallback = (entry) => {
    dueFlipCallbacks.push(entry);
    if (dueFlipFrame) {
        return;
    }

    if (typeof window.requestAnimationFrame === 'function') {
        dueFlipFrame = window.requestAnimationFrame(runDueFlipCallbacks);
        return;
    }

    dueFlipFrame = window.setTimeout(runDueFlipCallbacks, 0);
};

export const scheduleFlipDone = (callback, duration) => {
    const delay = Math.max(16, Math.round(duration));
    const id = (flipHandleId += 1);
    const entry = {
        id,
        callback,
        cancelled: false
    };
    const token = { id };
    const timer = window.setTimeout(() => {
        const handle = flipHandles.get(id);
        if (handle) {
            flipHandles.delete(id);
        }

        if (entry.cancelled) {
            return;
        }

        queueDueFlipCallback(entry);
    }, delay);

    flipHandles.set(id, { entry, timer });
    return token;
};

export const cancelFlipDone = (token) => {
    if (token == null) {
        return;
    }

    if (typeof token !== 'object' || typeof token.id !== 'number') {
        window.clearTimeout(token);
        return;
    }

    const handle = flipHandles.get(token.id);
    if (!handle) {
        return;
    }

    handle.entry.cancelled = true;
    flipHandles.delete(token.id);
    window.clearTimeout(handle.timer);
};

export const setNodeText = (node, value) => {
    if (!node) {
        return;
    }

    const text = value == null ? '' : String(value);
    if (node.textContent !== text) {
        node.textContent = text;
    }
};
