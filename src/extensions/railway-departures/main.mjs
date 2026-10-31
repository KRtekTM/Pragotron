import { watch } from "node:fs";
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(EXTENSION_DIR, "config.json");
const DEPARTURE_DETAILS_TEMPLATE = join(EXTENSION_DIR, "departure-details.html");
const DEPARTURE_RUNTIME_DIR = join(tmpdir(), "pragotron-departure-runtime");
const CONFIG_FALLBACK_FILE = join(DEPARTURE_RUNTIME_DIR, "config.json");
const DEPARTURE_DETAILS_CACHE_FILE = join(DEPARTURE_RUNTIME_DIR, "details.json");
const DEPARTURE_LIVE_FEED_FILE = join(DEPARTURE_RUNTIME_DIR, "details-feed.js");
const DEPARTURE_DETAILS_HTML_FILE = join(DEPARTURE_RUNTIME_DIR, "details.html");
const DEPARTURE_DETAILS_STATE_FILE = join(DEPARTURE_RUNTIME_DIR, "details-window.json");
const DEPARTURE_DETAILS_WEBVIEW_DATA = join(DEPARTURE_RUNTIME_DIR, "details-webview-data");
const DEPARTURE_DETAILS_LAUNCH_FILE = join(DEPARTURE_RUNTIME_DIR, "details-launch.json");
const DEPARTURE_FORMATION_CACHE_FILE = join(DEPARTURE_RUNTIME_DIR, "formation-cache.json");
const FAVORITE_COMMANDS_FILE = join(DEPARTURE_RUNTIME_DIR, "favorite-commands.json");
const STATION_GROUP_SNAPSHOT_FILE = join(DEPARTURE_RUNTIME_DIR, "station-groups.json");
const CONFIGURATION_DIALOG_TEMPLATE = join(EXTENSION_DIR, "configuration.html");
const CONFIGURATION_DIALOG_HTML_FILE = join(DEPARTURE_RUNTIME_DIR, "configuration.html");
const CONFIGURATION_DIALOG_WEBVIEW_DATA = join(DEPARTURE_RUNTIME_DIR, "configuration-webview-data");
const FAVORITE_SELECTION_FILE = join(DEPARTURE_RUNTIME_DIR, "favorite-selection.json");
const CONFIGURATION_DIALOG_LAUNCHER = join(EXTENSION_DIR, "configuration-window.mjs");
const DEFAULT_REFRESH_MS = 30000;
const VAGONWEB_FETCH_TIMEOUT_MS = 10000;
const VAGONWEB_HTML_LIMIT = 8 * 1024 * 1024;
const VAGONWEB_SVG_LIMIT = 256 * 1024;

const SCRAPER_STATE_KEY = "TabuleSprZel.scraperState";
const CACHE_KEY = "TabuleSprZel.cache";
const FAVORITE_STATIONS_STORAGE_KEY = "TabuleSprZel.favoriteStations";

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

const trainTypeLogoPathFor = (train, operator, resolvedTrainType = "") => {
    const source = String(train ?? "").trim().toLocaleLowerCase("cs-CZ");
    const resolved = String(resolvedTrainType || train || "").trim().toLocaleLowerCase("cs-CZ");
    if (resolved === "regiojet") return "";
    if (resolved === "railjet") return "train-types/railjet.svg";
    if (source === "nj" || resolved === "nightjet") return "train-types/nightjet.svg";
    return {
        ic: "train-types/intercity.svg",
        ec: "train-types/eurocity.svg",
        sc: "train-types/supercity.svg",
        en: "train-types/euronight.svg"
    }[source] || "";
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
    const trainNumber = sourceTrainNumber;
    const operatorFromRemainder = numberMatch
        ? remainder.slice(remainder.indexOf(numberMatch[0]) + numberMatch[0].length).trim()
        : remainder.trim();
    const operator = divTexts.slice(1).join(" ").trim() || operatorFromRemainder;
    const trainType = resolveProfileTrainType(sourceType, operator);
    return {
        train: /^rj$/i.test(sourceType) ? "rj" : /^nj$/i.test(sourceType) ? "nj" : sourceType,
        trainType,
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
            trainType: trainData.trainType,
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
        : Buffer.from(parts.join("|"), "utf8").toString("base64");
    return "dep-" + base64.replace(/[+/=]/g, (c) => c === "+" ? "-" : c === "/" ? "_" : "");
}

function departureNavigationKey(departure) {
    return [
        departure.trainNumber || "",
        departure.departureTime || "",
        departure.destination || departure.stations?.[0] || "",
        departure.station || ""
    ].join("|");
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
        trainType: d.trainType || resolveProfileTrainType(d.train, d.operator),
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
        operator: d.operator || "",
        station: stationName || ""
    }));
}

function normalizeOperatorIconKey(operator) {
    return stripDiacritics(operator)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "");
}

// `sourceCode` is the value returned by the Správa železnic board and is the
// value shown in the departure detail. `vagonwebCode` is intentionally kept
// separate because VagonWEB uses different codes for some carriers.
const CARRIER_PROFILES = Object.freeze([
    { name: "České dráhy", vagonwebCode: "CD", aliases: ["CD", "ČD", "CESKEDRAHY"] },
    { name: "RegioJet", vagonwebCode: "RJ", aliases: ["RJ", "RJET", "REGIOJET"] },
    { name: "Leo Express", vagonwebCode: "LE", aliases: ["LE", "LEO", "LEOEXPRESS"] },
    { name: "Arriva vlaky", vagonwebCode: "ARV", aliases: ["ARR", "ARV", "ARRIVA", "ARRIVAVLAKY"] },
    { name: "AŽD Praha", vagonwebCode: "AŽD", aliases: ["AZD", "AŽD", "AZDPRAHA"] },
    { name: "Die Länderbahn", vagonwebCode: "DLB", aliases: ["DLB", "LANDERBAHN", "DIELANDERBAHN"] },
    { name: "GW Train Regio", vagonwebCode: "GWTR", aliases: ["GWTR", "GWTRAIN", "GWTRAINREGIO"] },
    { name: "Osoblažská úzkorozchodná dráha", vagonwebCode: "OÚD", aliases: ["OUD", "OÚD", "OSOBLAZSKAUZKOROZCHODNIDRAHA"] },
    { name: "KŽC Doprava", vagonwebCode: "KŽC", aliases: ["KZC", "KŽC", "KZCDOPRAVA"] },
    { name: "Gepard Express", vagonwebCode: "GE", aliases: ["GE", "GEPARDEXPRESS"] },
    { name: "Železničná spoločnosť Slovensko", vagonwebCode: "ZSSK", aliases: ["ZSSK", "ZELEZNICNASPOLOCNOSTSLOVENSKO"] },
    { name: "RegioJet Slovensko", vagonwebCode: "RJSK", aliases: ["RJSK", "REGIOJETSLOVENSKO"] },
    { name: "Leo Express Slovensko", vagonwebCode: "LESK", aliases: ["LESK", "LEOEXPRESSSLOVENSKO"] },
    { name: "Trenčianska elektrická železnica", vagonwebCode: "TREŽ", aliases: ["TREZ", "TREŽ", "TRENCIANSKAELEKTRICKAZELEZNICA"] },
    { name: "PKP Intercity", vagonwebCode: "PKPIC", aliases: ["PKP", "PKPIC", "PKPINTERCITY"] },
    { name: "Polregio", vagonwebCode: "PREG", aliases: ["PREG", "POLREGIO"] },
    { name: "RegioJet Polska", vagonwebCode: "RJPL", aliases: ["RJPL", "REGIOJETPOLSKA"] },
    { name: "Leo Express Polska", vagonwebCode: "LEPL", aliases: ["LEPL", "LEOEXPRESSPOLSKA"] },
    { name: "Österreichische Bundesbahnen", vagonwebCode: "ÖBB", aliases: ["OBB", "ÖBB", "OEBB", "OSTERREICHISCHEBUNDESBAHNEN"] },
    { name: "Deutsche Bahn", vagonwebCode: "DB", aliases: ["DB", "DEUTSCHEBAHN"] },
    { name: "MÁV", vagonwebCode: "MÁV", aliases: ["MAV", "MÁV", "MAVSZEMELYSZALLITASIZRT"] }
]);

const findCarrierProfile = (operator) => {
    const key = normalizeOperatorIconKey(operator);
    if (!key) return null;
    return CARRIER_PROFILES.find(({ aliases }) => aliases.some((alias) => {
        const normalizedAlias = normalizeOperatorIconKey(alias);
        return key === normalizedAlias || (normalizedAlias.length > 3 && key.includes(normalizedAlias));
    })) || null;
};

const resolveCarrier = (operator) => {
    const sourceCode = departureHtmlValue(operator, "");
    const profile = findCarrierProfile(sourceCode);
    return {
        sourceCode,
        name: profile?.name || sourceCode,
        vagonwebCode: profile?.vagonwebCode || ""
    };
};

const vagonwebCarrierCode = (operator) => resolveCarrier(operator).vagonwebCode;

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
    const category = carrier === "LE" ? "" : vagonwebCategory(details.train);
    const number = String(details.trainNumber || "").trim();
    if (!carrier || (carrier !== "LE" && !category) || !/^\d+$/.test(number)) return "";

    const params = new URLSearchParams({
        zeme: carrier,
        kategorie: category,
        cislo: number,
        ...(carrier === "LE" ? { nazev: "Leo Express" } : {}),
        rok: String(new Date().getFullYear())
    });
    return `https://www.vagonweb.cz/razeni/vlak.php?${params}`;
}

function getCarrierDetailIconPath(operator) {
    switch (String(operator || "").toUpperCase()) {
        case "RJET":
            return "operators/RJET_details.svg";
        case "ARV":
        case "ARR":
            return "operators/ARR_details.svg";
        case "CD":
        case "ČD":
            return "operators/CD_details.svg";
        case "AŽD":
            return "operators/AŽD.svg";
        default:
            return "operators/SPRŽEL.svg";
    }
}

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const departureHtmlValue = (value, fallback = "—") => {
    const text = String(value ?? "")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text || fallback;
};

const departureHtmlLabel = (value, fallback) => escapeHtml(
    departureHtmlValue(value || fallback).replace(/:\s*$/, "")
);

const isSafeVagonwebUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "www.vagonweb.cz";
    } catch {
        return false;
    }
};

const VAGONWEB_ALLOWED_TAGS = new Set([
    "a", "b", "br", "div", "em", "i", "img", "p", "small", "span", "strong", "sub", "sup",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr"
]);
const VAGONWEB_VOID_TAGS = new Set(["br", "img"]);
const VAGONWEB_ALLOWED_ATTRIBUTES = new Set([
    "alt", "align", "cellpadding", "cellspacing", "class", "colspan", "height",
    "rowspan", "title", "valign", "width"
]);

