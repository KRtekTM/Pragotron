export const BOARD_TRANSPORT_CHANNEL = 'pragotron.platformTable.channel.v2';
export const BOARD_TRANSPORT_STORAGE_KEY =
    'pragotron.platformTable.transport.v2';
const BOARD_HUB_STORAGE_KEY = 'pragotron.boardHub.v1';

const normalizeRelayAddress = (value) => {
    const text = String(value || '').trim();
    const mapped = text.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    const address = mapped ? mapped[1] : text;
    if (!address || address.length > 64) {
        return '';
    }
    if (!/^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(address)) {
        return '';
    }
    return address;
};

const hubToChannelUrl = (hub, base) => {
    const url = new URL(hub, base);
    if (url.protocol === 'https:' || url.protocol === 'wss:') {
        url.protocol = 'wss:';
    } else if (url.protocol === 'http:' || url.protocol === 'ws:') {
        url.protocol = 'ws:';
    } else {
        return '';
    }

    url.username = '';
    url.password = '';
    url.pathname = '/api/board-channel';
    url.search = '';
    url.hash = '';
    return url.toString();
};

export const resolveBoardChannelUrl = (location = globalThis.location) => {
    if (!location || typeof location.protocol !== 'string') {
        return '';
    }

    const hubQuery = new URLSearchParams(location.search || '')
        .get('hub')
        ?.trim() || '';
    if (hubQuery) {
        try {
            globalThis.sessionStorage?.setItem(BOARD_HUB_STORAGE_KEY, hubQuery);
        } catch {
            // The explicit hub in this address is still enough.
        }
        try {
            return hubToChannelUrl(hubQuery, location.href || 'http://127.0.0.1');
        } catch {
            return '';
        }
    }

    if (location.protocol === 'http:' || location.protocol === 'https:') {
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${location.host}/api/board-channel`;
    }

    let storedHub = '';
    try {
        storedHub = globalThis.sessionStorage?.getItem(BOARD_HUB_STORAGE_KEY) || '';
    } catch {
        storedHub = '';
    }
    if (!storedHub) {
        return '';
    }

    try {
        return hubToChannelUrl(storedHub, 'http://127.0.0.1');
    } catch {
        return '';
    }
};

const createId = (prefix) => {
    const random = globalThis.crypto?.randomUUID?.();
    return `${prefix}-${random || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
};

const getStorage = (storage) => {
    if (storage !== undefined) {
        return storage;
    }

    try {
        return globalThis.window?.localStorage || null;
    } catch {
        return null;
    }
};

export class BoardTransport {
    constructor({
        channelName = BOARD_TRANSPORT_CHANNEL,
        storageKey = BOARD_TRANSPORT_STORAGE_KEY,
        storage,
        windowRef = globalThis.window,
        boardId = '',
        onLog = null
    } = {}) {
        this.id = createId('client');
        this.boardId = typeof boardId === 'string' ? boardId : '';
        this.onLog = typeof onLog === 'function' ? onLog : null;
        this.storageKey = storageKey;
        this.storage = getStorage(storage);
        this.window = windowRef;
        this.listeners = new Set();
        this.seenMessages = new Set();
        this.channel = null;
        this.socket = null;
        this.socketUrl = '';
        this.socketRetryMs = 1000;
        this.socketTimer = null;
        this.pendingSocketMessages = [];
        this.localPeers = new Map();
        this.deliveryListeners = new Set();
        this.closed = false;

        const BroadcastChannelConstructor =
            this.window?.BroadcastChannel || globalThis.BroadcastChannel;
        if (typeof BroadcastChannelConstructor === 'function') {
            try {
                this.channel = new BroadcastChannelConstructor(channelName);
                this.channel.addEventListener('message', (event) =>
                    this.receive(event.data)
                );
            } catch {
                // Some browsers expose BroadcastChannel but reject it for
                // file:// or restricted documents; use storage fallback.
                this.channel = null;
            }
        }

        this.storageHandler = (event) => {
            if (event.key !== this.storageKey || !event.newValue) {
                return;
            }

            try {
                this.receive(JSON.parse(event.newValue));
            } catch {
                // Ignore malformed transport messages.
            }
        };
        this.window?.addEventListener('storage', this.storageHandler);
        this.connectSocket();
    }

    connectSocket() {
        this.socketUrl = resolveBoardChannelUrl();
        if (!this.socketUrl || typeof WebSocket !== 'function' || this.closed) {
            return;
        }

        const socket = new WebSocket(this.socketUrl);
        this.socket = socket;
        socket.addEventListener('open', () => {
            if (this.socket !== socket) {
                return;
            }

            this.socketRetryMs = 1000;
            this.logExchange('spojení navázáno', {
                url: this.socketUrl
            });
            const queued = this.pendingSocketMessages.splice(0);
            queued.forEach((text) => {
                try {
                    socket.send(text);
                } catch {
                    this.pendingSocketMessages.push(text);
                }
            });
        });
        socket.addEventListener('message', (event) => {
            if (this.socket !== socket || typeof event.data !== 'string') {
                return;
            }

            try {
                const parsed = JSON.parse(event.data);
                const relay = parsed
                    && typeof parsed === 'object'
                    && !Array.isArray(parsed)
                    ? parsed.relay
                    : null;
                if (parsed && typeof parsed === 'object') {
                    delete parsed.relay;
                }
                this.receive(parsed, {
                    channel: 'network',
                    network: normalizeRelayAddress(relay?.localAddress),
                    client: normalizeRelayAddress(relay?.remoteAddress)
                });
            } catch {
                // Ignore malformed network messages.
            }
        });
        const scheduleReconnect = () => {
            if (this.closed || this.socket !== socket) {
                return;
            }

            this.socket = null;
            const delay = this.socketRetryMs;
            this.socketRetryMs = Math.min(delay * 2, 15000);
            this.logExchange('spojení uzavřeno', {
                url: this.socketUrl,
                dalšíPokusZaMs: delay
            });
            this.socketTimer = this.window?.setTimeout?.(() => {
                this.socketTimer = null;
                this.connectSocket();
            }, delay) ?? null;
        };
        socket.addEventListener('close', scheduleReconnect);
        socket.addEventListener('error', () => {
            socket.close();
        });
    }

    sendToSocket(message) {
        if (!this.socketUrl) {
            return;
        }

        const text = JSON.stringify(message);
        const socketOpen = typeof WebSocket === 'function' ? WebSocket.OPEN : 1;
        if (this.socket?.readyState === socketOpen) {
            try {
                this.socket.send(text);
                return;
            } catch {
                // Queue the message until the channel reconnects.
            }
        }

        this.pendingSocketMessages.push(text);
        if (this.pendingSocketMessages.length > 50) {
            this.pendingSocketMessages.shift();
        }
    }

    remember(messageId) {
        this.seenMessages.add(messageId);
        if (this.seenMessages.size > 500) {
            const oldest = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldest);
        }
    }

    noteLocalPeer(source) {
        const now = Date.now();
        this.localPeers.set(source, now);
        this.localPeers.forEach((seenAt, peer) => {
            if (now - seenAt > 12000) {
                this.localPeers.delete(peer);
            }
        });
    }

    isLocalPeer(source) {
        const seenAt = this.localPeers.get(source);
        return typeof seenAt === 'number' && Date.now() - seenAt <= 12000;
    }

    deliveryFor(source, route) {
        if (route?.channel !== 'network' || this.isLocalPeer(source)) {
            return { channel: 'local' };
        }

        return {
            channel: 'network',
            network: route.network || '',
            client: route.client || ''
        };
    }

    receive(message, route = { channel: 'local' }) {
        if (!message
            || message.version !== 2
            || typeof message.messageId !== 'string'
            || message.source === this.id) {
            return;
        }

        if (route.channel !== 'network') {
            this.noteLocalPeer(message.source);
        }
        const delivery = this.deliveryFor(message.source, route);
        if (this.seenMessages.has(message.messageId)) {
            if (route.channel !== 'network') {
                this.deliveryListeners.forEach((listener) => {
                    listener(message.source, delivery);
                });
            }
            return;
        }

        if (message.target?.source && message.target.source !== this.id) {
            return;
        }

        if (message.target?.boardId
            && message.target.boardId !== this.boardId) {
            return;
        }

        this.remember(message.messageId);
        const delivered = {
            ...message,
            delivery
        };
        delete delivered.relay;
        this.logExchange('přijato', {
            typ: delivered.type,
            od: delivered.source,
            komu: delivered.target?.source
                || delivered.target?.boardId
                || 'tato tabule',
            kanál: delivery.channel === 'network'
                ? `síť ${delivery.network || '—'}${
                    delivery.client ? `, počítač ${delivery.client}` : ''
                }`
                : 'lokálně',
            requestId: delivered.requestId,
            data: delivered.payload
        });
        this.listeners.forEach((listener) => listener(delivered));
    }

    logExchange(direction, details) {
        const now = new Date();
        const stamp = `${now.toLocaleTimeString('cs-CZ', { hour12: false })}.${
            String(now.getMilliseconds()).padStart(3, '0')
        }`;
        const line = `[pragotron] ${stamp} ${direction}`;
        console.info(line, details);
        if (this.onLog) {
            try {
                this.onLog(line, details);
            } catch {
                // The on-page log must not interrupt message delivery.
            }
        }
    }

    publish(type, payload = {}, requestIdOrOptions) {
        const options = requestIdOrOptions
            && typeof requestIdOrOptions === 'object'
            ? requestIdOrOptions
            : { requestId: requestIdOrOptions };
        const requestId = options.requestId || createId('request');
        const message = {
            version: 2,
            messageId: createId('message'),
            requestId,
            source: this.id,
            type,
            payload,
            sentAt: Date.now()
        };
        if (options.target) {
            message.target = {
                ...options.target
            };
        }
        this.remember(message.messageId);
        this.logExchange('odesláno', {
            typ: type,
            od: this.id,
            komu: message.target?.source
                || message.target?.boardId
                || 'všichni',
            requestId,
            data: payload
        });

        try {
            this.channel?.postMessage(message);
        } catch {
            // The storage fallback remains available.
        }

        this.sendToSocket(message);

        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(message));
        } catch {
            // Storage may be unavailable or full.
        }

        return requestId;
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener transportu musí být funkce.');
        }

        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    subscribeDelivery(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener transportu musí být funkce.');
        }

        this.deliveryListeners.add(listener);
        return () => this.deliveryListeners.delete(listener);
    }

    close() {
        this.closed = true;
        this.listeners.clear();
        this.deliveryListeners.clear();
        this.localPeers.clear();
        this.pendingSocketMessages = [];
        if (this.socketTimer !== null) {
            this.window?.clearTimeout?.(this.socketTimer);
            this.socketTimer = null;
        }
        this.window?.removeEventListener('storage', this.storageHandler);
        this.channel?.close();
        this.channel = null;
        this.socket?.close();
        this.socket = null;
    }
}
