import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(EXTENSION_DIR, "config.json");
const DEFAULT_REFRESH_MS = 30000;
const LENS_STATES = ["off", "on", "blink"];

const SCRAPER_STATE_KEY = "railwayDepartures.scraperState";
const CACHE_KEY = "railwayDepartures.cache";

const HTML_ENTITIES = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
});

const decodeHtml = (value) => String(value ?? "")
    .replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (entity, reference) => {
            const normalized = reference.toLowerCase();
            if (normalized.startsWith("#x")) {
                return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
            }
            if (normalized.startsWith("#")) {
                return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
            }
            return HTML_ENTITIES[normalized] || entity;
        }
    );

const cleanText = (value) => decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:div|p|li|span|td|th)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCells = (rowHtml) => [
    ...String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)
].map((match) => match[1]);

const extractDivTexts = (cellHtml) => [
    ...String(cellHtml).matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi)
]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseClock = (value) => {
    const text = cleanText(value);
    const match = text.match(CLOCK_PATTERN);
    return match
        ? { hours: Number(match[1]), minutes: Number(match[2]) }
        : null;
};

const clockToMinutes = (time) => time.hours * 60 + time.minutes;

const calculateDelay = (scheduled, actual) => {
    if (!actual) return 0;
    let delay = clockToMinutes(actual) - clockToMinutes(scheduled);
    if (delay < 0) delay += 24 * 60;
    return delay > 12 * 60 ? 0 : delay;
};

const isTrainTypeBoundary = (value, index) =>
    index >= value.length
    || /\s/.test(value[index])
    || /\d/.test(value[index]);

const SOURCE_TRAIN_TYPES = Object.freeze([
    "Mim. Os", "Mim. R", "ČEDOK", "Eurocity", "Intercity", "SuperCity",
    "NightJet", "Nightjet", "Ex lôžk.", "Ex miest.", "EuroNight",
    "railjet", "Railjet", "regiojet", "RegioJet", "Ex", "rj", "RJ",
    "EC", "IC", "EN", "NJ", "nj", "SC", "sc", "Os", "Sp", "R miest.",
    "ROH", "R"
]);

const profileTrainLabels = () => SOURCE_TRAIN_TYPES;

const resolveProfileTrainType = (sourceType, operator) => {
    const op = String(operator ?? "").toLocaleLowerCase("cs-CZ");
    const st = String(sourceType ?? "").trim();
    if (/^rj$/i.test(st)) {
        if (op.includes("regiojet")) return "RegioJet";
        if (op.includes("čd") || op.includes("ceske drahy")) return "Railjet";
        return st;
    }
    return st;
};

const findSourceTrainType = (value) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    const lower = normalized.toLocaleLowerCase("cs-CZ");
    let matchedLength = 0;
    const candidates = [...profileTrainLabels(), ...SOURCE_TRAIN_TYPES];
    candidates.forEach((candidate) => {
        const candidateLower = candidate.toLocaleLowerCase("cs-CZ");
        if (
            lower.startsWith(candidateLower)
            && isTrainTypeBoundary(normalized, candidateLower.length)
            && candidateLower.length > matchedLength
        ) {
            matchedLength = candidateLower.length;
        }
    });
    return matchedLength ? normalized.slice(0, matchedLength) : "";
};

const splitTrainPrimary = (value) => {
    const text = String(value ?? "").trim();
    const match = text.match(/^(.*?)(?:\s*)(\d+)([\s\S]*)$/);
    if (!match) return { prefix: text, remainder: "" };
    return {
        prefix: match[1].trim(),
        remainder: `${match[2]}${match[3]}`.trim()
    };
};

