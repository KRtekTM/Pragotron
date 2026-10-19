import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(EXTENSION_DIR, "config.json");
const DEFAULT_REFRESH_MS = 30000;

const SCRAPER_STATE_KEY = "TabuleSprZel.scraperState";
const CACHE_KEY = "TabuleSprZel.cache";

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
    "Mim. Os", "Mim. R", "ČEDOK", "Eurocity", "Intercity", "Supercity",
    "Nightjet", "Nightjet", "EuroNight",
    "Railjet", "Railjet", "RegioJet", "RegioJet", "Ex", "rj", "RJ",
    "EC", "IC", "EN", "NJ", "nj", "SC", "sc", "Os", "Sp", "R"
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
    else if (/^nj$/i.test(st)) {
        return "Nightjet";
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
    if (!raw) return { platform: "", track: "", sector: "" };
    const match = raw.match(/^([^/]+?)\s*\/\s*([^\s]+)(?:\s+(.+))?$/);
    if (match) {
        return {
            platform: match[1].trim(),
            track: match[2].trim(),
            sector: match[3] ? match[3].trim() : ""
        };
    }
    return { platform: raw.trim(), track: "", sector: "" };
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
            `station-${stationKey || "unknown"}`,
            trainRef ? `train-${trainRef}` : `seq-${departures.length}`
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
    return n > 0 ? `+${n} min` : n === 0 ? "0 min" : `${n} min`;
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

const trainShortName = (train) => {
    const map = {
        Osobní: "Os",
        Rychlík: "R",
        SuperCity: "SC",
        NightJet: "NJ",
        Nightjet: "nj",
        Railjet: "RJ",
        RegioJet: "RJ",
        regiojet: "RJ",
        railjet: "rj",
        EuroCity: "EC",
        InterCity: "IC",
        EuroNight: "EN",
        Express: "Ex",
        Spěšný: "Sp",
    };
    return map[train] || train;
};

const formatActualDepartureWithDate = (departureTime, delayMinutes, now) => {
    if (!departureTime) return "";
    const match = String(departureTime).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const dep = new Date(now);
    dep.setHours(Number(match[1]), Number(match[2]), 0, 0);
    dep.setMinutes(dep.getMinutes() + Number(delayMinutes || 0));
    if (dep < now) dep.setDate(dep.getDate() + 1);
    const day = String(dep.getDate()).padStart(2, "0");
    const month = String(dep.getMonth() + 1).padStart(2, "0");
    const year = dep.getFullYear();
    const timeStr = `${String(dep.getHours()).padStart(2, "0")}:${String(dep.getMinutes()).padStart(2, "0")}`;
    return `${day}.${month}.${year} ${timeStr}`;
};

function normalizeDepartures(raw, stationName) {
    if (!raw) return [];
    return raw.map((d) => ({
        id: d.id || makeDepartureId(d),
        train: d.train || "",
        trainNumber: d.trainNumber || "",
        departureTime: d.departureTime || "",
        delay: d.delay ?? "",
        actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, new Date()),
        platform: d.platform || "",
        track: d.track || "",
        sector: d.sector || "",
        station: stationName || ""
    }));
}

function buildItems(departures) {
    const now = new Date();
    return departures.map((d) => {
        const operator = String(d.operator || "").toLocaleLowerCase("cs-CZ");
        const isCD = operator.includes("čd") || operator.includes("ceske drahy") || operator.includes("cesk");
        const isRjet = operator.includes("rjet") || operator.includes("regiojet");
        const icon = isCD ? "icons/CD.svg" : isRjet ? "icons/RJET.svg" : "icons/train.svg";
        const iconDark = isCD ? "icons/CD_dark.svg" : isRjet ? "icons/RJET_dark.svg" : "icons/train_dark.svg";
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
                actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, now),
                platform: d.platform,
                track: d.track,
                sector: d.sector,
                operator: d.operator || ""
            }
        };
    });
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
    if (locale) {
        try {
            const response = await fetch(`locales/${locale}.json`);
            if (response.ok) return await response.json();
        } catch { }
        const primary = locale.split("-")[0];
        if (primary !== locale) {
            try {
                const response = await fetch(`locales/${primary}.json`);
                if (response.ok) return await response.json();
            } catch { }
        }
    }
    try {
        const response = await fetch("locales/cs.json");
        if (response.ok) return await response.json();
    } catch { }
    return {
        name: "Odjezdy železnice",
        strings: {
            errorInvalidUrl: "Není nastavena žádná URL tabule. Použijte Konfigurovat URL.",
            errorFetch: "Nepodařilo se načíst odjezdy z URL",
            fetchFailed: "Nepodařilo se načíst odjezdy",
            settingsTitle: "Nastavení odjezdů železnice",
            lensToggleError: "Nelze přepnout čočku pro tuto položku."
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
        strings.settingsTitle || "Nastavení odjezdů železnice",
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
let currentView = null;
let listDeparturesBusy = false;
const PANEL_INACTIVITY_MS = 5 * 60 * 1000;

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
            : "cs";
        const strings = await getStringsAsync(locale);

        panelOpen = true;
        lastPanelActivity = Date.now();

        const item = Salamander.invocation.item || {};
        const invPath = Salamander.invocation.path || "";

        const urls = await getConfiguredUrls();
        if (!urls.length) {
            await Salamander.ui.messageBox(
                strings.errorInvalidUrl || "Není nastavena žádná URL tabule. Použijte Konfigurovat URL.",
                strings.name || "Odjezdy železnice",
                "OK",
                "Error"
            );
            return;
        }

        let stored = await loadCache();
        if (stored) lastCache = stored;

        const stationIdFor = (s) =>
            s.stationKey ? "station-" + s.stationKey : "station-" + normalizeId(s.station);

        // Determine what view we're in: root or a specific station
        let activeStation = null;
        let effectiveInvPath = invPath;
        if (!invPath && currentView && currentView !== "root") {
            effectiveInvPath = currentView;
        }

        if (effectiveInvPath) {
            for (const s of (lastCache.stations || [])) {
                const sid = stationIdFor(s);
                if (effectiveInvPath.includes(sid)) {
                    activeStation = s;
                    break;
                }
            }
        }

        if (!activeStation) {
            // Root view: show station folders
            if (currentView !== "root") {
                currentView = "root";
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
                            `${strings.fetchFailed || "Nepodařilo se načíst odjezdy"}:\n${String(error)}`,
                            strings.name || "Odjezdy železnice",
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
            }
            return;
        }

        // Station view: show departures for this station.
        const stationId = stationIdFor(activeStation);
        const departures = activeStation.departures || [];
        const stationName = activeStation.station || "Stanice";

        const now = new Date();

        const items = buildItems(departures);
        currentView = stationId;
        await Salamander.fileSystem.addItems(items);
    } catch (error) {
        await Salamander.ui.notify(
            `Chyba: ${String(error)}`,
            "Odjezdy železnice",
            3000
        );
    } finally {
        listDeparturesBusy = false;
    }
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
    || h === `TabuleSprZel.${n}`
);

try {
    if (is("listDepartures")) {
        await handleListDepartures();
    } else if (is("openDepartures", "open")) {
        await handleOpenDepartures(await getStringsAsync("cs"));
    } else if (is("configureUrl", "configure")) {
        await handleConfigureUrl(await getStringsAsync("cs"));
    }
} catch (error) {
    await Salamander.ui.notify(
        `Chyba: ${String(error)}`,
        "Odjezdy železnice",
        3000
    );
}

if (is("listDepartures") && !scraperRunning) {
    const urls = await getConfiguredUrls();
    if (urls.length) {
        await startScraper();
    }
}
