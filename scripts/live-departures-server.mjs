import dns from 'node:dns';
import { lookup } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';
import http, { createServer } from 'node:http';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    LIVE_POLL_INTERVAL_MS,
    LIVE_SERVER_DEFAULT_PORT,
    LIVE_SERVER_FALLBACK_PORTS,
    LIVE_STATION_DEFAULTS,
    fetchStationTable,
    isAllowedLiveSourceUrl,
    liveCacheTtlMs,
    normalizeLivePollIntervalMs,
    parseLiveSourceUrl
} from '../src/platform/live-departures.js';
import { attachBoardChannel } from './board-channel-server.mjs';

dns.setDefaultResultOrder('ipv4first');

const fetchIpv4 = async (url, options = {}) => {
    const target = new URL(url);
    const { address } = await lookup(target.hostname, { family: 4 });
    const client = target.protocol === 'https:' ? https : http;
    const headers = {
        ...(options.headers || {}),
        Host: target.host
    };

    return new Promise((resolve, reject) => {
        const request = client.request({
            protocol: target.protocol,
            hostname: address,
            servername: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: `${target.pathname}${target.search}`,
            method: options.method || 'GET',
            headers,
            family: 4,
            timeout: 20_000
        }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const body = Buffer.concat(chunks);
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 300,
                    status: response.statusCode,
                    text: async () => body.toString('utf8'),
                    json: async () => JSON.parse(body.toString('utf8'))
                });
            });
        });
        request.on('timeout', () => {
            request.destroy(new Error('Vypršel čas spojení se zdrojovou tabulí.'));
        });
        request.on('error', reject);
        request.end();
    });
};

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requestedPort = Number(process.env.PORT);
const liveCache = new Map();
let listeningPort = Number.isInteger(requestedPort) && requestedPort > 0
    ? requestedPort
    : LIVE_SERVER_DEFAULT_PORT;

const MIME_TYPES = Object.freeze({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
});

const writeJson = (response, status, value) => {
    response.writeHead(status, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify(value));
};

const isAllowedSource = (sourceUrl) => isAllowedLiveSourceUrl(sourceUrl);

const getCachedLiveDepartures = async (sourceUrl, intervalMs) => {
    const ttl = liveCacheTtlMs(intervalMs);
    const cached = liveCache.get(sourceUrl);
    const now = Date.now();
    // Cache musí vypršet dřív než další požadavek manage, jinak by se
    // zdrojová tabule stáhla až ob jeden interval.
    if (cached?.payload && now - (cached.fetchedAt || 0) < ttl) {
        return cached.payload;
    }
    if (cached?.inflight) {
        return cached.inflight;
    }

    const startedAt = Date.now();
    const inflight = fetchStationTable({
        url: sourceUrl,
        fetchImpl: fetchIpv4
    })
        .then((payload) => {
            liveCache.set(sourceUrl, {
                payload,
                fetchedAt: startedAt,
                inflight: null
            });
            return payload;
        })
        .catch((error) => {
            const stale = liveCache.get(sourceUrl);
            liveCache.set(sourceUrl, {
                payload: stale?.payload || null,
                fetchedAt: stale?.fetchedAt || 0,
                inflight: null
            });
            if (stale?.payload) {
                return stale.payload;
            }
            throw error;
        });

    liveCache.set(sourceUrl, {
        payload: cached?.payload || null,
        fetchedAt: cached?.fetchedAt || 0,
        inflight
    });
    return inflight;
};

const serveStaticFile = async (requestPath, response) => {
    const decodedPath = decodeURIComponent(requestPath);
    const relativePath = normalize(
        decodedPath === '/' ? '/platformTableManage.html' : decodedPath
    ).replace(/^[/\\]+/, '');
    const filePath = resolve(projectRoot, relativePath);

    if (!filePath.startsWith(projectRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    try {
        const content = await readFile(filePath);
        response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()]
                || 'application/octet-stream'
        });
        response.end(content);
    } catch {
        response.writeHead(404);
        response.end('Not found');
    }
};

const LISTEN_HOST = process.env.HOST || '0.0.0.0';

const VIRTUAL_INTERFACE = /vEthernet|WSL|Hyper-V|Docker|VirtualBox|VMware|Loopback|Teredo|Bluetooth|Virtual/i;

const lanAddresses = () => {
    const addresses = [];
    Object.entries(networkInterfaces()).forEach(([name, entries]) => {
        if (VIRTUAL_INTERFACE.test(name)) {
            return;
        }
        (entries || []).forEach((entry) => {
            const family = entry.family;
            const isIpv4 = family === 'IPv4' || family === 4;
            if (isIpv4 && !entry.internal && entry.address
                && !entry.address.startsWith('169.254.')) {
                addresses.push(entry.address);
            }
        });
    });
    return [...new Set(addresses)];
};