const resolveVagonwebResource = (value, baseUrl) => {
    try {
        const url = new URL(decodeHtml(value), baseUrl);
        if (url.protocol !== "https:" || url.hostname !== "www.vagonweb.cz") return "";
        return url.href;
    } catch {
        return "";
    }
};

const extractElementById = (html, id) => {
    const opening = new RegExp(
        `<([a-z][a-z0-9:-]*)\\b(?=[^>]*\\bid\\s*=\\s*(["'])${id}\\2)[^>]*>`,
        "i"
    ).exec(html);
    if (!opening) return "";

    const tagName = opening[1].toLowerCase();
    const start = opening.index;
    const contentStart = start + opening[0].length;
    const tags = /<\/?([a-z][a-z0-9:-]*)(?:\s[^>]*)?>/gi;
    tags.lastIndex = contentStart;
    let depth = 1;
    let match;
    while ((match = tags.exec(html))) {
        const tag = match[1].toLowerCase();
        if (tag !== tagName || VAGONWEB_VOID_TAGS.has(tag) || /\/\s*>$/.test(match[0])) continue;
        if (match[0][1] === "/") depth -= 1;
        else depth += 1;
        if (depth === 0) return html.slice(start, tags.lastIndex);
    }
    return html.slice(start);
};

const extractVagonwebShowUrl = (html, baseUrl) => {
    for (const match of String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        if (cleanText(match[2]).toLocaleLowerCase("cs-CZ") !== "zobrazit") continue;
        const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[1]);
        const resolved = resolveVagonwebResource(href?.[1] ?? href?.[2] ?? href?.[3] ?? "", baseUrl);
        if (resolved) return resolved;
    }
    return "";
};

