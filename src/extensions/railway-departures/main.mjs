import { readFile, readdir, writeFile } from "node:fs/promises";
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
        if (/\btableTextRow\b/i.test(rowHtml)) {
            const note = extractCells(rowMatch[1])
                .map((cell) => cleanText(cell))
                .find(Boolean);
            if (note && departures.length) {
                departures[departures.length - 1].note = departures[departures.length - 1].note
                    ? `${departures[departures.length - 1].note}\n${note}`
                    : note;
            }
            continue;
        }

        const cells = extractCells(rowMatch[1]);
        if (cells.length < 10) continue;

        const departureTime = parseClock(cells[0]);
        if (!departureTime) continue;

        const actualTime = parseClock(cells[1]);
        const trainData = parseTrainCell(cells[3]);
        const destination = normalizeStationName(cells[6]);
        const via = cleanText(cells[7]);
        const stations = [destination, parseViaStation(via)];
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
            operator: trainData.operator,
            line: cleanText(cells[4]),
            destination,
            via,
            note: ""
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
                throw new Error(`The departure board returned HTTP ${response.status}.`);
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
    const dep = getEffectiveDepartureDate(departureTime, 0, now);
    if (!dep) return null;
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

const RECENT_DEPARTURE_GRACE_MS = 10 * 60 * 1000;

const getEffectiveDepartureDate = (departureTime, delayMinutes, now = new Date()) => {
    const match = String(departureTime).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const dep = new Date(now);
    dep.setHours(Number(match[1]), Number(match[2]), 0, 0);

    const delay = Number(delayMinutes || 0);
    if (Number.isFinite(delay)) {
        dep.setMinutes(dep.getMinutes() + delay);
    }

    const referenceMinute = new Date(now);
    referenceMinute.setSeconds(0, 0);
    const recentDeparture = referenceMinute.getTime() - dep.getTime()
        <= RECENT_DEPARTURE_GRACE_MS;
    if (dep < now && !recentDeparture) {
        dep.setDate(dep.getDate() + 1);
    }

    return dep;
};

const formatActualDepartureWithDate = (departureTime, delayMinutes, now) => {
    const dep = getEffectiveDepartureDate(departureTime, delayMinutes, now);
    if (!dep) return "";
    const day = String(dep.getDate()).padStart(2, "0");
    const month = String(dep.getMonth() + 1).padStart(2, "0");
    const year = dep.getFullYear();
    const timeStr = `${String(dep.getHours()).padStart(2, "0")}:${String(dep.getMinutes()).padStart(2, "0")}`;
    return `${day}.${month}.${year} ${timeStr}`;
};

function normalizeDepartures(raw, stationName) {
    if (!raw) return [];
    return raw.map((d) => ({
        id: makeDepartureId(d),
        train: d.train || "",
        trainNumber: d.trainNumber || "",
        departureTime: d.departureTime || "",
        delay: d.delay ?? "",
        actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, new Date()),
        platform: d.platform || "",
        track: d.track || "",
        sector: d.sector || "",
        line: d.line || "",
        destination: d.destination || d.stations?.[0] || "",
        via: d.via || d.stations?.[1] || "",
        note: d.note || "",
        station: stationName || ""
    }));
}

function normalizeOperatorIconKey(operator) {
    return stripDiacritics(operator)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "");
}

