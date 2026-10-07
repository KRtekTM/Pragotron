export const BOARD_TRANSPORT_CHANNEL = 'pragotron.platformTable.channel.v2';
export const BOARD_TRANSPORT_STORAGE_KEY =
    'pragotron.platformTable.transport.v2';

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
        boardId = ''
    } = {}) {
        this.id = createId('client');
        this.boardId = typeof boardId === 'string' ? boardId : '';
        this.storageKey = storageKey;
        this.storage = getStorage(storage);
        this.window = windowRef;
        this.listeners = new Set();
        this.seenMessages = new Set();
        this.channel = null;

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
    }

    remember(messageId) {
        this.seenMessages.add(messageId);
        if (this.seenMessages.size > 500) {
            const oldest = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldest);
        }
    }

    receive(message) {
        if (!message
            || message.version !== 2
            || typeof message.messageId !== 'string'
            || message.source === this.id
            || this.seenMessages.has(message.messageId)) {
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
        this.listeners.forEach((listener) => listener(message));
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

        try {
            this.channel?.postMessage(message);
        } catch {
            // The storage fallback remains available.
        }

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

    close() {
        this.listeners.clear();
        this.window?.removeEventListener('storage', this.storageHandler);
        this.channel?.close();
        this.channel = null;
    }
}
