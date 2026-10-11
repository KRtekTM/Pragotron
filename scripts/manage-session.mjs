const TOKEN_PATTERN = /^[A-Za-z0-9-]{16,80}$/;

export const MANAGE_SESSION_LEASE_MS = 150_000;
export const MANAGE_SESSION_RELEASE_GRACE_MS = 5_000;

const cleanToken = (value) => {
    const token = String(value || '').trim();
    return TOKEN_PATTERN.test(token) ? token : '';
};

const cleanEpoch = (value) => {
    const epoch = Number(value);
    if (!Number.isInteger(epoch) || epoch < 1 || epoch > 1_000_000_000) {
        return 0;
    }
    return epoch;
};

const cleanAddress = (value) => {
    const address = String(value || '').trim().slice(0, 64);
    return address || 'neznámá adresa';
};

export const normalizeManageClientAddress = (value) => {
    const text = String(value || '').trim();
    const mapped = text.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    let address = mapped ? mapped[1] : text;
    if (address === '::1') {
        address = '127.0.0.1';
    }
    if (!/^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(address)) {
        return 'neznámá adresa';
    }
    return cleanAddress(address);
};

export const createManageSession = ({
    leaseMs = MANAGE_SESSION_LEASE_MS,
    graceMs = MANAGE_SESSION_RELEASE_GRACE_MS
} = {}) => {
    let holder = null;
    let grace = null;
    let nextEpoch = 1;

    const expire = (now) => {
        if (holder && holder.expiresAt <= now) {
            holder = null;
        }
        if (grace && grace.until <= now) {
            grace = null;
        }
    };

    const rejected = (address) => ({
        status: 409,
        event: 'rejected',
        body: {
            error: 'Manage stránka je již otevřená.',
            address
        }
    });

    const grant = (token, address, now) => {
        const epoch = nextEpoch;
        nextEpoch += 1;
        holder = {
            token,
            epoch,
            address,
            expiresAt: now + leaseMs
        };
        grace = null;
        return {
            status: 200,
            event: 'claimed',
            body: {
                ok: true,
                epoch,
                address
            }
        };
    };

    return {
        claim({ token, address, now = Date.now() } = {}) {
            expire(now);
            const knownToken = cleanToken(token);
            if (!knownToken) {
                return {
                    status: 400,
                    event: 'invalid',
                    body: { error: 'Neplatný klíč relace.' }
                };
            }

            const safeAddress = cleanAddress(address);
            if (holder && holder.token !== knownToken) {
                return rejected(holder.address);
            }
            if (!holder && grace && grace.token !== knownToken) {
                return rejected(grace.address);
            }

            const event = holder ? 'reclaimed' : 'claimed';
            const result = grant(knownToken, safeAddress, now);
            result.event = event;
            return result;
        },

        renew({ token, epoch, now = Date.now() } = {}) {
            expire(now);
            const knownToken = cleanToken(token);
            const knownEpoch = cleanEpoch(epoch);
            if (!knownToken || !knownEpoch) {
                return {
                    status: 400,
                    event: 'invalid',
                    body: { error: 'Neplatný klíč relace.' }
                };
            }

            if (holder
                && holder.token === knownToken
                && holder.epoch === knownEpoch) {
                holder.expiresAt = now + leaseMs;
                return {
                    status: 200,
                    event: 'renewed',
                    body: {
                        ok: true,
                        epoch: holder.epoch,
                        address: holder.address
                    }
                };
            }

            if (holder) {
                return rejected(holder.address);
            }

            return {
                status: 409,
                event: 'expired',
                body: {
                    error: 'Relace správce vypršela.',
                    expired: true
                }
            };
        },

        release({ token, epoch, now = Date.now() } = {}) {
            expire(now);
            const knownToken = cleanToken(token);
            const knownEpoch = cleanEpoch(epoch);
            if (holder
                && holder.token === knownToken
                && holder.epoch === knownEpoch) {
                const address = holder.address;
                grace = {
                    token: knownToken,
                    address,
                    until: now + graceMs
                };
                holder = null;
                return {
                    status: 200,
                    event: 'released',
                    body: { ok: true, address }
                };
            }

            return {
                status: 200,
                event: 'ignored',
                body: { ok: true }
            };
        }
    };
};