const VAGONWEB_CARRIER_CODES = [
    ["CD", ["CD", "CESKEDRAHY"]],
    ["RJ", ["RJ", "RJET", "REGIOJET"]],
    ["LE", ["LE", "LEOEXPRESS"]],
    ["ARV", ["ARR", "ARRIVA", "ARRIVAVLAKY"]],
    ["AŽD", ["AZD", "AZDPRAHA"]],
    ["DLB", ["DLB", "LANDERBAHN", "DIELANDERBAHN"]],
    ["GWTR", ["GWTR", "GWTRAIN", "GWTRAINREGIO"]],
    ["OÚD", ["OUD", "OSOBLAZSKAUZKOROZCHODNIDRAHA"]],
    ["KŽC", ["KZC", "KZCDOPRAVA"]],
    ["GE", ["GE", "GEPARDEXPRESS"]],
    ["ZSSK", ["ZSSK", "ZELEZNICNASPOLOCNOSTSLOVENSKO"]],
    ["RJSK", ["RJSK", "REGIOJETSLOVENSKO"]],
    ["LESK", ["LESK", "LEOEXPRESSSLOVENSKO"]],
    ["TREŽ", ["TREZ", "TRENCIANSKAELEKTRICKAZELEZNICA"]],
    ["PKPIC", ["PKP", "PKPIC", "PKPINTERCITY"]],
    ["PREG", ["PREG", "POLREGIO"]],
    ["RJPL", ["RJPL", "REGIOJETPOLSKA"]],
    ["LEPL", ["LEPL", "LEOEXPRESSPOLSKA"]],
    ["ÖBB", ["OBB", "OEBB", "OSTERREICHISCHEBUNDESBAHNEN"]],
    ["DB", ["DB", "DEUTSCHEBAHN"]],
    ["MÁV", ["MAV", "MAVSZEMELYSZALLITASIZRT"]]
];

const vagonwebCarrierCode = (operator) => {
    const key = normalizeOperatorIconKey(operator);
    const exact = VAGONWEB_CARRIER_CODES.find(([, aliases]) => aliases.includes(key));
    if (exact) return exact[0];
    return VAGONWEB_CARRIER_CODES.find(([, aliases]) =>
        aliases.some((alias) => alias.length > 3 && key.includes(alias))
    )?.[0] || "";
};

const vagonwebCategory = (train) => {
    const key = normalizeOperatorIconKey(train);
    const categories = [
        ["RJ", ["RAILJET", "REGIOJET", "RJ"]],
        ["RJX", ["RJX", "RAILJETXPRESS"]],
        ["LE", ["LE", "LEOEXPRESS"]],
        ["SC", ["SUPERCITY", "SC"]],
        ["EC", ["EUROCITY", "EC"]],
        ["EIC", ["EIC", "EXPRESSINTERCITY"]],
        ["EIP", ["EIP", "EXPRESSINTERCITYPREMIUM"]],
        ["ECE", ["ECE", "EUROCITYEXPRESS"]],
        ["ICE", ["ICE", "INTERCITYEXPRESS"]],
        ["EN", ["EURONIGHT", "EN"]],
        ["NJ", ["NIGHTJET", "NJ"]],
        ["IC", ["INTERCITY", "IC"]],
        ["ICN", ["ICN"]],
        ["REX", ["REX", "REGIONALNYEXPRES", "REGIONALEXPRESS"]],
        ["TLX", ["TLX", "TRILEXEXPRESS"]],
        ["TL", ["TL", "TRILEX"]],
        ["IR", ["IR", "INTERREGIO"]],
        ["RE", ["RE", "REGIOEXPRESS"]],
        ["RB", ["RB", "REGIONALBAHN"]],
        ["Ex", ["EXPRESS", "EX"]],
        ["R", ["RYCHLIK", "R"]],
        ["Sp", ["SPESNY", "SP"]],
        ["Os", ["OSOBNI", "OS"]]
    ];
    return categories.find(([, aliases]) => aliases.includes(key))?.[0] || "";
};

function buildVagonwebUrl(details) {
    const carrier = vagonwebCarrierCode(details.operator);
    const category = vagonwebCategory(details.train);
    const number = String(details.trainNumber || "").trim();
    if (!carrier || !category || !/^\d+$/.test(number)) return "";

    const params = new URLSearchParams({
        zeme: carrier,
        kategorie: category,
        cislo: number,
        rok: String(new Date().getFullYear())
    });
    return `https://www.vagonweb.cz/razeni/vlak.php?${params}`;
}

async function getOperatorIconFiles() {
    try {
        const entries = await readdir(join(EXTENSION_DIR, "icons", "operators"), {
            withFileTypes: true
        });
        return new Set(entries
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".svg"))
            .map((entry) => entry.name));
    } catch {
        return new Set();
    }
}