const parseTrainCell = (cellHtml) => {
    const divTexts = extractDivTexts(cellHtml);
    const primary = divTexts[0] || cleanText(cellHtml);
    const split = splitTrainPrimary(primary);
    const listedType = findSourceTrainType(primary) || findSourceTrainType(split.prefix);
    const sourceType = listedType || split.prefix;
    const remainder = listedType
        ? primary.slice(listedType.length).trim()
        : split.remainder || primary.slice(sourceType.length).trim();
    const numberMatch = remainder.match(/\d+/);
    const sourceTrainNumber = numberMatch ? numberMatch[0] : "";
    const trainNumber = sourceTrainNumber.slice(-4);
    const operatorFromRemainder = numberMatch
        ? remainder.slice(remainder.indexOf(numberMatch[0]) + numberMatch[0].length).trim()
        : remainder.trim();
    const operator = divTexts.slice(1).join(" ").trim() || operatorFromRemainder;
    return {
        train: resolveProfileTrainType(sourceType, operator),
        trainNumber,
        sourceTrainNumber,
        operator
    };
};

const parsePlatformTarget = (cellHtml) => {
    const raw = cleanText(cellHtml).replace(/[–—−]/g, "-");
    const match = raw.match(/^([^/]+?)\s*\/\s*([^\s]+)(?:\s+(.+))?$/);
    if (!match) return { platform: "", track: "", sector: "" };
    return {
        platform: match[1].trim(),
        track: match[2].trim(),
        sector: match[3] ? match[3].trim() : ""
    };
};

const normalizeStationName = (value) => cleanText(value);

const parseViaStation = (value) => cleanText(value)
    .split(/\s*[—–]\s*/)
    .map((station) => normalizeStationName(station))
    .find(Boolean) || "";

const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const extractStationNameFromHtml = (html) => {
    const match = String(html ?? "").match(/id="[^"]*LStationName[^"]*"[^>]*>([^<]*)/i);
    return cleanText(match?.[1] || "");
};

const deriveStationKeyFromUrl = (url) => {
    try {
        const u = new URL(String(url ?? "").trim());
        const key = u.searchParams.get("Key") || u.searchParams.get("key") || "";
        if (/^[A-Za-z0-9]+$/.test(key)) return key;
        return "";
    } catch {
        return "";
    }
};

