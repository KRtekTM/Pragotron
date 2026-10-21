import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(EXTENSION_DIR, "config.json");
const DEPARTURE_DETAILS_TEMPLATE = join(EXTENSION_DIR, "departure-details.html");
const DETAIL_FONT_FILES = Object.freeze([
    "fonts/open-sans-latin-400-normal.woff2",
    "fonts/open-sans-latin-ext-400-normal.woff2",
    "fonts/open-sans-latin-600-normal.woff2",
    "fonts/open-sans-latin-ext-600-normal.woff2",
    "fonts/open-sans-latin-800-normal.woff2",
    "fonts/open-sans-latin-ext-800-normal.woff2",
    "fonts/open-sans-latin-400-italic.woff2",
    "fonts/open-sans-latin-ext-400-italic.woff2",
    "fonts/open-sans-latin-600-italic.woff2",
    "fonts/open-sans-latin-ext-600-italic.woff2",
    "fonts/open-sans-latin-800-italic.woff2",
    "fonts/open-sans-latin-ext-800-italic.woff2"
]);
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

async function buildDepartureDetailsFromTemplate(details, strings, title, vagonwebUrl, formation) {
    const template = await readDepartureDetailsTemplate();
    const value = (input, fallback) => escapeHtml(departureHtmlValue(input, fallback));
    const label = (input, fallback) => departureHtmlLabel(input, fallback);
    const icon = async (relativePath) => escapeHtml(
        `data:image/svg+xml;base64,${await readDepartureDetailsIcon(relativePath)}`
    );
    const operator = departureHtmlValue(details.operator, "");
    const carrier = resolveCarrier(operator);
    const operatorKey = operator.toUpperCase();
    var operatorIcon = "sprzel.svg";
    switch (operatorKey) {
        case "RJET":
            operatorIcon = "operators/RJET_details.svg";
            break;
        case "ARV":
        case "ARR":
            operatorIcon = "operators/ARR_details.svg";
            break;
        case "CD":
        case "ČD":
            operatorIcon = "operators/CD_details.svg";
            break;
        default:
            operatorIcon = "sprzel.svg";
    }
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
    const safeUrl = isSafeVagonwebUrl(vagonwebUrl) ? escapeHtml(vagonwebUrl) : "";
    const hasFormationUrl = Boolean(safeUrl);
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
        COLORS_CSS: colorsCss,
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
        const stationName = stationNameFor(activeStation) || "Stanice";

        const now = new Date();

        const operatorIconFiles = await getOperatorIconFiles();
        if (requestId !== listRequestId) return;

        const items = buildItems(departures, operatorIconFiles, stationName);
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
                        station: d.station || stationName || ""
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

const describeDepartureDetailsError = (error) => {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown WebView error");
    return message.replace(/\s+/g, " ").trim().slice(0, 500) || "Unknown WebView error";
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
    let directory = null;
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

        directory = await mkdtemp(join(tmpdir(), "pragotron-departure-"));
        const htmlPath = join(directory, "details.html");
        const formationErrorText = String(
            strings.detailFormationError || "Train formation could not be loaded."
        );
        const formation = vagonwebUrl
            ? { html: `<div class="formation-status"><span class="loader"></span>${escapeHtml(departureHtmlValue(strings.detailFormationLoading, "Loading train formation..."))}</div>` }
            : { html: "" };
        const html = await buildDepartureDetailsFromTemplate(details, strings, title, vagonwebUrl, formation);
        if (
            typeof html !== "string"
            || html.length === 0
            || html.length > 1024 * 1024
            || !html.startsWith("<!doctype html>")
            || !html.includes('<main class="card">')
        ) {
            throw new Error("Invalid departure details document");
        }
        await mkdir(join(directory, "fonts"), { recursive: true });
        await Promise.all([
            copyFile(join(EXTENSION_DIR, "colors-light.css"), join(directory, "colors-light.css")),
            copyFile(join(EXTENSION_DIR, "colors-dark.css"), join(directory, "colors-dark.css")),
            copyFile(join(EXTENSION_DIR, "departure_details.css"), join(directory, "departure_details.css")),
            copyFile(join(EXTENSION_DIR, "vagonweb.css"), join(directory, "vagonweb.css")),
            ...DETAIL_FONT_FILES.map((relativePath) =>
                copyFile(join(EXTENSION_DIR, relativePath), join(directory, relativePath))
            )
        ]);
        await writeFile(htmlPath, html, "utf8");

        const child = spawn(process.execPath, [launcherPath, htmlPath, directory, title, vagonwebUrl, formationErrorText], {
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
        directory = null;
        return;
    } catch (error) {
        try {
            console.error(`[TabuleSprZel] failed to open departure details: ${describeDepartureDetailsError(error)}`);
        } catch { }
        if (directory) await rm(directory, { recursive: true, force: true }).catch(() => { });
        await departureDetailsFallback(detailsText, title, vagonwebUrl, strings, error);
    }
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