const isOrderedSubsequence = (candidate, value) => {
    let candidateIndex = 0;
    for (const character of value) {
        if (character === candidate[candidateIndex]) candidateIndex += 1;
        if (candidateIndex === candidate.length) return true;
    }
    return false;
};

function findOperatorIcon(operatorKey, suffix, operatorIconFiles) {
    if (!operatorKey) return null;
    const exact = `${operatorKey}${suffix}.svg`;
    if (operatorIconFiles.has(exact)) return exact;

    const candidates = [...operatorIconFiles]
        .filter((file) => file.endsWith(`${suffix}.svg`))
        .map((file) => ({
            file,
            key: normalizeOperatorIconKey(file.slice(0, -`${suffix}.svg`.length))
        }))
        .filter(({ key }) => key && isOrderedSubsequence(key, operatorKey))
        .sort((left, right) => right.key.length - left.key.length || left.file.localeCompare(right.file));
    return candidates[0]?.file || null;
}

function buildItems(departures, operatorIconFiles = new Set()) {
    const now = new Date();
    const items = departures.map((d) => {
        const operatorKey = normalizeOperatorIconKey(d.operator);
        const operatorIcon = findOperatorIcon(operatorKey, "", operatorIconFiles);
        const operatorIconDark = findOperatorIcon(operatorKey, "_dark", operatorIconFiles);
        const icon = operatorIcon
            ? `icons/operators/${operatorIcon}`
            : "icons/train.svg";
        const iconDark = operatorIconDark
            ? `icons/operators/${operatorIconDark}`
            : "icons/train_dark.svg";
        const shortTrain = trainShortName(d.train);
        const name = d.trainNumber && shortTrain
            ? `${shortTrain} ${d.trainNumber}`
            : (d.train || d.trainNumber || d.departureTime || "Departure");
        return {
            id: makeDepartureId(d),
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
                line: d.line || "",
                destination: d.destination || d.stations?.[0] || "",
                via: d.via || d.stations?.[1] || "",
                note: d.note || "",
                operator: d.operator || ""
            }
        };
    });

    departureDetailsById.clear();
    for (const d of departures) {
        const depId = makeDepartureId(d);
        departureDetailsById.set(depId, {
            train: d.train,
            trainNumber: d.trainNumber,
            departureTime: d.departureTime,
            delay: formatDelay(d.delay),
            actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, now),
            platform: d.platform,
            track: d.track,
            sector: d.sector,
            line: d.line || "",
            destination: d.destination || d.stations?.[0] || "",
            via: d.via || d.stations?.[1] || "",
            note: d.note || "",
            operator: d.operator || "",
            station: d.station || ""
        });
    }

    return items;
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

function extractLanguageCode(lang) {
    if (typeof lang === "string" && lang) return String(lang).split("-")[0];
    if (lang && typeof lang === "object") {
        if (lang.locale) return String(lang.locale).split("-")[0];
        if (lang.language) return String(lang.language).split("-")[0];
    }
    return null;
}

async function detectLocale() {
    try {
        if (Salamander.application && typeof Salamander.application.language === "function") {
            const lang = await Salamander.application.language();
            const code = extractLanguageCode(lang);
            if (code) return code;
        }
    } catch { }
    try {
        if (Salamander.application && typeof Salamander.application.Language === "function") {
            const lang = Salamander.application.Language();
            const code = extractLanguageCode(lang);
            if (code) return code;
        }
    } catch { }
    return "en";
}

