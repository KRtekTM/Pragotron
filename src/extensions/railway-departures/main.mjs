import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(EXTENSION_DIR, "config.json");
const DEPARTURE_DETAILS_TEMPLATE = join(EXTENSION_DIR, "departure-details.html");
const DEPARTURE_RUNTIME_DIR = join(tmpdir(), "pragotron-departure-runtime");
const DEPARTURE_DETAILS_CACHE_FILE = join(DEPARTURE_RUNTIME_DIR, "details.json");
const DEPARTURE_LIVE_FEED_FILE = join(DEPARTURE_RUNTIME_DIR, "details-feed.js");
const DEPARTURE_DETAILS_HTML_FILE = join(DEPARTURE_RUNTIME_DIR, "details.html");
const DEPARTURE_DETAILS_STATE_FILE = join(DEPARTURE_RUNTIME_DIR, "details-window.json");
const DEPARTURE_DETAILS_WEBVIEW_DATA = join(DEPARTURE_RUNTIME_DIR, "details-webview-data");
const DEPARTURE_FORMATION_CACHE_FILE = join(DEPARTURE_RUNTIME_DIR, "formation-cache.json");
const CONFIGURATION_DIALOG_TEMPLATE = join(EXTENSION_DIR, "configuration.html");
const CONFIGURATION_DIALOG_HTML_FILE = join(DEPARTURE_RUNTIME_DIR, "configuration.html");
const CONFIGURATION_DIALOG_WEBVIEW_DATA = join(DEPARTURE_RUNTIME_DIR, "configuration-webview-data");
const CONFIGURATION_DIALOG_LAUNCHER = join(EXTENSION_DIR, "configuration-window.mjs");
const DEFAULT_REFRESH_MS = 30000;
const VAGONWEB_FETCH_TIMEOUT_MS = 10000;
const VAGONWEB_HTML_LIMIT = 8 * 1024 * 1024;

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
    const trainNumber = sourceTrainNumber;
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
    { name: "Leo Express", vagonwebCode: "LE", aliases: ["LE", "LEOEXPRESS"] },
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
        default:
            return "sprzel.svg";
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
        const sanitized = sanitizeVagonwebFormation(block, blockBaseUrl);
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
    return (await getConfiguredStations()).map((station) => station.url);
}