const listensOnNetwork = LISTEN_HOST === '0.0.0.0'
    || LISTEN_HOST === '::'
    || (LISTEN_HOST !== '127.0.0.1'
        && LISTEN_HOST !== 'localhost'
        && LISTEN_HOST !== '::1');

const server = createServer(async (request, response) => {
    const requestUrl = new URL(
        request.url || '/',
        `http://${request.headers.host || `127.0.0.1:${listeningPort}`}`
    );

    if (request.method === 'OPTIONS') {
        response.writeHead(204, {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Origin': '*'
        });
        response.end();
        return;
    }

    if (request.method !== 'GET') {
        response.writeHead(405, { Allow: 'GET, OPTIONS' });
        response.end('Method not allowed');
        return;
    }

    if (requestUrl.pathname === '/api/live-departures') {
        const requestedSource = requestUrl.searchParams.get('source')
            || LIVE_STATION_DEFAULTS.sourceUrl;
        if (!isAllowedSource(requestedSource)) {
            writeJson(response, 400, {
                error: 'Povolena je pouze tabule Správy železnic ve formátu '
                    + 'StationTable.aspx?Key=…'
            });
            return;
        }

        try {
            const payload = await getCachedLiveDepartures(
                parseLiveSourceUrl(requestedSource).sourceUrl,
                normalizeLivePollIntervalMs(
                    requestUrl.searchParams.get('interval')
                        || LIVE_POLL_INTERVAL_MS
                )
            );
            writeJson(response, 200, payload);
        } catch (error) {
            writeJson(response, 502, {
                error: error instanceof Error
                    ? error.message
                    : 'Zdrojovou tabuli se nepodařilo načíst.'
            });
        }
        return;
    }

    await serveStaticFile(requestUrl.pathname, response);
});

attachBoardChannel(server);

const portsToTry = Number.isInteger(requestedPort) && requestedPort > 0
    ? [requestedPort]
    : [...LIVE_SERVER_FALLBACK_PORTS];

const listenOnPort = (port) => new Promise((resolve, reject) => {
    const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
    };
    const onListening = () => {
        server.off('error', onError);
        resolve(port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, LISTEN_HOST);
});

const startServer = async () => {
    let lastError = null;

    for (const port of portsToTry) {
        try {
            listeningPort = await listenOnPort(port);
            const localBase = listensOnNetwork
                && LISTEN_HOST !== '0.0.0.0'
                && LISTEN_HOST !== '::'
                ? `http://${LISTEN_HOST}:${listeningPort}`
                : `http://127.0.0.1:${listeningPort}`;
            console.log(`Pragotron server běží na ${localBase}/`);
            console.log(
                `Manage stránka: ${localBase}/platformTableManage.html`
            );
            console.log(
                `Odjezdová tabule: ${localBase}/departureBoard.html`
            );
            console.log(
                'Nástupištní tabule: '
                + `${localBase}/platformTable.html?platform=1&track=6a`
            );
            if (localBase.startsWith('http://127.0.0.1:')) {
                console.log(
                    'Otevírejte 127.0.0.1, ne localhost — na Windows to jinak končí ERR_NO_BUFFER_SPACE.'
                );
            }
            if (listensOnNetwork) {
                const addresses = LISTEN_HOST === '0.0.0.0' || LISTEN_HOST === '::'
                    ? lanAddresses()
                    : [LISTEN_HOST];
                addresses.forEach((address) => {
                    console.log(
                        `Síť: http://${address}:${listeningPort}/platformTableManage.html`
                    );
                });
                console.log(
                    'Tabule z jiného počítače otevřete na stejné adrese serveru. '
                    + 'Identita nástupiště, koleje a sektoru se zadává stejně jako lokálně.'
                );
                console.log(
                    'Jen pro tento počítač spusťte server s HOST=127.0.0.1.'
                );
            }
            return;
        } catch (error) {
            lastError = error;
            if (error?.code !== 'EACCES' && error?.code !== 'EADDRINUSE') {
                throw error;
            }
            console.warn(
                `Port ${port} na ${LISTEN_HOST} nelze použít (${error.code}).`
            );
        }
    }

    const tried = portsToTry.join(', ');
    throw new Error(
        `Nepodařilo se spustit server na portech ${tried}. `
        + `Nastavte volný port přes PORT, například PORT=5174 npm run serve. `
        + (lastError instanceof Error ? lastError.message : '')
    );
};

const shutdown = () => {
    server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