async function getStringsAsync(locale = "en") {
    const primary = String(locale || "en").split("-")[0];
    const candidates = primary === "cs" ? ["locales/cs.json", "locales/en.json"] : ["locales/en.json", "locales/cs.json"];
    for (const relativePath of candidates) {
        try {
            const text = await readFile(join(EXTENSION_DIR, relativePath), "utf8");
            return JSON.parse(text);
        } catch { }
    }
    return {
        name: "Tabule SprŽel",
        error: "Error:",
        configTitle: "Configuration",
        urlsLabel: "Board URLs:",
        refreshLabel: "Refresh interval (ms):",
        configHint: "Edit the config.json file in the extension folder and restart Salamander.",
        urlsNotConfigured: "(not configured)",
        errorInvalidUrl: "No board URLs configured. Use Configure URL.",
        errorFetch: "Failed to fetch departures from URL",
        fetchFailed: "Failed to fetch departures",
        settingsTitle: "Tabule SprŽel Settings",
        detailTrain: "Train:",
        detailTrainNumber: "Train No.:",
        detailDepartureTime: "Departure:",
        detailDelay: "Delay:",
        detailActualDepartureTime: "Actual Departure:",
        detailPlatform: "Platform:",
        detailTrack: "Track:",
        detailSector: "Sector:",
        detailLine: "Line:",
        detailDestination: "Destination:",
        detailVia: "Via:",
        detailComposition: "Train formation:",
        detailOperator: "Operator:",
        detailStation: "Station:",
        detailNote: "Note:"
    };
}

