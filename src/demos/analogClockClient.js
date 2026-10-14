import {
    BoardTransport,
    createSlaveClock,
    hasSourceClock,
    setSourceClock,
    sourceNow,
    sourcePace
} from '../platform/index.js';

const page = /analogClockRound\.html$/i.test(window.location.pathname)
    ? 'analogClockRound'
    : 'analogClock';
const slaveClock = createSlaveClock({
    hasSourceClock,
    sourceNow,
    sourcePace
});

document.title = page === 'analogClockRound'
    ? 'Kulaté hodiny – PRAGOTRON'
    : 'Analogové hodiny – PRAGOTRON';

const attachSlaveClock = () => {
    const element = document.querySelector('#pragotronAnalogClock');
    if (!element || typeof element.redraw !== 'function') {
        window.requestAnimationFrame(attachSlaveClock);
        return;
    }

    element.now = () => slaveClock.now();
};

attachSlaveClock();

const transport = new BoardTransport();
const userAgent = String(globalThis.navigator?.userAgent || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 400);

const presence = () => ({
    page,
    boardId: page,
    instanceId: transport.id,
    identity: {
        platform: '',
        track: '',
        sector: ''
    },
    configured: true,
    capabilities: [],
    userAgent
});

const publishReady = () => {
    transport.publish('board:ready', presence());
};

const publishHeartbeat = () => {
    transport.publish('board:heartbeat', presence());
};

const applyClockMessage = (message) => {
    const payload = message?.payload;
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'clock')) {
        return;
    }

    setSourceClock(payload.clock);
};

transport.subscribe((message) => {
    if (message.type === 'manage:hello' || message.type === 'manage:discover') {
        publishReady();
        return;
    }

    if (message.type === 'manage:clock'
        || message.type === 'manage:departures') {
        applyClockMessage(message);
    }
});

publishReady();
window.setInterval(publishHeartbeat, 4000);