const sanitizeVagonwebFormation = (html, baseUrl) => {
    const withoutActiveContent = String(html)
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>[\s\S]*?(?:<\/\s*\1\s*>|$)/gi, "")
        .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi, "");

    return withoutActiveContent.replace(/<\s*(\/?)\s*([a-z][a-z0-9:-]*)([^>]*)>/gi, (full, closing, rawTag, rawAttributes) => {
        const tag = rawTag.toLowerCase();
        if (!VAGONWEB_ALLOWED_TAGS.has(tag)) return "";
        if (closing) return `</${tag}>`;
        const attributes = [];
        for (const attribute of rawAttributes.matchAll(/([a-z_:][a-z0-9_.:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi)) {
            const name = attribute[1].toLowerCase();
            const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
            if (name === "src" && tag === "img") {
                const source = resolveVagonwebResource(value, baseUrl);
                if (source) attributes.push(`src="${escapeHtml(source)}"`);
                continue;
            }
            if (name === "href" && tag === "a") {
                const href = resolveVagonwebResource(value, baseUrl);
                if (href) attributes.push(`href="${escapeHtml(href)}"`);
                continue;
            }
            if (VAGONWEB_ALLOWED_ATTRIBUTES.has(name)) {
                attributes.push(`${name}="${escapeHtml(value)}"`);
            }
        }
        if (tag === "img" && !attributes.some((attribute) => attribute.startsWith("src=\""))) return "";
        return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}${VAGONWEB_VOID_TAGS.has(tag) ? " /" : ""}>`;
    }).replace(/Pl[áa]novan[ée] [rŘ]azen[íi]/gi, "");
};

const inlineVagonwebPictograms = async (html, request) => {
    const replacements = new Map();
    const sources = new Set();
    for (const match of String(html).matchAll(/<img\b[^>]*>/gi)) {
        const className = /\bclass="([^"]*)"/i.exec(match[0])?.[1] || "";
        const source = /\bsrc="([^"]*)"/i.exec(match[0])?.[1] || "";
        if (!className.split(/\s+/).includes("pikto") || !source) continue;
        try {
            const url = new URL(decodeHtml(source));
            if (url.protocol === "https:" && url.hostname === "www.vagonweb.cz" && url.pathname.toLowerCase().endsWith(".svg")) {
                sources.add(url.href);
            }
        } catch { }
    }

    for (const source of sources) {
        try {
            const response = await request(source);
            if (!response.ok) continue;
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length > VAGONWEB_SVG_LIMIT) continue;
            const svg = Buffer.from(bytes).toString("utf8").replace(/fill:(\s*)#00c\b/g, "fill:$1#0066c9");
            replacements.set(source, `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`);
        } catch { }
    }

    if (!replacements.size) return html;
    return String(html).replace(/<img\b[^>]*>/gi, (image) => {
        const className = /\bclass="([^"]*)"/i.exec(image)?.[1] || "";
        const sourceMatch = /\bsrc="([^"]*)"/i.exec(image);
        if (!className.split(/\s+/).includes("pikto") || !sourceMatch) return image;
        let source;
        try {
            source = new URL(decodeHtml(sourceMatch[1])).href;
        } catch {
            return image;
        }
        const replacement = replacements.get(source);
        return replacement ? image.replace(sourceMatch[0], `src="${replacement}"`) : image;
    });
};

async function fetchVagonwebFormation(vagonwebUrl, formationErrorText = "Train formation could not be loaded.") {
    if (!isSafeVagonwebUrl(vagonwebUrl)) {
        return { html: "", error: null };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VAGONWEB_FETCH_TIMEOUT_MS);
    try {
        const cookies = new Map();
        let previousUrl = "";
        const rememberCookies = (response) => {
            const values = typeof response.headers.getSetCookie === "function"
                ? response.headers.getSetCookie()
                : [response.headers.get("set-cookie")].filter(Boolean);
            for (const value of values) {
                const pair = String(value).split(";", 1)[0];
                const separator = pair.indexOf("=");
                if (separator <= 0) continue;
                const name = pair.slice(0, separator).trim();
                const cookieValue = pair.slice(separator + 1).trim();
                if (!cookieValue) cookies.delete(name);
                else cookies.set(name, cookieValue);
            }
        };
        const request = async (url, options = {}) => {
            const headers = new Headers(options.headers);
            headers.set("user-agent", "TabuleSprZel/1.1 (train departure details)");
            if (cookies.size) headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
            if (previousUrl && !headers.has("referer")) headers.set("referer", previousUrl);
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });
            rememberCookies(response);
            previousUrl = response.url || String(url);
            return response;
        };
        const response = await request(vagonwebUrl);
        if (!response.ok) throw new Error(`Vagonweb returned HTTP ${response.status}.`);
        let html = await response.text();
        if (html.length > VAGONWEB_HTML_LIMIT) throw new Error("Vagonweb response is too large.");
        let block = extractElementById(html, "planovane_razeni");
        let blockBaseUrl = vagonwebUrl;
        if (!block) {
            const pageUrl = new URL(vagonwebUrl);
            const showUrl = extractVagonwebShowUrl(html, pageUrl);
            if (showUrl) {
                const showResponse = await request(showUrl);
                if (!showResponse.ok) throw new Error(`Vagonweb detail returned HTTP ${showResponse.status}.`);
                const showHtml = await showResponse.text();
                if (showHtml.length > VAGONWEB_HTML_LIMIT) throw new Error("Vagonweb detail is too large.");
                block = extractElementById(showHtml, "planovane_razeni");
                blockBaseUrl = showUrl;
            }
        }
        if (!block) {
            const pageUrl = new URL(vagonwebUrl);
            const common = {
                rok: pageUrl.searchParams.get("rok") || String(new Date().getFullYear()),
                zeme: pageUrl.searchParams.get("zeme") || "",
                cislo: pageUrl.searchParams.get("cislo") || "",
                nazev: "_n_",
                styl: "r",
                aktualni_rok: String(new Date().getFullYear()),
                cislo_vozu: "",
                virtualni_vlak: "",
                cislo_alias: ""
            };
            const calendarUrl = new URL("ajax_kalendar_planovany.php", pageUrl);
            const calendarResponse = await request(calendarUrl, {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: new URLSearchParams(common)
            });
            if (!calendarResponse.ok) throw new Error(`Vagonweb calendar returned HTTP ${calendarResponse.status}.`);
            const calendar = await calendarResponse.text();
            if (calendar.length > VAGONWEB_HTML_LIMIT) throw new Error("Vagonweb calendar is too large.");
            const dateCell = [...calendar.matchAll(/<td\b[^>]*>/gi)]
                .map((match) => match[0])
                .find((tag) => /\bod\s*=\s*["'][^"']+["']/i.test(tag) && /\bdo\s*=\s*["'][^"']+["']/i.test(tag));
            const dateStart = /\bod\s*=\s*["']([^"']+)["']/i.exec(dateCell || "")?.[1];
            const dateEnd = /\bdo\s*=\s*["']([^"']+)["']/i.exec(dateCell || "")?.[1];
            if (!dateStart || !dateEnd) throw new Error("Vagonweb has no planned formation date range.");

            const formationUrl = new URL("ajax_dalsi_razeni_vlak.php", pageUrl);
            const formationResponse = await request(formationUrl, {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: new URLSearchParams({ ...common, od: dateStart, do_x: dateEnd })
            });
            if (!formationResponse.ok) throw new Error(`Vagonweb formation returned HTTP ${formationResponse.status}.`);
            const formationResponseHtml = await formationResponse.text();
            if (formationResponseHtml.length > VAGONWEB_HTML_LIMIT) throw new Error("Vagonweb formation is too large.");
            block = extractElementById(
                `<div id="planovane_razeni">${formationResponseHtml}</div>`,
                "planovane_razeni"
            );
        }
        if (!block) throw new Error("Vagonweb did not contain #planovane_razeni.");
        const sanitized = await inlineVagonwebPictograms(
            sanitizeVagonwebFormation(block, blockBaseUrl),
            request
        );
        if (!sanitized) throw new Error("Vagonweb formation could not be sanitized.");
        return { html: sanitized, error: null };
    } catch (error) {
        return {
            html: `<div class="formation-status">${escapeHtml(String(formationErrorText || "Train formation could not be loaded."))}</div>`,
            error
        };
    } finally {
        clearTimeout(timeout);
    }
}

let departureDetailsTemplatePromise = null;
const departureDetailsIconPromises = new Map();

const readDepartureDetailsTemplate = () => {
    if (!departureDetailsTemplatePromise) {
        departureDetailsTemplatePromise = readFile(DEPARTURE_DETAILS_TEMPLATE, "utf8")
            .catch((error) => {
                departureDetailsTemplatePromise = null;
                throw error;
            });
    }
    return departureDetailsTemplatePromise;
};

const readDepartureDetailsIcon = (relativePath) => {
    if (!departureDetailsIconPromises.has(relativePath)) {
        const promise = readFile(join(EXTENSION_DIR, "icons", relativePath))
            .then((content) => content.toString("base64"))
            .catch((error) => {
                departureDetailsIconPromises.delete(relativePath);
                throw error;
            });
        departureDetailsIconPromises.set(relativePath, promise);
    }
    return departureDetailsIconPromises.get(relativePath);
};

const renderDepartureDetailsTemplate = (template, values) => template.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    (full, key) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : full
);

async function buildDepartureDetailsFromTemplate(
    details,
    strings,
    title,
    vagonwebUrl,
    formation,
    { itemId = "", liveFeedFile = "" } = {}
) {
    const template = await readDepartureDetailsTemplate();
    const value = (input, fallback) => escapeHtml(departureHtmlValue(input, fallback));
    const label = (input, fallback) => departureHtmlLabel(input, fallback);
    const icon = async (relativePath) => escapeHtml(
        `data:image/svg+xml;base64,${await readDepartureDetailsIcon(relativePath)}`
    );
    const operator = departureHtmlValue(details.operator, "");
    const carrier = resolveCarrier(operator);
    const operatorKey = operator.toUpperCase();
    const operatorIcon = getCarrierDetailIconPath(operatorKey);
    const [sprzel, trainDark, trainWhite, trainCircle, time, calendar, location, via, info, headerStripes, line, station] = await Promise.all([
        icon(operatorIcon),
        icon("picto/picto-train-darkblue.svg"),
        icon("picto/picto-train-white.svg"),
        icon("picto/picto-train-circle.svg"),
        icon("picto/picto-time.svg"),
        icon("picto/picto-calendar.svg"),
        icon("picto/picto-location.svg"),
        icon("picto/picto-via.svg"),
        icon("picto/picto-info.svg"),
        icon("picto/picto-header-stripes.svg"),
        icon("picto/picto-line.svg"),
        icon("sprzel.svg")
    ]);
    const carrierName = departureHtmlValue(carrier.name, "Carrier");
    const trainTypeLogoPath = trainTypeLogoPathFor(
        details.train,
        details.operator,
        details.trainType
    );
    const trainTypeLogo = trainTypeLogoPath ? await icon(trainTypeLogoPath) : "";
    const config = await readConfigFile();
    const colors = String(config.departureDetails?.colors || "light");
    const colorsCss = colors === "dark" ? "colors-dark.css" : "colors-light.css";
    const stylesheet = (relativePath) => escapeHtml(
        pathToFileURL(join(EXTENSION_DIR, relativePath)).href
    );
    const scriptValue = (input) => JSON.stringify(String(input ?? ""))
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
    const safeUrl = isSafeVagonwebUrl(vagonwebUrl) ? escapeHtml(vagonwebUrl) : "";
    const hasFormationUrl = Boolean(safeUrl);
    let delayMinutes = Number(details.delayMinutes ?? 0);
    if (!delayMinutes && details.delay) {
        const parsedDelay = Number(String(details.delay).match(/\d+/)?.[0]);
        if (!Number.isNaN(parsedDelay)) delayMinutes = parsedDelay;
    }
    const delayClass = delayMinutes > 20 ? "icon-delay--red" : delayMinutes > 0 ? "icon-delay--yellow" : "icon-delay--green";
    const values = {
        LANG: value(strings.detailPageLanguage, "en"),
        TITLE: escapeHtml(title),
        CARRIER_CODE: value(operatorKey || "—"),
        CARRIER_NAME: value(carrierName),
        OPERATOR: value(operator),
        TRAIN: value(details.train, "Train"),
        TRAIN_NUMBER: value(details.trainNumber),
        DEPARTURE: value(details.departureTime),
        DELAY: value(details.delay),
        STATION: value(details.station),
        PLATFORM: value(details.platform),
        TRACK: value(details.track),
        SECTOR: value(details.sector),
        ACTUAL_DEPARTURE: value(details.actualDepartureTime),
        LINE: value(details.line),
        DESTINATION: value(details.destination),
        VIA: value(details.via),
        NOTE: value(details.note),
        NOTE_CLASS: "",
        FORMATION_CLASS: hasFormationUrl ? "" : "is-empty",
        FORMATION_HTML: formation?.html || "",
        VAGONWEB_URL: safeUrl,
        COLORS_CSS: stylesheet(colorsCss),
        DETAILS_CSS: stylesheet("departure_details.css"),
        VAGONWEB_CSS: stylesheet("vagonweb.css"),
        DELAY_CLASS: delayClass,
        ICON_SPRZEL: sprzel,
        ICON_TRAIN_TYPE_LOGO: trainTypeLogo,
        ICON_TRAIN_DARK: trainDark,
        ICON_TRAIN_WHITE: trainWhite,
        ICON_TRAIN_CIRCLE: trainCircle,
        ICON_TIME: time,
        ICON_CALENDAR: calendar,
        ICON_LOCATION: location,
        ICON_VIA: via,
        ICON_INFO: info,
        ICON_HEADER_STRIPES: headerStripes,
        ICON_LINE: line,
        ICON_STATION: station,
        FORMATION_LINK_FIRST: value(strings.detailFormationLinkFirst, "View formation"),
        FORMATION_LINK_SECOND: value(strings.detailFormationLinkSecond, "on vagonWEB →"),
        LIVE_ITEM_ID: scriptValue(itemId),
        LIVE_ITEM_KEY: scriptValue(departureNavigationKey(details)),
        LIVE_FEED_URL: scriptValue(pathToFileURL(liveFeedFile).href),
        LIVE_FORMATION_ENDPOINT: scriptValue("__PRAGOTRON_FORMATION_ENDPOINT__"),
        LIVE_SELECTION_ENDPOINT: scriptValue("__PRAGOTRON_SELECTION_ENDPOINT__"),
        LIVE_NAVIGATE_ENDPOINT: scriptValue("__PRAGOTRON_NAVIGATE_ENDPOINT__"),
        LIVE_FORMATION_URL: scriptValue(vagonwebUrl),
        LABEL_TRAIN: label(strings.detailTrain, "Train:"),
        LABEL_TRAIN_NUMBER: label(strings.detailTrainNumber, "Train No.:"),
        LABEL_DEPARTURE: label(strings.detailDepartureTime, "Departure:"),
        LABEL_DELAY: label(strings.detailDelay, "Delay:"),
        LABEL_STATION: label(strings.detailStation, "Station:"),
        LABEL_PLATFORM: label(strings.detailPlatform, "Platform:"),
        LABEL_TRACK: label(strings.detailTrack, "Track:"),
        LABEL_SECTOR: label(strings.detailSector, "Sector:"),
         LABEL_ACTUAL: label(strings.detailActualDepartureTime, "Actual Departure:"),
         LABEL_OPERATOR: label(strings.detailOperator, "Operator:"),
         LABEL_LINE: label(strings.detailLine, "Line:"),
         LABEL_DESTINATION: label(strings.detailDestination, "Destination:"),
         LABEL_VIA: label(strings.detailVia, "Via:"),
        LABEL_NOTE: label(strings.detailNote, "Note:"),
        LABEL_COMPOSITION: label(strings.detailComposition, "Train formation:")
    };
    return renderDepartureDetailsTemplate(template, values);
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

function buildItems(departures, operatorIconFiles = new Set(), stationName = "") {
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
                trainType: d.trainType || resolveProfileTrainType(d.train, d.operator),
                trainTypeLogo: trainTypeLogoPathFor(d.train, d.operator, d.trainType),
                trainNumber: d.trainNumber,
                departureTime: d.departureTime,
            delay: formatDelay(d.delay),
            delayMinutes: Number(d.delay || 0),
            actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, now),
                platform: d.platform,
                track: d.track,
                sector: d.sector,
                line: d.line || "",
                destination: d.destination || d.stations?.[0] || "",
                via: d.via || d.stations?.[1] || "",
                note: d.note || "",
                operator: d.operator || "",
                station: d.station || stationName || ""
            }
        };
    });

    departureDetailsById.clear();
    for (const d of departures) {
        const depId = makeDepartureId(d);
        departureDetailsById.set(depId, {
            train: d.train,
            trainType: d.trainType || resolveProfileTrainType(d.train, d.operator),
            trainTypeLogo: trainTypeLogoPathFor(d.train, d.operator, d.trainType),
            trainNumber: d.trainNumber,
            departureTime: d.departureTime,
            delay: formatDelay(d.delay),
            delayMinutes: Number(d.delay || 0),
            actualDepartureTime: formatActualDepartureWithDate(d.departureTime, d.delay, now),
            platform: d.platform,
            track: d.track,
            sector: d.sector,
            line: d.line || "",
            destination: d.destination || d.stations?.[0] || "",
            via: d.via || d.stations?.[1] || "",
            note: d.note || "",
            operator: d.operator || "",
            station: d.station || stationName || ""
        });
    }

    return items;
}

async function readConfigFile() {
    for (const configPath of [CONFIG_FILE, CONFIG_FALLBACK_FILE]) {
        try {
            const text = await readFile(configPath, "utf8");
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.urls)) {
                return parsed;
            }
            if (typeof parsed.url === "string" && parsed.url) {
                return { urls: [parsed.url], refreshMs: parsed.refreshMs };
            }
        } catch { }
    }
    return { urls: [], refreshMs: DEFAULT_REFRESH_MS };
}

async function writeConfigFile(config) {
    const text = JSON.stringify(config, null, 2);
    for (const configPath of [CONFIG_FILE, CONFIG_FALLBACK_FILE]) {
        try {
            await mkdir(dirname(configPath), { recursive: true });
            const temporaryPath = `${configPath}.${randomUUID()}.tmp`;
            try {
                await writeFile(temporaryPath, text, "utf8");
                try {
                    await rename(temporaryPath, configPath);
                } catch (error) {
                    // Windows does not replace an existing file with rename().
                    if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
                    await rm(configPath, { force: true });
                    await rename(temporaryPath, configPath);
                }
            } finally {
                await rm(temporaryPath, { force: true }).catch(() => { });
            }
            if (configPath === CONFIG_FILE) {
                await rm(CONFIG_FALLBACK_FILE, { force: true }).catch(() => { });
            }
            await rm(STATION_GROUP_SNAPSHOT_FILE, { force: true }).catch(() => { });
            configuredStationsSnapshot = null;
            configuredStationsPromise = null;
            stationGroupsSnapshot = null;
            return true;
        } catch { }
    }
    return false;
}

let configuredStationsSnapshot = null;
let configuredStationsPromise = null;
let stationGroupsSnapshot = null;

const configuredStationsForConfig = (config) => {
    if (!Array.isArray(config?.urls)) return [];
    return config.urls
        .map((entry) => {
            if (typeof entry === "string") {
                return { url: entry.trim(), name: "", favorite: false };
            }
            return {
                url: String(entry?.url || "").trim(),
                name: String(entry?.name || "").trim(),
                favorite: entry?.favorite === true
            };
        })
        .filter((entry) => entry.url)
        .map((entry) => Object.freeze(entry));
};

async function getConfiguredUrls() {
    return (await getConfiguredStations()).map((station) => station.url);
}

const favoritesMatch = (stations, favorites) => stations.every((station) =>
    (station.favorite === true) === favorites.has(station.url));

const withFavoriteSelection = (stations, favorites) => Object.freeze(stations.map((station) => Object.freeze({
    ...station,
    favorite: favorites.has(station.url)
})));

async function getConfiguredStations() {
    if (!configuredStationsSnapshot) {
        if (!configuredStationsPromise) {
            configuredStationsPromise = readConfigFile().then((config) => {
                configuredStationsSnapshot = Object.freeze(configuredStationsForConfig(config));
                return configuredStationsSnapshot;
            });
        }
        await configuredStationsPromise;
    }
    const favorites = await resolveFavoriteUrls();
    if (favorites && !favoritesMatch(configuredStationsSnapshot, favorites)) {
        configuredStationsSnapshot = withFavoriteSelection(configuredStationsSnapshot, favorites);
        stationGroupsSnapshot = stationGroupSnapshotFor(configuredStationsSnapshot);
    } else if (!stationGroupsSnapshot) {
        stationGroupsSnapshot = stationGroupSnapshotFor(configuredStationsSnapshot);
    }
    return configuredStationsSnapshot;
}

async function readStoredFavoriteUrls() {
    try {
        const raw = await Salamander.storage.get(FAVORITE_STATIONS_STORAGE_KEY, "");
        if (typeof raw !== "string" || !raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.some((url) => typeof url !== "string")) return null;
        return new Set(parsed.map((url) => url.trim()).filter(Boolean));
    } catch {
        return null;
    }
}

const MAX_FAVORITE_COMMANDS = 32;

const stationKeyFor = (station) =>
    station.stationKey || deriveStationKeyFromUrl(station.url);

const stationNameFor = (station) => {
    const name = String(station.name ?? station.station ?? "").trim();
    const stationKey = stationKeyFor(station);
    return name && !/^station-[A-Za-z0-9_-]+$/i.test(name)
        ? name
        : `Station ${stationKey || ""}`.trim();
};

const stationIdFor = (station) => stationNameFor(station);

const STATION_GROUP_LABELS = Object.freeze([
    "A", "B", "C", "Č", "D", "E", "F", "G", "H", "CH", "I", "J", "K", "L",
    "M", "N", "O", "P", "R", "Ř", "S", "Š", "T", "U", "Ú", "V", "Z", "Ž"
]);

const stationGroupLabelFor = (station) => {
    const name = stationNameFor(station).trim().toLocaleUpperCase("cs-CZ");
    if (name.startsWith("CH")) return "CH";
    const initial = name.charAt(0);
    return STATION_GROUP_LABELS.includes(initial) ? initial : "Z";
};

const stationGroupIdFor = (label) => label;

const legacyStationGroupIdFor = (label) => `station-group-${[...label]
    .map((character) => character.codePointAt(0).toString(16))
    .join("-")}`;

const stationPathFor = (station) => [
    stationGroupIdFor(stationGroupLabelFor(station)),
    stationIdFor(station)
].join("/");

const stationSortKeyFor = (station) =>
    `${normalizeId(stationNameFor(station)) || "station"}-${normalizeId(stationKeyFor(station))}`;

const stationItemFor = (station) => Object.freeze({
    id: stationIdFor(station),
    name: stationNameFor(station),
    directory: true,
    enabled: true,
    icon: "icon.svg",
    iconDark: "icon.svg"
});

const stationGroupSnapshotFor = (configuredStations, preparedItemsByGroupId = null) => {
    const groups = new Map(STATION_GROUP_LABELS.map((label) => [label, {
        id: stationGroupIdFor(label),
        label,
        stations: [],
        favorite: false
    }]));
    groups.set("_favorites", {
        id: "_favorites",
        label: "_favorites",
        stations: configuredStations.filter((station) => station.favorite === true),
        favorite: true
    });

    for (const station of configuredStations) {
        groups.get(stationGroupLabelFor(station)).stations.push(station);
    }
    for (const group of groups.values()) {
        group.stations.sort((a, b) => stationSortKeyFor(a).localeCompare(stationSortKeyFor(b), "cs"));
        Object.freeze(group.stations);
        Object.freeze(group);
    }

    const groupsById = new Map(
        [...groups.values()].flatMap((group) => [
            [group.id, group],
            ...(STATION_GROUP_LABELS.includes(group.label)
                ? [[legacyStationGroupIdFor(group.label), group]]
                : [])
        ])
    );
    const itemsByGroupId = new Map(
        [...groups.values()].map((group) => [
            group.id,
            Object.freeze(preparedItemsByGroupId?.get(group.id)
                || group.stations.map(stationItemFor))
        ])
    );

    return Object.freeze({ groupsById, itemsByGroupId });
};

const savePreparedStationGroupSnapshot = async (configuredStations) => {
    const snapshot = stationGroupsSnapshot || stationGroupSnapshotFor(configuredStations);
    const temporaryPath = `${STATION_GROUP_SNAPSHOT_FILE}.${randomUUID()}.tmp`;
    try {
        await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true });
        await writeFile(temporaryPath, JSON.stringify({
            version: 1,
            stations: configuredStations.map(({ url, name, favorite }) => ({ url, name, favorite })),
            itemsByGroupId: Object.fromEntries(snapshot.itemsByGroupId)
        }), "utf8");
        try {
            await rename(temporaryPath, STATION_GROUP_SNAPSHOT_FILE);
        } catch (error) {
            // Windows does not replace an existing file with rename().
            if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
            await rm(STATION_GROUP_SNAPSHOT_FILE, { force: true });
            await rename(temporaryPath, STATION_GROUP_SNAPSHOT_FILE);
        }
    } catch {
        await rm(temporaryPath, { force: true }).catch(() => { });
    }
};

const loadPreparedStationGroupSnapshot = async () => {
    if (configuredStationsSnapshot) return configuredStationsSnapshot;
    try {
        const prepared = JSON.parse(await readFile(STATION_GROUP_SNAPSHOT_FILE, "utf8"));
        if (
            prepared?.version !== 1
            || !Array.isArray(prepared.stations)
            || !prepared.itemsByGroupId
            || typeof prepared.itemsByGroupId !== "object"
        ) return null;
        let configuredStations = configuredStationsForConfig({ urls: prepared.stations });
        if (configuredStations.length !== prepared.stations.length) return null;
        const storedFavorites = await resolveFavoriteUrls();
        if (storedFavorites) {
            configuredStations = withFavoriteSelection(configuredStations, storedFavorites);
        }

        const preparedItemsByGroupId = new Map();
        for (const [groupId, items] of Object.entries(prepared.itemsByGroupId || {})) {
            if (!Array.isArray(items)) return null;
            const normalizedItems = items.map((item) => {
                if (
                    !item
                    || typeof item !== "object"
                    || typeof item.id !== "string"
                    || typeof item.name !== "string"
                    || item.directory !== true
                ) return null;
                return Object.freeze({
                    id: item.id,
                    name: item.name,
                    directory: true,
                    enabled: item.enabled !== false,
                    icon: typeof item.icon === "string" ? item.icon : "icon.svg",
                    iconDark: typeof item.iconDark === "string" ? item.iconDark : "icon.svg"
                });
            });
            if (normalizedItems.some((item) => !item)) return null;
            preparedItemsByGroupId.set(groupId, Object.freeze(normalizedItems));
        }
        // Favorite membership follows the station flags above. The cached item
        // list was built from an older selection and would hide a storage update.
        preparedItemsByGroupId.delete("_favorites");

        configuredStationsSnapshot = Object.freeze(configuredStations);
        stationGroupsSnapshot = stationGroupSnapshotFor(
            configuredStationsSnapshot,
            preparedItemsByGroupId
        );
        configuredStationsPromise = Promise.resolve(configuredStationsSnapshot);
        return configuredStationsSnapshot;
    } catch {
        return null;
    }
};

const getConfiguredFavorites = async (configuredStations = null) => {
    const stations = configuredStations || await getConfiguredStations();
    return stations.filter((station) => station.favorite === true).slice(0, MAX_FAVORITE_COMMANDS);
};

const favoriteCommandIdFor = (station) => {
    const identity = stationKeyFor(station) || stationNameFor(station) || station.url;
    const normalized = normalizeId(identity) || "station";
    return `TabuleSprZel.favorite.${normalized}`.slice(0, 120);
};

const readFavoriteCommandIds = async () => {
    try {
        const parsed = JSON.parse(await readFile(FAVORITE_COMMANDS_FILE, "utf8"));
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
        return [];
    }
};

let syncedFavoriteCommandKey = null;

const favoriteCommandKeyFor = (stations) => stations
    .map((station) => `${favoriteCommandIdFor(station)}\t${stationNameFor(station)}`)
    .join("\n");

const syncFavoriteCommandsNow = async (configuredStations) => {
    const commands = Salamander.commands;
    if (!commands || typeof commands.register !== "function") return false;
    const favorites = await getConfiguredFavorites(configuredStations);
    const key = favoriteCommandKeyFor(favorites);
    // Each register/unregister walks every extension's toolbar commands.
    // Repeating that from panel refreshes re-enters the walk during shutdown.
    if (key === syncedFavoriteCommandKey) return true;

    await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true }).catch(() => { });

    if (typeof commands.unregister === "function") {
        for (const commandId of await readFavoriteCommandIds()) {
            try {
                await commands.unregister(commandId);
            } catch { }
        }
    }

    const commandIds = [];
    for (const station of favorites) {
        const commandId = favoriteCommandIdFor(station);
        const handler = `favorite:${encodeURIComponent(station.url)}`;
        try {
            await commands.register(
                commandId,
                stationNameFor(station),
                true,
                false,
                0,
                false,
                handler,
                true,
                true
            );
            commandIds.push(commandId);
        } catch { }
    }

    await writeFile(FAVORITE_COMMANDS_FILE, JSON.stringify(commandIds), "utf8").catch(() => { });
    if (commandIds.length === favorites.length) syncedFavoriteCommandKey = key;
    return true;
};

let favoriteCommandWatch = null;
let favoriteCommandSyncTimer = null;
const scheduleFavoriteCommandSync = () => {
    clearTimeout(favoriteCommandSyncTimer);
    favoriteCommandSyncTimer = setTimeout(() => {
        favoriteCommandSyncTimer = null;
        void getConfiguredStations()
            .then((stations) => syncFavoriteCommands(stations))
            .catch(() => { });
    }, 200);
};

const watchFavoriteCommands = async () => {
    if (favoriteCommandWatch) return;
    await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true }).catch(() => { });
    try {
        favoriteCommandWatch = watch(DEPARTURE_RUNTIME_DIR, (_event, filename) => {
            const name = String(filename || "");
            if (name && !name.startsWith("favorite-selection")) return;
            scheduleFavoriteCommandSync();
        });
        favoriteCommandWatch.on("error", () => { });
    } catch { }
};

let favoriteCommandsPromise = Promise.resolve();
const syncFavoriteCommands = (configuredStations) => {
    const update = favoriteCommandsPromise
        .catch(() => { })
        .then(() => syncFavoriteCommandsNow(configuredStations));
    favoriteCommandsPromise = update;
    return update;
};

const FAVORITE_SELECTION_PROCESSING_FILE = `${FAVORITE_SELECTION_FILE}.processing`;
const FAVORITE_SELECTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const favoriteSelectionResultPath = (id) => join(
    dirname(FAVORITE_SELECTION_FILE),
    `favorite-selection.${id}.ok`
);

const favoriteUrlSet = (value) => {
    if (!Array.isArray(value) || value.some((url) => typeof url !== "string")) return null;
    return new Set(value.map((url) => url.trim()).filter(Boolean));
};

const readPendingFavoriteUrls = async () => {
    try {
        const parsed = JSON.parse(await readFile(FAVORITE_SELECTION_FILE, "utf8"));
        if (parsed?.version !== 1) return null;
        return favoriteUrlSet(parsed.favorites);
    } catch {
        return null;
    }
};

// The dialog file is the newest selection until storage accepts it.
const resolveFavoriteUrls = async () => {
    const pending = await readPendingFavoriteUrls();
    if (pending) return pending;
    return readStoredFavoriteUrls();
};

const writeFavoriteSelectionResult = async (id, result) => {
    if (!FAVORITE_SELECTION_ID_PATTERN.test(id)) return;
    const path = favoriteSelectionResultPath(id);
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(temporaryPath, JSON.stringify(result), "utf8");
        try {
            await rename(temporaryPath, path);
        } catch (error) {
            if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
            await rm(path, { force: true });
            await rename(temporaryPath, path);
        }
    } catch {
        // The dialog reports failure if this acknowledgement never appears.
    } finally {
        await rm(temporaryPath, { force: true }).catch(() => { });
    }
};

const claimFavoriteSelection = async () => {
    try {
        await access(FAVORITE_SELECTION_PROCESSING_FILE);
        return true;
    } catch {
        // No claim is in progress.
    }
    try {
        await rename(FAVORITE_SELECTION_FILE, FAVORITE_SELECTION_PROCESSING_FILE);
        return true;
    } catch {
        return false;
    }
};

const restoreFavoriteSelection = async () => {
    try {
        await access(FAVORITE_SELECTION_FILE);
        // A newer save already replaced the selection. Drop the failed claim.
        await rm(FAVORITE_SELECTION_PROCESSING_FILE, { force: true });
    } catch {
        try {
            await rename(FAVORITE_SELECTION_PROCESSING_FILE, FAVORITE_SELECTION_FILE);
        } catch {
            await rm(FAVORITE_SELECTION_PROCESSING_FILE, { force: true }).catch(() => { });
        }
    }
};

const clearStaleSelectionResults = async () => {
    let names = [];
    try {
        names = await readdir(DEPARTURE_RUNTIME_DIR);
    } catch {
        return;
    }
    const staleBefore = Date.now() - 60_000;
    await Promise.all(names.map(async (name) => {
        if (!/^favorite-selection\.[0-9a-f-]{36}\.ok$/i.test(name)) return;
        const path = join(DEPARTURE_RUNTIME_DIR, name);
        try {
            const info = await stat(path);
            if (info.mtimeMs <= staleBefore) await rm(path, { force: true });
        } catch { }
    }));
};

let favoriteSelectionRetryAt = 0;
let favoriteSelectionCommit = Promise.resolve();

const publishStoredFavorites = async (storedAny) => {
    if (!storedAny) return null;
    try {
        await publishFavoriteSelection();
    } catch { }
    return true;
};

const commitFavoriteSelectionNow = async () => {
    if (Date.now() < favoriteSelectionRetryAt) return false;
    let storedAny = false;

    for (;;) {
        if (!(await claimFavoriteSelection())) return publishStoredFavorites(storedAny);

        let parsed;
        let raw;
        try {
            raw = await readFile(FAVORITE_SELECTION_PROCESSING_FILE, "utf8");
        } catch (error) {
            if (error?.code === "ENOENT") return publishStoredFavorites(storedAny);
            favoriteSelectionRetryAt = Date.now() + 1000;
            await publishStoredFavorites(storedAny);
            return false;
        }
        try {
            parsed = JSON.parse(raw);
        } catch {
            await rm(FAVORITE_SELECTION_PROCESSING_FILE, { force: true }).catch(() => { });
            continue;
        }
        const favorites = parsed?.version === 1 ? favoriteUrlSet(parsed.favorites) : null;
        if (!favorites) {
            if (typeof parsed?.id === "string") {
                await writeFavoriteSelectionResult(parsed.id, {
                    ok: false,
                    error: "The favorite selection is invalid."
                });
            }
            await rm(FAVORITE_SELECTION_PROCESSING_FILE, { force: true }).catch(() => { });
            continue;
        }

        const favoriteList = [...favorites];
        try {
            await Salamander.storage.set(
                FAVORITE_STATIONS_STORAGE_KEY,
                JSON.stringify(favoriteList)
            );
            const confirmedFavorites = await readStoredFavoriteUrls();
            const confirmed = confirmedFavorites
                && confirmedFavorites.size === favoriteList.length
                && favoriteList.every((url) => confirmedFavorites.has(url));
            if (!confirmed) throw new Error("Salamander storage did not keep the favorite selection.");
        } catch {
            favoriteSelectionRetryAt = Date.now() + 1000;
            await restoreFavoriteSelection();
            await publishStoredFavorites(storedAny);
            return false;
        }

        favoriteSelectionRetryAt = 0;
        if (typeof parsed.id === "string") {
            await writeFavoriteSelectionResult(parsed.id, { ok: true });
        }
        await rm(FAVORITE_SELECTION_PROCESSING_FILE, { force: true }).catch(() => { });
        storedAny = true;
    }
};

const publishFavoriteSelection = async () => {
    await rm(STATION_GROUP_SNAPSHOT_FILE, { force: true }).catch(() => { });
    configuredStationsSnapshot = null;
    configuredStationsPromise = null;
    stationGroupsSnapshot = null;
    const configuredStations = await getConfiguredStations();
    await savePreparedStationGroupSnapshot(configuredStations);
};

// null: nothing pending, true: stored, false: storage rejected the selection.
const commitFavoriteSelection = () => {
    const run = favoriteSelectionCommit
        .catch(() => { })
        .then(commitFavoriteSelectionNow);
    favoriteSelectionCommit = run;
    return run;
};

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
        stationsCountLabel: "Configured stations:",
        stationsLabel: "Stations:",
        stationKeyLabel: "Key",
        unnamedStation: "(unnamed)",
        refreshLabel: "Refresh interval:",
        configHint: "Select favorite stations below. The selection is saved in Salamander storage and overrides config.json favorites.",
        favoritesLabel: "Favorite",
        saveConfig: "Save",
        closeConfig: "Close",
        savingConfig: "Saving...",
        configSaved: "Configuration saved.",
        configSaveFailed: "Configuration could not be saved.",
        urlsNotConfigured: "(not configured)",
        errorInvalidUrl: "No board URLs configured. Use Configure URL.",
        errorFetch: "Failed to fetch departures from URL",
        fetchFailed: "Failed to fetch departures",
        settingsTitle: "Tabule SprŽel Settings",
        detailPageLanguage: "en",
        detailCarrierName: "Czech Railways",
        detailFormationLinkFirst: "View formation",
        detailFormationLinkSecond: "on vagonWEB →",
        detailFormationLoading: "Loading train formation...",
        detailFormationError: "Train formation could not be loaded.",
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
    await commitFavoriteSelection();
    await loadPreparedStationGroupSnapshot();
    let currentStations = await getConfiguredStations();
    const pendingFavorites = await readPendingFavoriteUrls();
    if (pendingFavorites) {
        currentStations = currentStations.map((station) => ({
            ...station,
            favorite: pendingFavorites.has(station.url)
        }));
    }
    const configuredRefresh = Number(config.refreshMs);
    const currentRefresh = Number.isFinite(configuredRefresh) && configuredRefresh > 0
        ? configuredRefresh
        : DEFAULT_REFRESH_MS;
    const refreshText = currentRefresh % 1000 === 0
        ? `${currentRefresh / 1000} s`
        : `${currentRefresh} ms`;
    const stationNumberWidth = String(currentStations.length || 1).length;
    const stationRows = currentStations.map(({ name, url, favorite }, index) => {
            const stationName = name || strings.unnamedStation || "(unnamed)";
            const displayName = favorite === true ? `⭐ ${stationName}` : stationName;
            const stationKey = deriveStationKeyFromUrl(url);
            const identifier = stationKey
                ? `${strings.stationKeyLabel || "Key"}=${stationKey}`
                : url;
            const number = String(index + 1).padStart(stationNumberWidth, "0");
            return { number, name: displayName, url, favorite: favorite === true, identifier };
        });
    const stationsText = stationRows.length
        ? stationRows.map(({ number, name, identifier }) => `${number}. ${name} (${identifier})`).join("\n  ")
        : strings.urlsNotConfigured || "(not configured)";
    const title = strings.settingsTitle || "Tabule SprŽel Settings";
    const fallbackText = `${strings.configTitle || "Configuration"}\n\n${strings.stationsCountLabel || "Configured stations:"} ${currentStations.length}\n${strings.refreshLabel || "Refresh interval:"} ${refreshText}\n\n${strings.stationsLabel || "Stations:"}\n  ${stationsText}\n\n${strings.configHint || "Select favorite stations in the configuration dialog."}`;

    let dialogStarted = false;
    try {
        await access(join(EXTENSION_DIR, "node_modules", "webview-node", "bin", "webview2-host.exe"));
        await access(CONFIGURATION_DIALOG_LAUNCHER);
        const configurationTemplate = await readFile(CONFIGURATION_DIALOG_TEMPLATE, "utf8");
        await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true });
        const listHtml = stationRows.length
            ? stationRows.map(({ number, name, url, favorite, identifier }) => `<li><label class="station-row"><input type="checkbox" name="favorite" value="${escapeHtml(url)}" aria-label="${escapeHtml(strings.favoritesLabel || "Favorite")} ${escapeHtml(name)}"${favorite ? " checked" : ""}><span class="station-number">${escapeHtml(number)}.</span><span class="station-name">${escapeHtml(name)}</span><span class="station-key">${escapeHtml(identifier)}</span></label></li>`).join("")
            : `<li class="empty">${escapeHtml(strings.urlsNotConfigured || "(not configured)")}</li>`;
        const configHtml = Object.entries({
            "__CONFIG_LANGUAGE__": escapeHtml(strings.detailPageLanguage || "en"),
            "__CONFIG_TITLE__": escapeHtml(strings.configTitle || "Configuration"),
            "__STATIONS_COUNT_LABEL__": escapeHtml(strings.stationsCountLabel || "Configured stations:"),
            "__STATIONS_COUNT__": currentStations.length,
            "__REFRESH_LABEL__": escapeHtml(strings.refreshLabel || "Refresh interval:"),
            "__REFRESH_TEXT__": escapeHtml(refreshText),
            "__STATIONS_LABEL__": escapeHtml(strings.stationsLabel || "Stations:"),
            "__FAVORITES_LABEL__": escapeHtml(strings.favoritesLabel || "Favorite"),
            "__STATION_ROWS__": listHtml,
            "__CONFIG_HINT__": escapeHtml(strings.configHint || "Select favorite stations in the configuration dialog."),
            "__CONFIG_SAVE_LABEL__": escapeHtml(strings.saveConfig || "Save"),
            "__CONFIG_CLOSE_LABEL__": escapeHtml(strings.closeConfig || "Close"),
            "__CONFIG_SAVING__": escapeHtml(strings.savingConfig || "Saving..."),
            "__CONFIG_SAVED__": escapeHtml(strings.configSaved || "Configuration saved."),
            "__CONFIG_SAVE_FAILED__": escapeHtml(strings.configSaveFailed || "Configuration could not be saved.")
        }).reduce((html, [placeholder, value]) => html.replaceAll(placeholder, String(value)), configurationTemplate);
        await writeFile(CONFIGURATION_DIALOG_HTML_FILE, configHtml, "utf8");
        await rm(CONFIGURATION_DIALOG_WEBVIEW_DATA, { recursive: true, force: true }).catch(() => { });
        const child = spawn(process.execPath, [
                CONFIGURATION_DIALOG_LAUNCHER,
                CONFIGURATION_DIALOG_HTML_FILE,
                title,
                CONFIGURATION_DIALOG_WEBVIEW_DATA,
                FAVORITE_SELECTION_FILE
        ], {
            detached: false,
            windowsHide: true,
            stdio: "ignore"
        });
        try {
            const dialogResult = await new Promise((resolve, reject) => {
                let spawned = false;
                let settled = false;
                const finish = (callback, value) => {
                    if (settled) return;
                    settled = true;
                    child.removeListener("spawn", onSpawn);
                    child.removeListener("error", onError);
                    child.removeListener("exit", onExit);
                    callback(value);
                };
                const onSpawn = () => {
                    spawned = true;
                    dialogStarted = true;
                };
                const onError = (error) => {
                    if (!spawned) {
                        finish(reject, error);
                    } else {
                        finish(resolve, { error });
                    }
                };
                const onExit = (code, signal) => {
                    if (!spawned) {
                        finish(reject, new Error("The configuration dialog exited before it started."));
                    } else {
                        finish(resolve, { code, signal });
                    }
                };
                child.once("spawn", onSpawn);
                child.once("error", onError);
                child.once("exit", onExit);
            });
            if (dialogResult?.error || dialogResult?.code !== 0) {
                try {
                    console.error(`[TabuleSprZel] configuration dialog exited with ${dialogResult?.error?.message || dialogResult?.signal || `code ${dialogResult?.code}`}`);
                } catch { }
            }
        } finally {
            try {
                if ((await commitFavoriteSelection()) === false) {
                    try {
                        console.error("[TabuleSprZel] configuration selection was not committed");
                    } catch { }
                }
            } catch (error) {
                // The dialog already completed; do not reopen the legacy fallback UI.
                try {
                    console.error(`[TabuleSprZel] failed to commit configuration: ${error instanceof Error ? error.message : String(error)}`);
                } catch { }
            }
        }
        return;
    } catch (error) {
        try {
            console.error(`[TabuleSprZel] configuration dialog${dialogStarted ? " process" : " startup"} failed: ${error instanceof Error ? error.message : String(error)}`);
        } catch { }
        if (!dialogStarted) await Salamander.ui.messageBox(fallbackText, title, "OK", "Information");
    }
}

let scraperTimer = null;
let scraperRunning = false;
let lastCache = null;
let scraperError = null;
let panelOpen = false;
let lastPanelActivity = 0;
let currentView = null;
let activeStationConfig = null;
let stationRefreshPromise = null;
let stationRefreshUrl = null;
let scraperGeneration = 0;
let listRequestId = 0;
let fileSystemItemsPromise = Promise.resolve();
const departureDetailsById = new Map();
const PANEL_INACTIVITY_MS = 5 * 60 * 1000;

const snapshotFileSystemItems = (items) => Object.freeze(
    items.map((item) => Object.freeze({
        ...item,
        columns: item.columns && Object.freeze({ ...item.columns })
    }))
);

const addFileSystemItems = (items, requestId = listRequestId) => {
    const snapshot = snapshotFileSystemItems(items);
    const update = fileSystemItemsPromise
        .catch(() => { })
        .then(() => {
            if (requestId !== listRequestId) return false;
            return Salamander.fileSystem.addItems(snapshot);
        });
    fileSystemItemsPromise = update;
    return update;
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

const refreshConfiguredStation = ({ station, fallbackStation, strings, reportError = false } = {}) => {
    if (stationRefreshPromise && stationRefreshUrl === station.url) return stationRefreshPromise;
    const refreshUrl = station.url;
    const refreshPromise = (async () => {
        try {
            const result = await fetchStationTable({ url: refreshUrl });
            const refreshedStation = {
                station: station.name || result.station,
                stationKey: result.stationKey || deriveStationKeyFromUrl(refreshUrl),
                departures: result.departures,
                fetchedAt: Date.now(),
                url: refreshUrl
            };
            if (activeStationConfig?.url === refreshUrl) {
                lastCache = { stations: [refreshedStation] };
                void saveCache(lastCache);
                void saveLocalDepartureSnapshot(lastCache);
            }
            return refreshedStation;
        } catch (error) {
            if (fallbackStation) {
                const fallback = {
                    ...fallbackStation,
                    station: station.name || fallbackStation.station,
                    stationKey: fallbackStation.stationKey || deriveStationKeyFromUrl(refreshUrl),
                    url: refreshUrl
                };
                if (activeStationConfig?.url === refreshUrl) {
                    lastCache = { stations: [fallback] };
                    void saveLocalDepartureSnapshot(lastCache);
                }
                return fallback;
            }
            if (reportError) {
                await Salamander.ui.messageBox(
                    `${strings.fetchFailed || "Failed to fetch departures"}:\n${String(error)}`,
                    strings.name || "Tabule SprŽel",
                    "OK",
                    "Error"
                );
            }
            return null;
        }
    })().finally(() => {
        if (stationRefreshPromise === refreshPromise) {
            stationRefreshPromise = null;
            stationRefreshUrl = null;
        }
    });
    stationRefreshPromise = refreshPromise;
    stationRefreshUrl = refreshUrl;
    return refreshPromise;
};

const refreshConfiguredStations = ({ station, fallbackStation, strings, reportError = false } = {}) => {
    return refreshConfiguredStation({
        station,
        fallbackStation,
        strings,
        reportError
    });
};

const startScraper = async ({
    fallbackStation: configuredFallbackStation = null,
    strings = {},
    reportError = false,
    onStationUpdate = null
} = {}) => {
    if (scraperRunning) return { ok: false, reason: "alreadyRunning" };
    if (!activeStationConfig) {
        return { ok: false, reason: "noUrl" };
    }
    scraperRunning = true;
    scraperError = null;
    const generation = ++scraperGeneration;

    const isCurrentRun = () => scraperRunning
        && generation === scraperGeneration
        && activeStationConfig;
    const scheduleNextTick = async () => {
        const delay = await getRefreshInterval();
        if (isCurrentRun()) {
            scraperTimer = setTimeout(() => void tick(), delay);
        }
    };

    const tick = async () => {
        if (!isCurrentRun()) return;
        try {
            const station = activeStationConfig;
            const cachedFallbackStation = lastCache?.stations?.find((station) =>
                station.url === activeStationConfig.url
            ) || configuredFallbackStation;
            const refreshed = await refreshConfiguredStations({
                station,
                fallbackStation: cachedFallbackStation,
                strings,
                reportError
            });
            if (!isCurrentRun()) return;
            if (!refreshed) scraperError = "No station data was returned.";
            if (refreshed && typeof onStationUpdate === "function") {
                await onStationUpdate(refreshed);
                if (!isCurrentRun()) return;
            }
            const now = Date.now();
            if (panelOpen && now - lastPanelActivity > PANEL_INACTIVITY_MS) {
                stopScraper();
                panelOpen = false;
            } else {
                void scheduleNextTick();
            }
            return refreshed;
        } catch (error) {
            if (!isCurrentRun()) return;
            scraperError = String(error);
            void scheduleNextTick();
            return null;
        }
    };

    const firstStation = await tick();
    return { ok: true, station: firstStation };
};

const stopScraper = () => {
    scraperGeneration += 1;
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

const getCachedDepartureDetails = (cache, id) => {
    const now = new Date();
    for (const station of cache?.stations || []) {
        const departure = (station.departures || []).find((candidate) =>
            makeDepartureId(candidate) === id
        );
        if (!departure) continue;
        return {
            train: departure.train,
            trainType: departure.trainType || resolveProfileTrainType(departure.train, departure.operator),
            trainTypeLogo: trainTypeLogoPathFor(
                departure.train,
                departure.operator,
                departure.trainType
            ),
            trainNumber: departure.trainNumber,
            departureTime: departure.departureTime,
            delay: formatDelay(departure.delay),
            delayMinutes: Number(departure.delay || 0),
            actualDepartureTime: formatActualDepartureWithDate(
                departure.departureTime,
                departure.delay,
                now
            ),
            platform: departure.platform,
            track: departure.track,
            sector: departure.sector,
            line: departure.line || "",
            destination: departure.destination || departure.stations?.[0] || "",
            via: departure.via || departure.stations?.[1] || "",
            note: departure.note || "",
            operator: departure.operator || "",
            station: departure.station || station.station || ""
        };
    }
    return null;
};

const saveLocalDepartureDetails = async (items) => {
    try {
        await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true });
        const liveItems = await Promise.all(items.map(async (item) => {
            const details = item.columns || {};
            const carrier = resolveCarrier(details.operator || "");
            const carrierIcon = await readDepartureDetailsIcon(
                getCarrierDetailIconPath(details.operator || "")
            );
            const trainTypeLogoPath = trainTypeLogoPathFor(
                details.train,
                details.operator,
                details.trainType
            );
            const trainTypeLogo = trainTypeLogoPath
                ? `data:image/svg+xml;base64,${await readDepartureDetailsIcon(trainTypeLogoPath)}`
                : "";
            return {
                id: item.id,
                name: item.name,
                key: departureNavigationKey(details),
                details: {
                    ...details,
                    carrierName: carrier.name || "Carrier",
                    carrierLogo: `data:image/svg+xml;base64,${carrierIcon}`,
                    trainTypeLogo,
                    vagonwebUrl: buildVagonwebUrl(details)
                }
            };
        }));
        const details = Object.fromEntries(liveItems.map((item) => [item.id, item.details]));
        const feed = `window.__PRAGOTRON_LIVE_DATA__ = ${JSON.stringify({ items: liveItems })
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029")};`;
        const detailsTemporaryPath = `${DEPARTURE_DETAILS_CACHE_FILE}.${randomUUID()}.tmp`;
        const feedTemporaryPath = `${DEPARTURE_LIVE_FEED_FILE}.${randomUUID()}.tmp`;
        await writeFile(detailsTemporaryPath, JSON.stringify(details), "utf8");
        await writeFile(feedTemporaryPath, feed, "utf8");
        await rename(detailsTemporaryPath, DEPARTURE_DETAILS_CACHE_FILE);
        await rename(feedTemporaryPath, DEPARTURE_LIVE_FEED_FILE);
    } catch { }
};

const saveLocalDepartureSnapshot = async (cache) => {
    const now = new Date();
    const items = [];
    for (const station of cache?.stations || []) {
        const stationName = station.station || `Station ${station.stationKey || ""}`.trim();
        for (const departure of station.departures || []) {
            items.push({
                id: makeDepartureId(departure),
                columns: {
                    train: departure.train,
                    trainType: departure.trainType || resolveProfileTrainType(departure.train, departure.operator),
                    trainTypeLogo: trainTypeLogoPathFor(
                        departure.train,
                        departure.operator,
                        departure.trainType
                    ),
                    trainNumber: departure.trainNumber,
                    departureTime: departure.departureTime,
                    delay: formatDelay(departure.delay),
                    delayMinutes: Number(departure.delay || 0),
                    actualDepartureTime: formatActualDepartureWithDate(
                        departure.departureTime,
                        departure.delay,
                        now
                    ),
                    platform: departure.platform,
                    track: departure.track,
                    sector: departure.sector,
                    line: departure.line || "",
                    destination: departure.destination || departure.stations?.[0] || "",
                    via: departure.via || departure.stations?.[1] || "",
                    note: departure.note || "",
                    operator: departure.operator || "",
                    station: departure.station || stationName || ""
                }
            });
        }
    }
    await saveLocalDepartureDetails(items);
};

const loadLocalDepartureDetails = async (id) => {
    try {
        const raw = await readFile(DEPARTURE_DETAILS_CACHE_FILE, "utf8");
        const details = JSON.parse(raw);
        return details && typeof details[id] === "object" ? details[id] : null;
    } catch {
        return null;
    }
};

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
        panelOpen = true;
        lastPanelActivity = Date.now();

        const invocation = Salamander.invocation || {};
        const item = invocation.item || {};
        const rawInvocationPath = invocation.path || "";
        const FAVORITES_GROUP_ID = "_favorites";

        const pathValues = [];
        const collectPathValue = (value) => {
            if (Array.isArray(value)) {
                value.forEach(collectPathValue);
            } else if (value !== undefined && value !== null && value !== "") {
                pathValues.push(value);
            }
        };
        collectPathValue(rawInvocationPath);
        collectPathValue(item.path);
        const pathParts = pathValues.flatMap((value) => String(value)
            .split(/[\\/!]/)
            .filter(Boolean));
        const metadataSelectors = [item.id, item.name]
            .filter((value) => value !== undefined && value !== null && value !== "")
            .flatMap((value) => String(value).split(/[\\/!]/).filter(Boolean));
        const selectorParts = pathParts.length ? pathParts : metadataSelectors;
        const stationSelectors = new Set(selectorParts.flatMap((part) => {
            try {
                return [part, decodeURIComponent(part)];
            } catch {
                return [part];
            }
        }));
        const legacyGroupIds = new Set(STATION_GROUP_LABELS.map(legacyStationGroupIdFor));
        const groupSelectorParts = [...pathParts, item.id]
            .filter((value) => value !== undefined && value !== null && value !== "")
            .flatMap((value) => String(value).split(/[\\/!]/).filter(Boolean));
        const hasGroupSelector = groupSelectorParts.some((part) =>
            part === FAVORITES_GROUP_ID
            || STATION_GROUP_LABELS.includes(part)
            || legacyGroupIds.has(part)
        );
        const hasUnknownPathSelector = pathParts.some((part) =>
            part !== "departures"
            && !part.startsWith("salamatrix:")
            && part !== FAVORITES_GROUP_ID
            && !STATION_GROUP_LABELS.includes(part)
            && !legacyGroupIds.has(part)
        );
        const hasUnknownItemSelector = item.id !== undefined
            && item.id !== null
            && item.id !== ""
            && !hasGroupSelector
            && item.id !== "departures";
        const isRootView = !hasGroupSelector && !hasUnknownPathSelector && !hasUnknownItemSelector;
        if (isRootView) {
            activeStationConfig = null;
            stopScraper();
            currentView = "root";
            if (requestId === listRequestId) {
                await addFileSystemItems(["Č", "Ř", "Š", "Ú", "Ž"].map((label) => ({
                    id: label,
                    name: label,
                    directory: true,
                    enabled: true,
                    icon: "icon.svg",
                    iconDark: "icon.svg"
                })), requestId);
            }
            return;
        }

        await loadPreparedStationGroupSnapshot();
        const configuredStations = await getConfiguredStations();
        if (!configuredStations.length) {
            strings = await getStringsAsync(await detectLocale());
            await Salamander.ui.messageBox(
                strings.errorInvalidUrl || "No board URLs configured. Use Configure URL.",
                strings.name || "Tabule SprŽel",
                "OK",
                "Error"
            );
            return;
        }

        const stationNameFor = (s) => {
            const name = String(s.name ?? s.station ?? "").trim();
            const stationKey = s.stationKey || deriveStationKeyFromUrl(s.url);
            return name && !/^station-[A-Za-z0-9_-]+$/i.test(name)
                ? name
                : `Station ${stationKey || ""}`.trim();
        };
        const stationIdFor = (s) => {
            return stationNameFor(s);
        };
        const legacyStationIdFor = (s) =>
            (s.stationKey || deriveStationKeyFromUrl(s.url))
                ? `station-${s.stationKey || deriveStationKeyFromUrl(s.url)}`
                : "";
        const previousStationIdFor = (s) =>
            `station-${normalizeId(stationNameFor(s))}`;
        const previousCompositeStationIdFor = (s) => {
            const stationKey = s.stationKey || deriveStationKeyFromUrl(s.url);
            return stationKey
                ? `station-${normalizeId(stationNameFor(s))}!station-${normalizeId(stationKey)}`
                : "";
        };
        const stationSnapshot = stationGroupsSnapshot || stationGroupSnapshotFor(configuredStations);
        const stationGroupsById = stationSnapshot.groupsById;
        const itemsForStationGroup = (group) => stationSnapshot.itemsByGroupId.get(group.id) || [];
        // Determine what view we're in: a station group or a specific station.
        let activeStation = null;

        const activeGroup = [...pathParts]
            .reverse()
            .map((part) => stationGroupsById.get(part))
            .find(Boolean) || null;

        for (const s of configuredStations) {
            const knownSelectors = [
                stationIdFor(s),
                legacyStationIdFor(s),
                previousStationIdFor(s),
                previousCompositeStationIdFor(s),
                stationNameFor(s),
            ].filter(Boolean);
            if (knownSelectors.some((selector) => stationSelectors.has(selector))) {
                activeStation = s;
                break;
            }
        }

        if (!activeStation && activeGroup) {
            activeStationConfig = null;
            stopScraper();
            currentView = activeGroup.id;
            if (requestId === listRequestId) {
                await addFileSystemItems(itemsForStationGroup(activeGroup), requestId);
            }
            return;
        }

        if (!activeStation) return;

        // Station view: fetch departures only for the selected station.
        stopScraper();
        activeStationConfig = activeStation;
        const stationId = stationIdFor(activeStationConfig);
        currentView = stationId;
        const stringsPromise = detectLocale().then((locale) => getStringsAsync(locale));
        const storedPromise = loadCache();
        let publishedStation = false;
        const publishStation = async (refreshedStation) => {
            if (
                requestId !== listRequestId
                || currentView !== stationId
                || activeStationConfig?.url !== activeStation.url
            ) return false;

            const cache = { stations: [refreshedStation] };
            lastCache = cache;
            const departures = refreshedStation.departures || [];
            const stationName = stationNameFor(activeStation) || "Stanice";
            const operatorIconFiles = await getOperatorIconFiles();
            if (
                requestId !== listRequestId
                || currentView !== stationId
                || activeStationConfig?.url !== activeStation.url
            ) return false;

            const items = buildItems(departures, operatorIconFiles, stationName);
            await saveLocalDepartureDetails(items);
            void saveCache(cache);
            await addFileSystemItems(items, requestId);
            publishedStation = true;
            return true;
        };
        const scraperResult = await startScraper({
            strings: {},
            reportError: false,
            onStationUpdate: publishStation
        });
        let refreshedStation = scraperResult.station;
        if (!refreshedStation) {
            const stored = await storedPromise;
            refreshedStation = stored?.stations?.find((station) =>
                station.url === activeStationConfig.url
            ) || null;
        }
        if (!refreshedStation) {
            strings = await stringsPromise;
            await Salamander.ui.messageBox(
                `${strings.fetchFailed || "Failed to fetch departures"}.`,
                strings.name || "Tabule SprŽel",
                "OK",
                "Error"
            );
        }
        if (!refreshedStation || requestId !== listRequestId) return;

        if (!publishedStation) await publishStation(refreshedStation);

        // Do not block the panel on per-departure persistence. The in-memory
        // map serves the immediate action; storage is only the cross-context fallback.
        const now = new Date();
        const departures = refreshedStation.departures || [];
        const stationName = stationNameFor(activeStation) || "Stanice";
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
                        station: d.station || stationName || ""
                    })
                );
            } catch { }
        }));
    } catch (error) {
        if (!strings) strings = await getStringsAsync("en");
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

async function handleFavoriteCommand(handler) {
    const encodedUrl = String(handler).slice("favorite:".length);
    let url = "";
    try {
        url = decodeURIComponent(encodedUrl);
    } catch {
        return;
    }

    const station = (await getConfiguredStations()).find((item) => item.url === url);
    if (!station) return;

    const changePath = Salamander.sides && Salamander.sides.changePath;
    if (typeof changePath !== "function") {
        try {
            await Salamander.ui.notify(
                "Favorite stations are not supported by this Salamander version.",
                "Tabule SprŽel",
                3000
            );
        } catch { }
        return;
    }

    const path = `salamatrix:TabuleSprZel!departures/${stationPathFor(station)}`;
    try {
        await changePath(path, "source");
    } catch { }
}

const describeDepartureDetailsError = (error) => {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown WebView error");
    return message.replace(/\s+/g, " ").trim().slice(0, 500) || "Unknown WebView error";
};

const readDetailsWindowState = async () => {
    try {
        const state = JSON.parse(await readFile(DEPARTURE_DETAILS_STATE_FILE, "utf8"));
        if (state.version !== 3) return null;
        if (!Number.isInteger(state.port) || state.port < 1 || state.port > 65535) return null;
        if (typeof state.token !== "string" || !state.token) return null;
        if (!Number.isInteger(state.hostPid) || state.hostPid < 1) return null;
        return state;
    } catch {
        return null;
    }
};

const isProcessRunning = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

const readDetailsLaunch = async () => {
    try {
        const launch = JSON.parse(await readFile(DEPARTURE_DETAILS_LAUNCH_FILE, "utf8"));
        if (!Number.isInteger(launch.pid) || launch.pid < 1) return null;
        return launch;
    } catch {
        return null;
    }
};

const stopDetailsLauncher = async (pid) => {
    if (!Number.isInteger(pid) || pid < 1) return;
    try {
        process.kill(pid);
    } catch { }
    for (let attempt = 0; attempt < 20 && isProcessRunning(pid); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
};

const requestDetailsWindow = async (state, title, id, key) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
        const response = await fetch(`http://127.0.0.1:${state.port}/show`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: state.token, title, id, key }),
            signal: controller.signal
        });
        return response.ok;
    } finally {
        clearTimeout(timeout);
    }
};