async function handleConfigureUrl(strings) {
    if (!strings) {
        strings = await getStringsAsync(await detectLocale());
    }

    const config = await readConfigFile();
    const currentUrls = Array.isArray(config.urls) ? config.urls : [];
    const currentRefresh = config.refreshMs || DEFAULT_REFRESH_MS;
    const urlsText = currentUrls.length
        ? currentUrls.join("\n  ")
        : strings.urlsNotConfigured || "(not configured)";

    await Salamander.ui.messageBox(
        `${strings.configTitle || "Configuration"}:\n\n${strings.urlsLabel || "Board URLs:"}\n  ${urlsText}\n${strings.refreshLabel || "Refresh interval (ms):"} ${currentRefresh}\n\n${strings.configHint || "Edit the config.json file in the extension folder and restart Salamander."}`,
        strings.settingsTitle || "Tabule SprŽel Settings",
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
let stationRefreshPromise = null;
let listRequestId = 0;
const departureDetailsById = new Map();
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

const cacheMatchesConfiguredUrls = (cache, urls) => {
    const configuredUrls = urls
        .map((url) => String(url ?? "").trim())
        .filter(Boolean);
    const cachedUrls = Array.isArray(cache?.stations)
        ? cache.stations
            .map((station) => String(station?.url ?? "").trim())
            .filter(Boolean)
        : [];
    const cachedNames = Array.isArray(cache?.stations)
        ? cache.stations.map((station) => String(station?.station ?? "").trim())
        : [];

    if (configuredUrls.length !== cachedUrls.length) return false;
    if (
        cachedNames.length !== cachedUrls.length
        || cachedNames.some((name) => !name || /^station-[A-Za-z0-9_-]+$/i.test(name))
    ) return false;

    const cachedUrlSet = new Set(cachedUrls);
    return configuredUrls.every((url) => cachedUrlSet.has(url));
};

const fetchConfiguredStations = async ({ urls, strings, fallbackCache, reportError }) => {
    const results = await Promise.all(urls.map(async (url) => {
        try {
            const result = await fetchStationTable({ url });
            return {
                station: result.station,
                stationKey: result.stationKey,
                departures: result.departures,
                fetchedAt: Date.now(),
                url: result.url
            };
        } catch (error) {
            return { url, error };
        }
    }));

    const fallbackByUrl = new Map((fallbackCache?.stations || [])
        .map((station) => [String(station.url || "").trim(), station]));
    const stations = results.map((result) => result.error
        ? fallbackByUrl.get(String(result.url).trim())
        : result).filter(Boolean);

    if (!stations.length) {
        if (reportError) {
            const firstError = results.find((result) => result.error)?.error;
            await Salamander.ui.messageBox(
                `${strings.fetchFailed || "Failed to fetch departures"}:\n${String(firstError || "No station data was returned.")}`,
                strings.name || "Tabule SprŽel",
                "OK",
                "Error"
            );
        }
        return null;
    }

    const refreshed = { stations };
    lastCache = refreshed;
    void saveCache(refreshed);
    return refreshed;
};

const refreshConfiguredStations = ({ urls, strings, reportError = false } = {}) => {
    if (stationRefreshPromise) return stationRefreshPromise;
    stationRefreshPromise = fetchConfiguredStations({
        urls,
        strings,
        fallbackCache: lastCache,
        reportError
    }).finally(() => {
        stationRefreshPromise = null;
    });
    return stationRefreshPromise;
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
            const refreshed = await refreshConfiguredStations({ urls });
            if (!refreshed) scraperError = "No station data was returned.";
            const now = Date.now();
            if (panelOpen && now - lastPanelActivity > PANEL_INACTIVITY_MS) {
                stopScraper();
                panelOpen = false;
            } else {
                scraperTimer = setTimeout(() => void tick(), await getRefreshInterval());
            }
        } catch (error) {
            scraperError = String(error);
            scraperTimer = setTimeout(() => void tick(), await getRefreshInterval());
        }
    };

    void tick();
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
    ? lastCache.stations.find((s) => s.stationKey === stationKey)?.station || "Station"
    : "Station";
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
    const requestId = ++listRequestId;
    let strings = null;
    try {
        strings = await getStringsAsync(await detectLocale());

        panelOpen = true;
        lastPanelActivity = Date.now();

        const item = Salamander.invocation.item || {};
        const invPath = Salamander.invocation.path || "";

        const urls = await getConfiguredUrls();
        if (!urls.length) {
            await Salamander.ui.messageBox(
                strings.errorInvalidUrl || "No board URLs configured. Use Configure URL.",
                strings.name || "Tabule SprŽel",
                "OK",
                "Error"
            );
            return;
        }

        let stored = await loadCache();
        lastCache = stored && cacheMatchesConfiguredUrls(stored, urls)
            ? stored
            : null;

        // Load data before resolving the current path. A station path must
        // still resolve when the persisted cache is missing or outdated.
        if (!lastCache?.stations?.length) {
            const refreshed = await refreshConfiguredStations({
                urls,
                strings,
                reportError: true
            });
            if (!refreshed || requestId !== listRequestId) return;
        }

        const cache = lastCache;
        if (!cache?.stations?.length || requestId !== listRequestId) return;

        const stationNameFor = (s) => {
            const name = String(s.station ?? "").trim();
            return name && !/^station-[A-Za-z0-9_-]+$/i.test(name)
                ? name
                : `Station ${s.stationKey || ""}`.trim();
        };
        const stationIdFor = (s) => {
            const nameId = normalizeId(stationNameFor(s));
            const namePart = nameId || normalizeId(s.stationKey) || "unknown";
            const keyPart = s.stationKey ? `!station-${normalizeId(s.stationKey)}` : "";
            return `station-${namePart}${keyPart}`;
        };
        const legacyStationIdFor = (s) =>
            s.stationKey ? `station-${s.stationKey}` : "";
        const previousStationIdFor = (s) =>
            `station-${normalizeId(stationNameFor(s))}`;

        // Determine what view we're in: root or a specific station
        let activeStation = null;
        let effectiveInvPath = invPath;
        if (!invPath && String(item.id || "").startsWith("station-")) {
            effectiveInvPath = String(item.id);
        }
        const pathParts = String(effectiveInvPath)
            .split(/[\\/]/)
            .filter(Boolean);
        const stationPathIds = pathParts.filter((part) => part.startsWith("station-"));

        if (stationPathIds.length) {
            for (const s of cache.stations) {
                const sid = stationIdFor(s);
                const legacySid = legacyStationIdFor(s);
                const previousSid = previousStationIdFor(s);
                if (
                    stationPathIds.includes(sid)
                    || stationPathIds.includes(legacySid)
                    || stationPathIds.includes(previousSid)
                ) {
                    activeStation = s;
                    break;
                }
            }
        }

        if (!activeStation) {
            // Root view: show station folders
            currentView = "root";
            const stationItems = cache.stations.map((s) => ({
                id: stationIdFor(s),
                name: stationNameFor(s),
                directory: true,
                enabled: true,
                icon: "icon.svg",
                iconDark: "icon.svg",
                columns: {}
            }));
            if (requestId === listRequestId) {
                await Salamander.fileSystem.addItems(stationItems);
            }
            return;
        }

        // Station view: show departures for this station.
        const stationId = stationIdFor(activeStation);
        const departures = activeStation.departures || [];
        const stationName = activeStation.station || "Stanice";

        const now = new Date();

        const operatorIconFiles = await getOperatorIconFiles();
        if (requestId !== listRequestId) return;

        const items = buildItems(departures, operatorIconFiles);
        currentView = stationId;

        if (requestId !== listRequestId) return;
        await Salamander.fileSystem.addItems(items);

        // Do not block the panel on per-departure persistence. The in-memory
        // map serves the immediate action; storage is only the cross-context fallback.
        void Promise.all(departures.map(async (d) => {
            const depId = makeDepartureId(d);
            try {
                await Salamander.storage.set(
                    `departure.${depId}`,
                    JSON.stringify({
                        train: d.train,
                        trainNumber: d.trainNumber,
                        departureTime: d.departureTime,
                        delay: formatDelay(d.delay),
                        actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, now),
                        platform: d.platform,
                        track: d.track,
                        sector: d.sector,
                        line: d.line || "",
                        destination: d.destination || d.stations?.[0] || "",
                        via: d.via || d.stations?.[1] || "",
                        note: d.note || "",
                        operator: d.operator || "",
                        station: d.station || ""
                    })
                );
            } catch { }
        }));
    } catch (error) {
        await Salamander.ui.notify(
            `${strings.error || "Error:"} ${String(error)}`,
            strings.name || "Tabule SprŽel",
            3000
        );
    }
}

