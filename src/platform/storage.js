export class LocalStorageAdapter {
    constructor(key, storage) {
        this.key = key;
        if (storage !== undefined) {
            this.storage = storage;
            return;
        }

        try {
            this.storage = window.localStorage;
        } catch {
            this.storage = null;
        }
    }

    load() {
        if (!this.storage) {
            return null;
        }

        try {
            const raw = this.storage.getItem(this.key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    save(value) {
        if (!this.storage) {
            return;
        }

        try {
            this.storage.setItem(this.key, JSON.stringify(value));
        } catch {
            // localStorage can be unavailable in private/restricted contexts.
        }
    }

    clear() {
        if (!this.storage) {
            return;
        }

        try {
            this.storage.removeItem(this.key);
        } catch {
            // Ignore unavailable storage.
        }
    }
}
