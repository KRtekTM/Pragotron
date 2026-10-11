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
    LIVE_SCRAPER_SCHEMA,
    LIVE_STATION_DEFAULTS,
    SCRAPER_IDLE_ERROR,
    fetchStationTable,
    normalizeLivePollIntervalMs,
    normalizeScraperSchema,
    isAllowedLiveSourceUrl,
    liveCacheTtlMs,
    parseLiveSourceUrl
} from '../src/platform/live-departures.js';
import { attachBoardChannel } from './board-channel-server.mjs';

dns.setDefaultResultOrder('ipv4first');

const ipv4Agents = {
    'http:': new http.Agent({
        keepAlive: true,
        maxSockets: 2,
        family: 4
    }),
    'https:': new https.Agent({
        keepAlive: true,
        maxSockets: 2,
        family: 4
    })
};
const ipv4AddressCache = new Map();

const resolveIpv4 = async (hostname) => {
    const cached = ipv4AddressCache.get(hostname);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
        return cached.address;
    }

    const { address } = await lookup(hostname, { family: 4 });
    ipv4AddressCache.set(hostname, {
        address,
        at: Date.now()
    });
    return address;
};

const fetchIpv4 = async (url, options = {}) => {
    const target = new URL(url);
    const address = await resolveIpv4(target.hostname);
    const client = target.protocol === 'https:' ? https : http;
    const headers = {
        ...(options.headers || {}),
        Host: target.host
    };

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (handler, value) => {
            if (settled) {
                return;
            }
            settled = true;
            handler(value);
        };
        const request = client.request({
            protocol: target.protocol,
            hostname: address,
            servername: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: `${target.pathname}${target.search}`,
            method: options.method || 'GET',
            headers,
            agent: ipv4Agents[target.protocol] || ipv4Agents['https:'],
            family: 4,
            timeout: 20_000
        }, (response) => {
            const chunks = [];
            response.on('error', (error) => {
                response.destroy();
                finish(reject, error);
            });
            response.on('aborted', () => {
                response.destroy();
                finish(reject, new Error(
                    'Spojení se zdrojovou tabulí bylo přerušeno.'
                ));
            });
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const body = Buffer.concat(chunks);
                finish(resolve, {
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
        request.on('error', (error) => finish(reject, error));
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

const scrapeLabel = (sourceUrl) => {
    const source = parseLiveSourceUrl(sourceUrl);
    return source.key ? `Key ${source.key}` : sourceUrl;
};

const logScrape = (message) => {
    const time = new Date().toLocaleTimeString('cs-CZ', { hour12: false });
    console.log(`[${time}] ${message}`);
};

let scrapeWatch = null;

const watchLeaseMs = (intervalMs) => Math.max(intervalMs * 2, 70_000);

const stopScrapeWatch = (reason) => {
    if (!scrapeWatch) {
        return;
    }
    if (scrapeWatch.timer) {
        clearTimeout(scrapeWatch.timer);
    }
    const label = scrapeLabel(scrapeWatch.sourceUrl);
    scrapeWatch = null;
    logScrape(
        `Scrape ${label}: sledování zastaveno${reason ? ` (${reason})` : ''}.`
    );
};

const scheduleScrapeWatch = () => {
    if (!scrapeWatch) {
        return;
    }
    if (scrapeWatch.timer) {
        clearTimeout(scrapeWatch.timer);
    }
    const current = scrapeWatch;
    current.timer = setTimeout(async () => {
        if (scrapeWatch !== current) {
            return;
        }
        if (Date.now() > current.expiresAt) {
            stopScrapeWatch('vypršelo');
            return;
        }
        try {
            await getCachedLiveDepartures(current.sourceUrl, current.intervalMs);
        } catch {
            // The scrape log already describes the failure.
        }
        if (scrapeWatch === current) {
            scheduleScrapeWatch();
        }
    }, current.intervalMs);
};

const armScrapeWatch = async ({ sourceUrl, intervalMs, clientId }) => {
    const same = scrapeWatch
        && scrapeWatch.sourceUrl === sourceUrl
        && scrapeWatch.intervalMs === intervalMs;
    if (same) {
        scrapeWatch.expiresAt = Date.now() + watchLeaseMs(intervalMs);
        if (clientId) {
            scrapeWatch.clientId = clientId;
        }
        return liveCache.get(sourceUrl)?.payload || null;
    }

    if (scrapeWatch?.timer) {
        clearTimeout(scrapeWatch.timer);
    }
    scrapeWatch = {
        sourceUrl,
        intervalMs,
        clientId: clientId || '',
        expiresAt: Date.now() + watchLeaseMs(intervalMs),
        timer: null
    };
    logScrape(
        `Scrape ${scrapeLabel(sourceUrl)}: sledování spuštěno, `
        + `interval ${Math.round(intervalMs / 1000)} s`
    );
    scheduleScrapeWatch();
    return getCachedLiveDepartures(sourceUrl, intervalMs);
};

const readRequestJson = async (request) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 16_384) {
            throw new Error('Příliš velké tělo požadavku.');
        }
        chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!text) {
        return {};
    }
    return JSON.parse(text);
};

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
    const label = scrapeLabel(sourceUrl);
    logScrape(`Scrape ${label}: stahuji zdrojovou tabuli`);
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
            const count = Array.isArray(payload?.departures)
                ? payload.departures.length
                : 0;
            const station = payload?.station || label;
            logScrape(
                `Scrape ${station}: ${count} odjezdů za ${Date.now() - startedAt} ms`
            );
            return payload;
        })
        .catch((error) => {
            const stale = liveCache.get(sourceUrl);
            liveCache.set(sourceUrl, {
                payload: stale?.payload || null,
                fetchedAt: stale?.fetchedAt || 0,
                inflight: null
            });
            const message = error instanceof Error
                ? error.message
                : 'stažení selhalo';
            logScrape(
                stale?.payload
                    ? `Scrape ${label}: ${message} Zůstává předchozí stažení.`
                    : `Scrape ${label}: ${message}`
            );
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
        const extension = extname(filePath).toLowerCase();
        const revalidate = extension === '.html'
            || extension === '.js'
            || extension === '.mjs'
            || extension === '.css';
        response.writeHead(200, {
            'Cache-Control': revalidate
                ? 'no-cache'
                : 'public, max-age=3600',
            'Content-Type': MIME_TYPES[extension] || 'application/octet-stream'
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
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Origin': '*'
        });
        response.end();
        return;
    }

    if (requestUrl.pathname === '/api/live-departures/schema'
        && request.method === 'GET') {
        writeJson(response, 200, normalizeScraperSchema(LIVE_SCRAPER_SCHEMA));
        return;
    }

    if (requestUrl.pathname === '/api/live-departures/watch'
        && request.method === 'POST') {
        try {
            const body = await readRequestJson(request);
            const parsed = parseLiveSourceUrl(body.source || '');
            if (body.source && !parsed.valid) {
                writeJson(response, 400, {
                    error: 'Povolena je pouze tabule Správy železnic ve formátu '
                        + 'StationTable.aspx?Key=…'
                });
                return;
            }
            const payload = await armScrapeWatch({
                sourceUrl: parsed.sourceUrl,
                intervalMs: normalizeLivePollIntervalMs(body.interval),
                clientId: String(body.client || '').trim().slice(0, 80)
            });
            writeJson(response, 200, payload || {
                watching: true,
                departures: []
            });
        } catch (error) {
            writeJson(response, 502, {
                error: error instanceof Error
                    ? error.message
                    : 'Sledování se nepodařilo spustit.'
            });
        }
        return;
    }

    if (requestUrl.pathname === '/api/live-departures/stop'
        && request.method === 'POST') {
        try {
            const body = await readRequestJson(request);
            const clientId = String(body.client || '').trim();
            if (scrapeWatch
                && clientId
                && scrapeWatch.clientId
                && scrapeWatch.clientId !== clientId) {
                writeJson(response, 200, { watching: true });
                return;
            }
            stopScrapeWatch('požadavek');
            writeJson(response, 200, { watching: false });
        } catch (error) {
            writeJson(response, 400, {
                error: error instanceof Error
                    ? error.message
                    : 'Sledování se nepodařilo zastavit.'
            });
        }
        return;
    }

    if (request.method !== 'GET') {
        response.writeHead(405, { Allow: 'GET, POST, OPTIONS' });
        response.end('Method not allowed');
        return;
    }

    if (requestUrl.pathname === '/api/live-departures') {
        if (!scrapeWatch || Date.now() > scrapeWatch.expiresAt) {
            if (scrapeWatch) {
                stopScrapeWatch('vypršelo');
            }
            writeJson(response, 409, { error: SCRAPER_IDLE_ERROR });
            return;
        }

        const requestedSource = requestUrl.searchParams.get('source') || '';
        const parsed = parseLiveSourceUrl(
            requestedSource || scrapeWatch.sourceUrl
        );
        if (requestedSource && !parsed.valid) {
            writeJson(response, 400, {
                error: 'Povolena je pouze tabule Správy železnic ve formátu '
                    + 'StationTable.aspx?Key=…'
            });
            return;
        }
        if (parsed.sourceUrl !== scrapeWatch.sourceUrl) {
            writeJson(response, 409, {
                error: 'Scraper sleduje jinou tabuli.'
            });
            return;
        }

        scrapeWatch.expiresAt = Date.now() + watchLeaseMs(scrapeWatch.intervalMs);
        const cached = liveCache.get(scrapeWatch.sourceUrl);
        try {
            if (cached?.inflight) {
                writeJson(response, 200, await cached.inflight);
                return;
            }
            if (cached?.payload) {
                writeJson(response, 200, cached.payload);
                return;
            }
            writeJson(response, 200, await getCachedLiveDepartures(
                scrapeWatch.sourceUrl,
                scrapeWatch.intervalMs
            ));
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
server.headersTimeout = 66_000;
server.keepAliveTimeout = 65_000;

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

// Textový nápis podle images/tabule/pragotronNapis2.svg.
const PRAGOTRON_LOGO = [
    '  ████      ████        █       ████      ████     █████     ████       ████     █   █  ',
    '  █   █     █   █      ███     ██   █    ██  ██      █       █   █     ██  ██    ██  █  ',
    '  █   █     █   █      █ █     █         █    █      █       █   █     █    █    ███ █  ',
    '  ████      ████      █   █    █  ███    █    █      █       ████      █    █    █ █ █  ',
    '  █         █   █     █████    █    █    █    █      █       █   █     █    █    █  ██  ',
    '  █         █   █    ██   ██   ██   █    ██  ██      █       █   █     ██  ██    █  ██  ',
    '  █         █   █    ██   ██    ████      ████       █       █   █      ████     █   █  '
];

const textWidth = (value) => [...String(value)].length;

const ansi = (code) => (process.stdout.isTTY ? `\u001b[${code}m` : '');

const paint = (code, value) => `${ansi(code)}${value}${ansi('0')}`;

const printStartupBanner = ({ localBase, addresses, network }) => {
    const entries = [
        ['Server', `${localBase}/`],
        ['Manage', `${localBase}/platformTableManage.html`],
        ['Odjezdová', `${localBase}/departureBoard.html`],
        ['Nástupištní', `${localBase}/platformTable.html?platform=1&track=6a`]
    ];
    const notes = [];
    if (network) {
        addresses.forEach((address) => {
            notes.push(
                `Síť  http://${address}:${listeningPort}/platformTableManage.html`
            );
        });
        notes.push('Tabule z jiného počítače otevřete na adrese serveru.');
        notes.push('Nástupiště, kolej a sektor se zadávají v URL stejně jako lokálně.');
        notes.push('Jen tento počítač: HOST=127.0.0.1 npm run serve');
    }

    const labelWidth = Math.max(...entries.map(([label]) => textWidth(label)));
    const rows = entries.map(([label, value]) => ({
        text: `${label.padEnd(labelWidth, ' ')}  ${value}`,
        label,
        value
    }));
    const inner = Math.max(
        56,
        ...PRAGOTRON_LOGO.map((line) => textWidth(line)),
        ...rows.map((row) => textWidth(row.text)),
        ...notes.map((note) => textWidth(note))
    );
    const rule = (left, fill, right) => `${left}${fill.repeat(inner + 2)}${right}`;
    const padLine = (text) => text.padEnd(inner, ' ');
    const frameLine = (text) => `${paint('2', '│')} ${text} ${paint('2', '│')}`;
    const logoWidth = Math.max(...PRAGOTRON_LOGO.map((line) => textWidth(line)));
    const logoPad = 2 + Math.max(0, Math.floor((inner - logoWidth) / 2));

    console.log('');
    PRAGOTRON_LOGO.forEach((line) => {
        const centered = `${' '.repeat(logoPad)}${line.padEnd(logoWidth, ' ')}`;
        console.log(paint('1', centered));
    });
    console.log('');
    console.log(paint('2', rule('┌', '─', '┐')));
    rows.forEach((row) => {
        const label = paint('2', row.label.padEnd(labelWidth, ' '));
        const gap = '  ';
        const valueWidth = inner - labelWidth - gap.length;
        const value = `${paint('36', row.value)}${' '.repeat(Math.max(0, valueWidth - textWidth(row.value)))}`;
        console.log(frameLine(`${label}${gap}${value}`));
    });
    if (notes.length > 0) {
        console.log(paint('2', rule('├', '─', '┤')));
        notes.forEach((note) => {
            console.log(frameLine(paint('2', padLine(note))));
        });
    }
    console.log(paint('2', rule('└', '─', '┘')));
    console.log('');
};

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
            const addresses = LISTEN_HOST === '0.0.0.0' || LISTEN_HOST === '::'
                ? lanAddresses()
                : [LISTEN_HOST];
            printStartupBanner({
                localBase,
                addresses,
                network: listensOnNetwork
            });
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