async function handleRefreshDepartures(strings) {
    await handleListDepartures();
}

async function handleOpenDepartures(strings) {
    if (!strings) {
        strings = await getStringsAsync(await detectLocale());
    }

    const urls = await getConfiguredUrls();
    if (!urls.length) {
        await handleConfigureUrl(strings);
    } else {
        await handleListDepartures();
    }
}

async function handleViewDeparture() {
    const strings = await getStringsAsync(await detectLocale());

    const item = Salamander.invocation.item || {};
    const id = String(item.id || "");
    if (!id.startsWith("dep-")) return;

    let details = departureDetailsById.get(id);
    if (!details) {
        try {
            const raw = await Salamander.storage.get(`departure.${id}`, "");
            if (raw) details = JSON.parse(raw);
        } catch { }
    }
    details = details || {};

    const detailRows = [
        [strings.detailTrain || "Train:", details.train],
        [strings.detailTrainNumber || "Train No.:", details.trainNumber],
        [strings.detailDepartureTime || "Departure:", details.departureTime],
        [strings.detailDelay || "Delay:", details.delay],
        [strings.detailActualDepartureTime || "Actual Departure:", details.actualDepartureTime],
        [strings.detailPlatform || "Platform:", details.platform],
        [strings.detailTrack || "Track:", details.track],
        [strings.detailSector || "Sector:", details.sector],
        [strings.detailLine || "Line:", details.line],
        [strings.detailDestination || "Destination:", details.destination],
        [strings.detailVia || "Via:", details.via],
        [strings.detailOperator || "Operator:", details.operator],
        [strings.detailStation || "Station:", details.station],
        [strings.detailNote || "Note:", details.note]
    ]
        .filter(([, value]) => String(value ?? "").trim())
        .map(([label, value]) => `${label} ${String(value).replace(/\r?\n/g, "\r\n")}`);

    const title = item.name
        ? `${strings.name || "Tabule SprŽel"} — ${item.name}`
        : strings.name || "Tabule SprŽel";
    const vagonwebUrl = buildVagonwebUrl(details);
    const detailsText = detailRows.join("\r\n");
    if (typeof Salamander.ui.dialog === "function") {
        let dialog;
        try {
            const color = (red, green, blue) => red | (green << 8) | (blue << 16);
            const palette = {
                header: color(0x00, 0x4c, 0x9f),
                accent: color(0x00, 0x66, 0xc9),
                body: color(0xef, 0xf8, 0xfe),
                block: color(0xd2, 0xea, 0xfd),
                blockAlt: color(0xe6, 0xf3, 0xfd),
                text: color(0x00, 0x2d, 0x77),
                muted: color(0x5d, 0x7c, 0xb1),
                white: color(0xff, 0xff, 0xff),
                green: color(0x2a, 0x9b, 0x5f),
                orange: color(0xff, 0x52, 0x00)
            };
            const bold = 0x10082;
            const clean = (value, fallback = "—") => {
                const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
                return text || fallback;
            };
            const shortLabel = (value) => clean(value, "").replace(/:\s*$/, "").toUpperCase();
            const addStatic = (id, text, x, y, width, height, options = {}) => dialog.addControl(
                "statictext",
                id,
                text,
                { x, y, width, height },
                options
            );
            const addBlock = (id, x, y, width, height, backgroundColor) => addStatic(
                id,
                "",
                x,
                y,
                width,
                height,
                { textColor: backgroundColor, backgroundColor }
            );
            const addField = async (id, label, value, x, y, width, backgroundColor = palette.blockAlt) => {
                await addStatic(
                    `${id}-label`,
                    `${label}  ${clean(value)}`,
                    x + 8,
                    y + 5,
                    width - 16,
                    24,
                    { textColor: palette.text, backgroundColor }
                );
            };

            const carrierCode = vagonwebCarrierCode(details.operator) || clean(details.operator, "").slice(0, 4).toUpperCase();
            const carrierName = clean(details.operator, carrierCode);
            const trainName = clean(details.train, "Train");
            const trainNumber = clean(details.trainNumber);
            const station = clean(details.station);
            const note = clean(details.note, "");
            const routeY = 194;
            const noteY = routeY + 52;
            const formationY = note ? noteY + 48 : noteY;
            const formationHeight = vagonwebUrl ? 42 : 0;
            const dialogHeight = formationY + formationHeight + 42;

            dialog = await Salamander.ui.dialog(title, { width: 700, height: dialogHeight }).create();

            await addBlock("body-background", 0, 0, 700, dialogHeight, palette.body);
            await addBlock("header-background", 0, 0, 700, 58, palette.header);
            await addBlock("header-accent", 580, 0, 120, 58, palette.accent);
            await addStatic("carrier-name", carrierName, 16, 8, 180, 18, {
                styleFlags: bold,
                textColor: palette.white,
                backgroundColor: palette.header
            });
            await addStatic("carrier-code", carrierCode, 16, 29, 70, 18, {
                textColor: palette.white,
                backgroundColor: palette.header
            });
            await addStatic("train-badge", "▣", 212, 10, 30, 32, {
                styleFlags: bold,
                textColor: palette.white,
                backgroundColor: palette.header
            });
            await addStatic("train-name", `${trainName}  ${trainNumber}`, 248, 9, 320, 25, {
                styleFlags: bold,
                textColor: palette.white,
                backgroundColor: palette.header
            });
            await addStatic("train-meta", `${shortLabel(strings.detailDepartureTime || "Departure:")}: ${clean(details.departureTime)}`, 248, 34, 320, 16, {
                textColor: palette.white,
                backgroundColor: palette.header
            });

            const fields = [
                ["train", "◉", strings.detailTrain || "Train:", details.train],
                ["number", "#", strings.detailTrainNumber || "Train No.:", details.trainNumber],
                ["departure", "◷", strings.detailDepartureTime || "Departure:", details.departureTime],
                ["delay", "!", strings.detailDelay || "Delay:", details.delay],
                ["station", "⌂", strings.detailStation || "Station:", station],
                ["platform", "P", strings.detailPlatform || "Platform:", details.platform],
                ["track", "▤", strings.detailTrack || "Track:", details.track],
                ["sector", "S", strings.detailSector || "Sector:", details.sector],
                ["actual", "◷", strings.detailActualDepartureTime || "Actual:", details.actualDepartureTime],
                ["operator", "", strings.detailOperator || "Operator:", details.operator]
            ];
            const fieldWidth = 136;
            for (let index = 0; index < fields.length; index += 1) {
                const [id, symbol, label, value] = fields[index];
                const column = index % 5;
                const row = Math.floor(index / 5);
                const x = 12 + column * fieldWidth;
                const y = 68 + row * 38;
                await addField(id, `${symbol} ${shortLabel(label)}`, value, x, y, fieldWidth, row === 1 ? palette.block : palette.blockAlt);
            }

            await addBlock("route-divider", 12, routeY - 5, 676, 1, palette.accent);
            await addStatic("route-label", `${shortLabel(strings.detailLine || "Line:")}  ${clean(details.line)}`, 16, routeY + 4, 150, 18, {
                styleFlags: bold,
                textColor: palette.text,
                backgroundColor: palette.body
            });
            await addStatic("route-destination", `↗  ${clean(details.destination)}`, 176, routeY + 4, 285, 18, {
                styleFlags: bold,
                textColor: palette.text,
                backgroundColor: palette.body
            });
            await addStatic("route-via", `${shortLabel(strings.detailVia || "Via:")}  ${clean(details.via)}`, 466, routeY + 4, 218, 18, {
                textColor: palette.muted,
                backgroundColor: palette.body
            });

            if (note) {
                await addBlock("note-background", 12, noteY, 676, 38, palette.block);
                await addStatic("note", `i  ${shortLabel(strings.detailNote || "Note:")}  ${note}`, 22, noteY + 9, 656, 20, {
                    textColor: palette.text,
                    backgroundColor: palette.block
                });
            }

            if (vagonwebUrl) {
                await addBlock("formation-background", 12, formationY, 676, formationHeight, palette.blockAlt);
                await addStatic("formation-icon", "▣", 22, formationY + 10, 24, 20, {
                    styleFlags: bold,
                    textColor: palette.text,
                    backgroundColor: palette.blockAlt
                });
                await addStatic("formation-label", strings.detailComposition || "Train formation:", 50, formationY + 6, 150, 16, {
                    textColor: palette.muted,
                    backgroundColor: palette.blockAlt
                });
                await dialog.addControl(
                    "hyperlink",
                    "formation-link",
                    vagonwebUrl,
                    { x: 50, y: formationY + 22, width: 630, height: 16 },
                    { styleFlags: 0x14, actionOpen: vagonwebUrl, textColor: palette.accent, backgroundColor: palette.blockAlt }
                );
            }

            await dialog.addControl(
                "button",
                "close",
                "OK",
                { x: 620, y: dialogHeight - 34, width: 50, height: 24 },
                { dialogResult: 1, styleFlags: 0x100000 }
            );
            try {
                await dialog.show();
            } finally {
                await dialog.close();
            }
            return;
        } catch {
            if (dialog) {
                try { await dialog.close(); } catch { }
            }
        }
    }

    await Salamander.ui.messageBox(
        vagonwebUrl
            ? `${detailsText}\r\n\r\n${strings.detailComposition || "Train formation:"} ${vagonwebUrl}`
            : detailsText,
        title,
        "OK",
        "Information"
    );
}

const handler = Salamander.commandHandler || Salamander.command_handler;

if (handler === "listDepartures") {
    await handleListDepartures();
} else if (handler === "openDepartures" || handler === "open") {
    await handleOpenDepartures();
} else if (handler === "viewDeparture") {
    await handleViewDeparture();
} else if (handler === "configureUrl" || handler === "configure") {
    await handleConfigureUrl();
}

if (handler === "listDepartures" && !scraperRunning) {
    const urls = await getConfiguredUrls();
    if (urls.length) {
        void startScraper();
    }
}