const parseStationTable = (html, { now = new Date(), stationKey = "" } = {}) => {
    const source = String(html ?? "");
    const table = source.match(/<table\b[^>]*DXMainTable[^>]*>([\s\S]*?)<\/table>/i)?.[1] || source;
    const dateKey = getLocalDateKey(now);
    const departures = [];
    const seenKeys = new Set();

    for (const rowMatch of table.matchAll(/<tr\b[^>]*DXDataRow\d+[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const rowHtml = rowMatch[0];
        if (/\btableTextRow\b/i.test(rowHtml)) continue;

        const cells = extractCells(rowMatch[1]);
        if (cells.length < 10) continue;

        const departureTime = parseClock(cells[0]);
        if (!departureTime) continue;

        const actualTime = parseClock(cells[1]);
        const trainData = parseTrainCell(cells[3]);
        const stations = [normalizeStationName(cells[6]), parseViaStation(cells[7])];
        const target = parsePlatformTarget(cells[9]);
        const trainRef = trainData.sourceTrainNumber || trainData.trainNumber;
        const liveKey = [
            dateKey,
            `station-${stationKey || "unknown"}`,
            trainRef ? `train-${trainRef}` : [`fallback`, departureTime.hours, departureTime.minutes, trainData.train, trainData.operator, stations[0], stations[1]].join("|")
        ].join(":");

        if (seenKeys.has(liveKey)) continue;
        seenKeys.add(liveKey);

        departures.push({
            id: `live:${liveKey}`,
            train: trainData.train,
            trainNumber: trainData.trainNumber,
            departureTime: `${String(departureTime.hours).padStart(2, "0")}:${String(departureTime.minutes).padStart(2, "0")}`,
            delay: calculateDelay(departureTime, actualTime),
            platform: target.platform,
            track: target.track,
            sector: target.sector,
            stations,
            operator: trainData.operator
        });
    }

    return departures;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchStationTable = async ({ url, attempts = 3 } = {}) => {
    const stationKey = deriveStationKeyFromUrl(url);
    let lastError = null;
    for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
        try {
            const response = await fetch(url, {
                cache: "no-store",
                headers: {
                    Accept: "text/html,application/xhtml+xml",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PragotronLiveDepartures/1.0"
                }
            });
            if (!response.ok) {
                throw new Error(`Zdrojová tabule vrátila HTTP ${response.status}.`);
            }
            const html = await response.text();
            const station = extractStationNameFromHtml(html) || "Stanice";
            const departures = parseStationTable(html, { stationKey });
            return { station, departures, stationKey, url };
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await wait(400 * attempt);
        }
    }
    throw new Error(String(lastError));
};

function makeDepartureId(departure) {
    const parts = [
        departure.trainNumber || "",
        departure.departureTime || "",
        departure.platform || "",
        departure.track || ""
    ];
    const base64 = typeof btoa === "function"
        ? btoa(parts.join("|"))
        : Buffer.from(parts.join("|")).toString("base64");
    return "dep-" + base64.replace(/[+/=]/g, (c) =>
        c === "+" ? "-" : c === "/" ? "_" : "");
}

function formatDelay(minutes) {
    if (minutes === null || minutes === undefined || minutes === "") return "";
    const n = Number(minutes);
    if (Number.isNaN(n)) return "";
    return n > 0 ? `+${n} min` : n === 0 ? "0 min" : String(n) + " min";
}

function minutesUntilDeparture(departureTime, now) {
    if (!departureTime) return null;
    const match = String(departureTime).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const dep = new Date(now);
    dep.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (dep < now) dep.setDate(dep.getDate() + 1);
    return Math.round((dep - now) / 60000);
}

function secondsUntilDeparture(departureTime, now) {
    if (!departureTime) return null;
    const match = String(departureTime).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const dep = new Date(now);
    dep.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (dep < now) dep.setDate(dep.getDate() + 1);
    return Math.round((dep - now) / 1000);
}

function lensLabel(state) {
    switch (state) {
        case "on": return "on";
        case "blink": return "blink";
        default: return "off";
    }
};

const trainShortName = (train) => {
    const map = {
        Osobní: "Os",
        Rychlík: "R",
        SuperCity: "SC",
        NightJet: "NJ",
        Nightjet: "NJ",
        Railjet: "RJ",
        RegioJet: "RJ",
        regiojet: "RJ",
        railjet: "RJ"
    };
    return map[train] || train;
};

const addMinutesToClock = (time, minutes) => {
    if (!time) return "";
    const m = Number(minutes);
    if (!Number.isFinite(m) || m === 0) return time;
    const match = String(time).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    let hours = Number(match[1]);
    let mins = Number(match[2]) + m;
    while (mins >= 60) { mins -= 60; hours += 1; }
    while (mins < 0) { mins += 60; hours -= 1; }
    hours = ((hours % 24) + 24) % 24;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

function normalizeDepartures(raw, stationName) {
    if (!raw) return [];
    return raw.map((d) => ({
        id: d.id || makeDepartureId(d),
        train: d.train || "",
        trainNumber: d.trainNumber || "",
        departureTime: d.departureTime || "",
        delay: d.delay ?? "",
        actualDepartureTime: addMinutesToClock(d.departureTime, d.delay),
        platform: d.platform || "",
        track: d.track || "",
        sector: d.sector || "",
        station: stationName || ""
    }));
}

function buildItems(departures, lensStates, blinkOn) {
    const now = new Date();
    return departures.map((d) => {
        const lens = lensStates[d.id] || "off";
        const departureSeconds = secondsUntilDeparture(d.departureTime, now);
        const autoBlink = departureSeconds !== null && departureSeconds >= 0 && departureSeconds < 90;
        const effectiveLens = autoBlink ? "blink" : lens;
        const isBlink = effectiveLens === "blink";
        const lensOn = effectiveLens === "on" || (isBlink && blinkOn);
        const icon = lensOn ? "icons/lens-on.svg" : "icons/lens-off.svg";
        const iconDark = lensOn ? "icons/lens-on-dark.svg" : "icons/lens-off-dark.svg";
        const shortTrain = trainShortName(d.train);
        const name = d.trainNumber && shortTrain
            ? `${shortTrain} ${d.trainNumber}`
            : (d.train || d.trainNumber || d.departureTime || "Odjezd");
        return {
            id: d.id,
            name,
            directory: false,
            enabled: true,
            icon,
            iconDark,
            columns: {
                train: d.train,
                trainNumber: d.trainNumber,
                departureTime: d.departureTime,
                delay: formatDelay(d.delay),
                actualDepartureTime: addMinutesToClock(d.departureTime, d.delay),
                platform: d.platform,
                track: d.track,
                sector: d.sector,
                operator: d.operator || ""
            }
        };
    });
}

async function loadLensStates() {
    try {
        const raw = await Salamander.storage.get("railwayDepartures.lens", "{}");
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function saveLensStates(states) {
    await Salamander.storage.set("railwayDepartures.lens", JSON.stringify(states));
}

async function readConfigFile() {
    try {
        const text = await readFile(CONFIG_FILE, "utf8");
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.urls)) {
            return parsed;
        }
        if (typeof parsed.url === "string" && parsed.url) {
            return { urls: [parsed.url], refreshMs: parsed.refreshMs };
        }
        return { urls: [], refreshMs: DEFAULT_REFRESH_MS };
    } catch {
        return { urls: [], refreshMs: DEFAULT_REFRESH_MS };
    }
}

async function writeConfigFile(config) {
    try {
        await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    } catch { }
}

async function getConfiguredUrls() {
    const config = await readConfigFile();
    return Array.isArray(config.urls) ? config.urls : [];
}

async function getRefreshInterval() {
    const config = await readConfigFile();
    const n = Number(config.refreshMs);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFRESH_MS;
}

async function getStringsAsync(locale) {
    const candidates = [];
    if (locale) {
        candidates.push(locale);
        const primary = locale.split("-")[0];
        if (primary !== locale) candidates.push(primary);
    }
    candidates.push("en");
    for (const candidate of candidates) {
        try {
            const response = await fetch(`locales/${candidate}.json`);
            if (response.ok) return await response.json();
        } catch { continue }
    }
    return {
        name: "Railway Departures",
        strings: {
            boardUrl: "Board URL",
            boardUrlHint: "URL of the railway departure board JSON API",
            refreshInterval: "Refresh interval (ms)",
            lensOff: "Off",
            lensOn: "On",
            lensBlink: "Blinking",
            configure: "Configure",
            cancel: "Cancel",
            save: "Save",
            errorFetch: "Failed to fetch departures from URL",
            errorInvalidUrl: "No board URL configured. Use Configure URL.",
            settingsTitle: "Railway Departures Settings",
            settingsSaved: "Settings saved",
            scraperStarted: "Scraper started",
            scraperStopped: "Scraper stopped",
            scraperAlreadyRunning: "Scraper already running",
            scraperNotRunning: "Scraper not running",
            scraperError: "Scraper error",
            fetchFailed: "Failed to fetch departures"
        }
    };
}

async function handleConfigureUrl(strings) {
    const config = await readConfigFile();
    const currentUrls = Array.isArray(config.urls) ? config.urls : [];
    const currentRefresh = config.refreshMs || DEFAULT_REFRESH_MS;
    const urlsText = currentUrls.length
        ? currentUrls.join("\n  ")
        : "(není nastaveno)";

    await Salamander.ui.messageBox(
        `Konfigurace:\n\nURL tabulí:\n  ${urlsText}\nRefresh interval (ms): ${currentRefresh}\n\nUpravte soubor config.json ve složce rozšíření a restartujte Salamander.`,
        strings.settingsTitle || "Railway Departures Settings",
        "OK",
        "Information"
    );
}

let scraperTimer = null;
let scraperRunning = false;
let lastCache = null;
let scraperError = null;
let panelOpen = false;
let lastPanelActivity = 0;
let panelShowingStationItems = false;
let listDeparturesBusy = false;
const PANEL_INACTIVITY_MS = 5 * 60 * 1000;
let blinkOn = false;
let blinkTimer = null;

const ensureBlinkTimer = () => {
    if (blinkTimer) return;
    blinkTimer = setInterval(() => {
        blinkOn = !blinkOn;
        handleListDepartures().catch(() => { });
    }, 500);
};

const saveCache = async (cache) => {
    try {
        await Salamander.storage.set(CACHE_KEY, JSON.stringify(cache));
    } catch { }
};

const loadCache = async () => {
    try {
        const raw = await Salamander.storage.get(CACHE_KEY, "null");
        return raw === "null" ? null : JSON.parse(raw);
    } catch {
        return null;
    }
};

const startScraper = async () => {
    if (scraperRunning) return { ok: false, reason: "alreadyRunning" };
    const urls = await getConfiguredUrls();
    if (!urls.length) {
        return { ok: false, reason: "noUrl" };
    }
    scraperRunning = true;
    scraperError = null;

    const tick = async () => {
        try {
            const stations = [];
            for (const url of urls) {
                try {
                    const result = await fetchStationTable({ url });
                    stations.push({
                        station: result.station,
                        stationKey: result.stationKey,
                        departures: result.departures,
                        fetchedAt: Date.now(),
                        url: result.url
                    });
                } catch (error) {
                    scraperError = scraperError || String(error);
                }
            }
            lastCache = { stations };
            await saveCache(lastCache);
            const now = Date.now();
            if (panelOpen && now - lastPanelActivity > PANEL_INACTIVITY_MS) {
                stopScraper();
                panelOpen = false;
            } else if (panelOpen) {
                scraperTimer = setTimeout(tick, interval);
                try { await handleListDepartures(); } catch { }
            } else {
                scraperTimer = setTimeout(tick, interval);
            }
        } catch (error) {
            scraperError = String(error);
        }
        const interval = await getRefreshInterval();
        scraperTimer = setTimeout(tick, interval);
    };

    await tick();
    return { ok: true };
};

const stopScraper = () => {
    if (scraperTimer) {
        clearTimeout(scraperTimer);
        scraperTimer = null;
    }
    scraperRunning = false;
};

const getCachedStation = (stationKey) => lastCache
    ? lastCache.stations.find((s) => s.stationKey === stationKey)?.station || "Stanice"
    : "Stanice";
const getCachedDepartures = (stationKey) => lastCache
    ? lastCache.stations.find((s) => s.stationKey === stationKey)?.departures || null
    : null;

const stripDiacritics = (s) => String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeId = (s) => stripDiacritics(s)
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

async function handleListDepartures() {
    if (listDeparturesBusy) return;
    listDeparturesBusy = true;
    try {
        const locale = Salamander.application && typeof Salamander.application.Language === "function"
            ? Salamander.application.Language()
            : "en";
        const strings = await getStringsAsync(locale);

        panelOpen = true;
        lastPanelActivity = Date.now();

        const item = Salamander.invocation.item || {};
        const invPath = Salamander.invocation.path || "";

        const urls = await getConfiguredUrls();
        if (!urls.length) {
            await Salamander.ui.messageBox(
                strings.errorInvalidUrl || "No board URL configured. Use Configure URL.",
                strings.name || "Railway Departures",
                "OK",
                "Error"
            );
            return;
        }

        let stored = await loadCache();
        if (stored) lastCache = stored;

        const stationIdFor = (s) =>
            s.stationKey ? "station-" + s.stationKey : "station-" + normalizeId(s.station);

        let activeStation = null;
        if (lastCache && lastCache.stations) {
            for (const s of lastCache.stations) {
                if (invPath.includes(stationIdFor(s))) {
                    activeStation = s;
                    break;
                }
            }
        }

        if (!activeStation) {
            if (!lastCache || !lastCache.stations?.length) {
                try {
                    const stations = [];
                    for (const url of urls) {
                        const result = await fetchStationTable({ url });
                        stations.push({
                            station: result.station,
                            stationKey: result.stationKey,
                            departures: result.departures,
                            fetchedAt: Date.now(),
                            url: result.url
                        });
                    }
                    lastCache = { stations };
                    await saveCache(lastCache);
                } catch (error) {
                    await Salamander.ui.messageBox(
                        `${strings.fetchFailed || "Failed to fetch departures"}:\n${String(error)}`,
                        strings.name || "Railway Departures",
                        "OK",
                        "Error"
                    );
                    return;
                }
            }

            const stationItems = (lastCache.stations || []).map((s) => ({
                id: stationIdFor(s),
                name: s.station,
                directory: true,
                enabled: true,
                icon: "icon.svg",
                iconDark: "icon.svg",
                columns: {}
            }));
            await Salamander.fileSystem.addItems(stationItems);
            panelShowingStationItems = false;
            return;
        }

        panelShowingStationItems = true;
        const departures = activeStation.departures || [];
        const stationName = activeStation.station || "Stanice";

        const lensStates = await loadLensStates();
        const hasBlink = Object.values(lensStates).some((s) => s === "blink");
        const now = new Date();
        const hasAutoBlink = departures.some((d) => {
            const s = secondsUntilDeparture(d.departureTime, now);
            return s !== null && s >= 0 && s < 90;
        });
        if (hasBlink || hasAutoBlink) ensureBlinkTimer();

        const items = buildItems(departures, lensStates, blinkOn);
        await Salamander.fileSystem.addItems(items);
    } finally {
        listDeparturesBusy = false;
    }
}

async function handleToggleLens() {
    const item = Salamander.invocation.item || {};
    const itemId = item.id || "";
    if (!itemId.startsWith("dep-")) {
        await Salamander.ui.messageBox(
            "Cannot toggle lens for this item.",
            "Railway Departures",
            "OK",
            "Error"
        );
        return;
    }

    const lensStates = await loadLensStates();
    const current = lensStates[itemId] || "off";
    const nextIndex = (LENS_STATES.indexOf(current) + 1) % LENS_STATES.length;
    const next = LENS_STATES[nextIndex];
    lensStates[itemId] = next;
    await saveLensStates(lensStates);

    await Salamander.ui.notify(
        `Lens: ${lensLabel(next)}`,
        "Railway Departures",
        1500
    );
}

async function handleRefreshDepartures(strings) {
    await handleListDepartures();
}

async function handleOpenDepartures(strings) {
    const urls = await getConfiguredUrls();
    if (!urls.length) {
        await handleConfigureUrl(strings);
    } else {
        await handleListDepartures();
    }
}

const handler = Salamander.commandHandler || Salamander.command_handler;
const h = String(handler ?? "");

const is = (...names) => names.some((n) =>
    h === n
    || h.endsWith("." + n)
    || h === `OpenSalamander.RailwayDepartures.${n}`
);

try {
    if (is("listDepartures")) {
        await handleListDepartures();
    } else if (is("openDepartures", "open")) {
        await handleOpenDepartures(await getStringsAsync("en"));
    } else if (is("configureUrl", "configure")) {
        await handleConfigureUrl(await getStringsAsync("en"));
    } else if (is("toggleLens")) {
        await handleToggleLens();
    } else if (is("refreshDepartures", "refresh")) {
        await handleRefreshDepartures(await getStringsAsync("en"));
    }
} catch (error) {
    await Salamander.ui.notify(
        `Chyba: ${String(error)}`,
        "Railway Departures",
        3000
    );
}

if (is("listDepartures") && !scraperRunning) {
    const urls = await getConfiguredUrls();
    if (urls.length) {
        await startScraper();
    }
}