async function getConfiguredStations() {
    const config = await readConfigFile();
    if (!Array.isArray(config.urls)) return [];
    return config.urls
        .map((entry) => {
            if (typeof entry === "string") {
                return { url: entry.trim(), name: "" };
            }
            return {
                url: String(entry?.url || "").trim(),
                name: String(entry?.name || "").trim()
            };
        })
        .filter((entry) => entry.url);
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
        stationsCountLabel: "Configured stations:",
        stationsLabel: "Stations:",
        stationKeyLabel: "Key",
        unnamedStation: "(unnamed)",
        refreshLabel: "Refresh interval:",
        configHint: "Edit the config.json file in the extension folder and restart Salamander.",
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
    const currentStations = await getConfiguredStations();
    const configuredRefresh = Number(config.refreshMs);
    const currentRefresh = Number.isFinite(configuredRefresh) && configuredRefresh > 0
        ? configuredRefresh
        : DEFAULT_REFRESH_MS;
    const refreshText = currentRefresh % 1000 === 0
        ? `${currentRefresh / 1000} s`
        : `${currentRefresh} ms`;
    const stationNumberWidth = String(currentStations.length || 1).length;
    const stationRows = currentStations.map(({ name, url }, index) => {
            const stationName = name || strings.unnamedStation || "(unnamed)";
            const stationKey = deriveStationKeyFromUrl(url);
            const identifier = stationKey
                ? `${strings.stationKeyLabel || "Key"}=${stationKey}`
                : url;
            const number = String(index + 1).padStart(stationNumberWidth, "0");
            return { number, name: stationName, identifier };
        });
    const stationsText = stationRows.length
        ? stationRows.map(({ number, name, identifier }) => `${number}. ${name} (${identifier})`).join("\n  ")
        : strings.urlsNotConfigured || "(not configured)";
    const title = strings.settingsTitle || "Tabule SprŽel Settings";
    const fallbackText = `${strings.configTitle || "Configuration"}\n\n${strings.stationsCountLabel || "Configured stations:"} ${currentStations.length}\n${strings.refreshLabel || "Refresh interval:"} ${refreshText}\n\n${strings.stationsLabel || "Stations:"}\n  ${stationsText}\n\n${strings.configHint || "Edit the config.json file in the extension folder and restart Salamander."}`;

    try {
        await access(join(EXTENSION_DIR, "node_modules", "webview-node", "bin", "webview2-host.exe"));
        await access(CONFIGURATION_DIALOG_LAUNCHER);
        const configurationTemplate = await readFile(CONFIGURATION_DIALOG_TEMPLATE, "utf8");
        await mkdir(DEPARTURE_RUNTIME_DIR, { recursive: true });
        const listHtml = stationRows.length
            ? stationRows.map(({ number, name, identifier }) => `<li><span class="station-number">${escapeHtml(number)}.</span><span class="station-name">${escapeHtml(name)}</span><span class="station-key">${escapeHtml(identifier)}</span></li>`).join("")
            : `<li class="empty">${escapeHtml(strings.urlsNotConfigured || "(not configured)")}</li>`;
        const configHtml = Object.entries({
            "__CONFIG_LANGUAGE__": escapeHtml(strings.detailPageLanguage || "en"),
            "__CONFIG_TITLE__": escapeHtml(strings.configTitle || "Configuration"),
            "__STATIONS_COUNT_LABEL__": escapeHtml(strings.stationsCountLabel || "Configured stations:"),
            "__STATIONS_COUNT__": currentStations.length,
            "__REFRESH_LABEL__": escapeHtml(strings.refreshLabel || "Refresh interval:"),
            "__REFRESH_TEXT__": escapeHtml(refreshText),
            "__STATIONS_LABEL__": escapeHtml(strings.stationsLabel || "Stations:"),
            "__STATION_ROWS__": listHtml,
            "__CONFIG_HINT__": escapeHtml(strings.configHint || "Edit the config.json file in the extension folder and restart Salamander.")
        }).reduce((html, [placeholder, value]) => html.replaceAll(placeholder, String(value)), configurationTemplate);
        await writeFile(CONFIGURATION_DIALOG_HTML_FILE, configHtml, "utf8");
        await rm(CONFIGURATION_DIALOG_WEBVIEW_DATA, { recursive: true, force: true }).catch(() => { });
        const child = spawn(process.execPath, [
            CONFIGURATION_DIALOG_LAUNCHER,
            CONFIGURATION_DIALOG_HTML_FILE,
            title,
            CONFIGURATION_DIALOG_WEBVIEW_DATA
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
        child.unref();
        return;
    } catch (error) {
        try {
            console.error(`[TabuleSprZel] configuration dialog fallback: ${error instanceof Error ? error.message : String(error)}`);
        } catch { }
        await Salamander.ui.messageBox(fallbackText, title, "OK", "Information");
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

const addFileSystemItems = (items) => {
    const update = fileSystemItemsPromise
        .catch(() => { })
        .then(() => Salamander.fileSystem.addItems(items));
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

const startScraper = async ({ fallbackStation: configuredFallbackStation = null, strings = {}, reportError = false } = {}) => {
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
            return {
                id: item.id,
                key: departureNavigationKey(details),
                details: {
                    ...details,
                    carrierName: carrier.name || "Carrier",
                    carrierLogo: `data:image/svg+xml;base64,${carrierIcon}`,
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

        // Determine what view we're in: root or a specific station
        let activeStation = null;
        const invocationValues = [];
        const collectInvocationValue = (value) => {
            if (Array.isArray(value)) {
                value.forEach(collectInvocationValue);
            } else if (value !== undefined && value !== null && value !== "") {
                invocationValues.push(value);
            }
        };
        collectInvocationValue(rawInvocationPath);
        collectInvocationValue(item.id);
        collectInvocationValue(item.path);
        collectInvocationValue(item.name);
        const pathParts = invocationValues.flatMap((value) => String(value)
            .split(/[\\/!]/)
            .filter(Boolean));
        const stationSelectors = new Set(pathParts.flatMap((part) => {
            try {
                return [part, decodeURIComponent(part)];
            } catch {
                return [part];
            }
        }));

        for (const s of configuredStations) {
            const knownSelectors = [
                stationIdFor(s),
                legacyStationIdFor(s),
                previousStationIdFor(s),
                previousCompositeStationIdFor(s),
                stationNameFor(s)
            ].filter(Boolean);
            if (knownSelectors.some((selector) => stationSelectors.has(selector))) {
                activeStation = s;
                break;
            }
        }

        if (!activeStation) {
            // Root view: show station folders
            activeStationConfig = null;
            stopScraper();
            currentView = "root";
            const stationItems = configuredStations.map((s) => ({
                id: stationIdFor(s),
                name: stationNameFor(s),
                directory: true,
                enabled: true,
                icon: "icon.svg",
                iconDark: "icon.svg"
            }));
            if (requestId === listRequestId) {
                await addFileSystemItems(stationItems);
            }
            return;
        }

        // Station view: fetch departures only for the selected station.
        stopScraper();
        activeStationConfig = activeStation;
        const stationId = stationIdFor(activeStationConfig);
        const stringsPromise = detectLocale().then((locale) => getStringsAsync(locale));
        const storedPromise = loadCache();
        const scraperResult = await startScraper({
            strings: {},
            reportError: false
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

        const cache = { stations: [refreshedStation] };
        lastCache = cache;
        const departures = refreshedStation.departures || [];
        const stationName = stationNameFor(activeStation) || "Stanice";

        const now = new Date();

        const operatorIconFiles = await getOperatorIconFiles();
        if (requestId !== listRequestId) return;

        const items = buildItems(departures, operatorIconFiles, stationName);
        currentView = stationId;

        if (requestId !== listRequestId) return;
        // The detail action may run in another Node context. Persist in the
        // background so the departure list is visible as soon as it is built.
        await saveLocalDepartureDetails(items);
        void saveCache(cache);
        await addFileSystemItems(items);

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

        await rm(DEPARTURE_DETAILS_STATE_FILE, { force: true }).catch(() => { });
        const webviewDataFolder = DEPARTURE_DETAILS_WEBVIEW_DATA;

        const child = spawn(process.execPath, [
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
        await waitForDetailsWindow(title, id, departureNavigationKey(details));
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
        try {
            console.error(`[TabuleSprZel] failed to open departure details: ${describeDepartureDetailsError(error)}`);
        } catch { }
        await rm(`${DEPARTURE_DETAILS_HTML_FILE}.error`, { force: true }).catch(() => { });
        await departureDetailsFallback(detailsText, title, vagonwebUrl, strings, error);
    }
}

const handler = Salamander.commandHandler || Salamander.command_handler;

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
}