const recoverPendingDetailsWindow = async (title, id, key) => {
    const launch = await readDetailsLaunch();
    if (!launch) return false;
    if (!isProcessRunning(launch.pid)) {
        await rm(DEPARTURE_DETAILS_LAUNCH_FILE, { force: true }).catch(() => { });
        return false;
    }

    for (let attempt = 0; attempt < 80; attempt += 1) {
        const state = await readDetailsWindowState();
        if (state) {
            try {
                if (await requestDetailsWindow(state, title, id, key)) return true;
            } catch { }
        }
        if (!isProcessRunning(launch.pid)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await stopDetailsLauncher(launch.pid);
    await rm(DEPARTURE_DETAILS_LAUNCH_FILE, { force: true }).catch(() => { });
    await rm(DEPARTURE_DETAILS_STATE_FILE, { force: true }).catch(() => { });
    return false;
};

const showExistingDetailsWindow = async (title, id, key) => {
    const state = await readDetailsWindowState();
    if (!state) return false;
    if (!isProcessRunning(state.hostPid)) {
        await rm(DEPARTURE_DETAILS_STATE_FILE, { force: true }).catch(() => { });
        return false;
    }
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
            if (await requestDetailsWindow(state, title, id, key)) return true;
        } catch {
            await rm(DEPARTURE_DETAILS_STATE_FILE, { force: true }).catch(() => { });
            return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
};

const waitForDetailsWindow = async (title, id, key) => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
        const state = await readDetailsWindowState();
        if (state) {
            try {
                if (await requestDetailsWindow(state, title, id, key)) return true;
            } catch { }
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("The departure details window did not become ready.");
};

async function departureDetailsFallback(detailsText, title, vagonwebUrl, strings, error = null) {
    const errorText = error
        ? `\r\n\r\n${strings.error || "Error:"} ${describeDepartureDetailsError(error)}`
        : "";
    await Salamander.ui.messageBox(
        vagonwebUrl
            ? `${detailsText}\r\n\r\n${strings.detailComposition || "Train formation:"} ${vagonwebUrl}${errorText}`
            : `${detailsText}${errorText}`,
        title,
        "OK",
        "Information"
    );
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
    if (!details || !details.train) {
        details = await loadLocalDepartureDetails(id) || details;
    }
    if (!details || !details.train) {
        let cache = lastCache;
        if (!cache) cache = await loadCache();
        details = getCachedDepartureDetails(cache, id) || details;
    }
    if ((!details || !details.train) && item.columns && typeof item.columns === "object") {
        details = {
            ...item.columns,
            station: item.columns.station || item.station || ""
        };
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
    let htmlPath = DEPARTURE_DETAILS_HTML_FILE;
    let child = null;
    try {
        const packageHostPath = join(
            EXTENSION_DIR,
            "node_modules",
            "webview-node",
            "bin",
            "webview2-host.exe"
        );
        const launcherPath = join(EXTENSION_DIR, "departure-window.mjs");
        await Promise.all([
            access(packageHostPath),
            access(launcherPath)
        ]);

        await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true });
        const formationErrorText = String(
            strings.detailFormationError || "Train formation could not be loaded."
        );
        const formation = vagonwebUrl
            ? { html: `<div class="formation-status"><span class="loader"></span>${escapeHtml(departureHtmlValue(strings.detailFormationLoading, "Loading train formation..."))}</div>` }
            : { html: "" };
        const html = await buildDepartureDetailsFromTemplate(
            details,
            strings,
            title,
            vagonwebUrl,
            formation,
            { itemId: id, liveFeedFile: DEPARTURE_LIVE_FEED_FILE }
        );
        if (
            typeof html !== "string"
            || html.length === 0
            || html.length > 1024 * 1024
            || !html.startsWith("<!doctype html>")
            || !html.includes('<main class="card">')
        ) {
            throw new Error("Invalid departure details document");
        }
        await writeFile(htmlPath, html, "utf8");

        if (await showExistingDetailsWindow(title, id, departureNavigationKey(details))) return;
        if (await recoverPendingDetailsWindow(title, id, departureNavigationKey(details))) return;

        await rm(DEPARTURE_DETAILS_STATE_FILE, { force: true }).catch(() => { });
        await rm(DEPARTURE_DETAILS_LAUNCH_FILE, { force: true }).catch(() => { });
        const webviewDataFolder = DEPARTURE_DETAILS_WEBVIEW_DATA;

        child = spawn(process.execPath, [
            launcherPath,
            htmlPath,
            DEPARTURE_RUNTIME_DIR,
            title,
            vagonwebUrl,
            formationErrorText,
            webviewDataFolder,
            DEPARTURE_DETAILS_STATE_FILE,
            DEPARTURE_LIVE_FEED_FILE,
            id,
            departureNavigationKey(details),
            DEPARTURE_FORMATION_CACHE_FILE
        ], {
            detached: true,
            windowsHide: true,
            stdio: "ignore"
        });
        await new Promise((resolve, reject) => {
            const onSpawn = () => {
                child.removeListener("error", onError);
                resolve();
            };
            const onError = (error) => {
                child.removeListener("spawn", onSpawn);
                reject(error);
            };
            child.once("spawn", onSpawn);
            child.once("error", onError);
        });
        await writeFile(DEPARTURE_DETAILS_LAUNCH_FILE, JSON.stringify({
            pid: child.pid,
            startedAt: Date.now()
        }), "utf8");
        await waitForDetailsWindow(title, id, departureNavigationKey(details));
        await rm(DEPARTURE_DETAILS_LAUNCH_FILE, { force: true }).catch(() => { });
        let fallbackShown = false;
        const showFallback = (error) => {
            if (fallbackShown) return;
            fallbackShown = true;
            try {
                console.error(`[TabuleSprZel] departure details launcher: ${describeDepartureDetailsError(error)}`);
            } catch { }
            void departureDetailsFallback(detailsText, title, vagonwebUrl, strings, error)
                .catch(() => { });
        };
        child.once("error", showFallback);
        child.once("exit", (code, signal) => {
            if (code !== 0) {
                showFallback(new Error(`The departure details launcher exited with ${signal || `code ${code}`}.`));
            }
        });
        child.unref();
        return;
    } catch (error) {
        if (child?.pid) await stopDetailsLauncher(child.pid);
        await rm(DEPARTURE_DETAILS_LAUNCH_FILE, { force: true }).catch(() => { });
        try {
            console.error(`[TabuleSprZel] failed to open departure details: ${describeDepartureDetailsError(error)}`);
        } catch { }
        await rm(`${DEPARTURE_DETAILS_HTML_FILE}.error`, { force: true }).catch(() => { });
        await departureDetailsFallback(detailsText, title, vagonwebUrl, strings, error);
    }
}

const handler = Salamander.commandHandler || Salamander.command_handler;

await clearStaleSelectionResults();
await commitFavoriteSelection();
configuredStationsSnapshot = null;
configuredStationsPromise = null;
stationGroupsSnapshot = null;

if (!handler) {
    const configuredStations = await getConfiguredStations();
    await savePreparedStationGroupSnapshot(configuredStations);
    await syncFavoriteCommands(configuredStations);
    await watchFavoriteCommands();
}

if (handler === "viewDeparture" || handler === "configureUrl" || handler === "configure") {
    stopScraper();
}

if (handler === "listDepartures") {
    await handleListDepartures();
} else if (handler === "openDepartures" || handler === "open") {
    await handleOpenDepartures();
} else if (handler === "viewDeparture") {
    await handleViewDeparture();
} else if (handler === "configureUrl" || handler === "configure") {
    await handleConfigureUrl();
} else if (typeof handler === "string" && handler.startsWith("favorite:")) {
    await handleFavoriteCommand(handler);
}
