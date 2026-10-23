import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const VAGONWEB_FETCH_TIMEOUT_MS = 10000;
const VAGONWEB_HTML_LIMIT = 8 * 1024 * 1024;
const VAGONWEB_SVG_LIMIT = 256 * 1024;
const FORMATION_CACHE_VERSION = 2;
const formationCache = new Map();
const formationRequests = new Map();
let formationCacheLoadPromise = null;

const HTML_ENTITIES = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
});

const decodeHtml = (value) => String(value ?? "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, reference) => {
        const normalized = reference.toLowerCase();
        if (normalized.startsWith("#x")) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
        if (normalized.startsWith("#")) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
        return HTML_ENTITIES[normalized] || entity;
    });

const cleanText = (value) => decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:div|p|li|span|td|th)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
            if (VAGONWEB_ALLOWED_ATTRIBUTES.has(name)) attributes.push(`${name}="${escapeHtml(value)}"`);
        }
        if (tag === "img" && !attributes.some((attribute) => attribute.startsWith("src=\""))) return "";
        return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}${VAGONWEB_VOID_TAGS.has(tag) ? " /" : ""}>`;
    }).replace(/Pl[áa]novan[ée] [rŘ]azen[íi]/gi, "");
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const localDateKey = () => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeFormationUrl = (value) => {
    try {
        const url = new URL(value);
        return isSafeVagonwebUrl(url.href) ? url.href : "";
    } catch {
        return "";
    }
};

const loadFormationCache = async (cachePath) => {
    if (formationCacheLoadPromise) return formationCacheLoadPromise;
    formationCacheLoadPromise = (async () => {
        if (!cachePath) return;
        try {
            const stored = JSON.parse(await readFile(cachePath, "utf8"));
            if (stored?.version !== FORMATION_CACHE_VERSION || !stored.entries || typeof stored.entries !== "object") return;
            const today = localDateKey();
            for (const [url, entry] of Object.entries(stored.entries)) {
                if (entry?.date === today && typeof entry.html === "string" && entry.html) {
                    formationCache.set(url, { date: today, html: entry.html });
                }
            }
        } catch { }
    })();
    return formationCacheLoadPromise;
};

const saveFormationCache = async (cachePath) => {
    if (!cachePath) return;
    const today = localDateKey();
    const entries = Object.fromEntries(
        [...formationCache]
            .filter(([, entry]) => entry.date === today && entry.html)
            .map(([url, entry]) => [url, entry])
    );
    const temporaryPath = `${cachePath}.${process.pid}.tmp`;
    try {
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(temporaryPath, JSON.stringify({
            version: FORMATION_CACHE_VERSION,
            entries
        }), "utf8");
        await rename(temporaryPath, cachePath);
    } catch {
        await writeFile(cachePath, JSON.stringify({
            version: FORMATION_CACHE_VERSION,
            entries
        }), "utf8").catch(() => { });
    }
};

const fetchVagonwebFormationUncached = async (vagonwebUrl, formationErrorText = "Train formation could not be loaded.") => {
    if (!isSafeVagonwebUrl(vagonwebUrl)) return { html: "", error: null };

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
            const response = await fetch(url, { ...options, headers, signal: controller.signal });
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
                html = await showResponse.text();
                if (html.length > VAGONWEB_HTML_LIMIT) throw new Error("Vagonweb detail is too large.");
                block = extractElementById(html, "planovane_razeni");
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

export async function fetchVagonwebFormation(
    vagonwebUrl,
    formationErrorText = "Train formation could not be loaded.",
    cachePath = ""
) {
    const cacheKey = normalizeFormationUrl(vagonwebUrl);
    if (!cacheKey) return fetchVagonwebFormationUncached(vagonwebUrl, formationErrorText);

    await loadFormationCache(cachePath);
    const today = localDateKey();
    const cached = formationCache.get(cacheKey);
    if (cached?.date === today && cached.html) {
        return { html: cached.html, error: null, cached: true };
    }

    const activeRequest = formationRequests.get(cacheKey);
    if (activeRequest) return activeRequest;

    const request = fetchVagonwebFormationUncached(cacheKey, formationErrorText)
        .then(async (result) => {
            if (!result.error && result.html) {
                formationCache.set(cacheKey, { date: today, html: result.html });
                await saveFormationCache(cachePath);
            }
            return result;
        })
        .finally(() => {
            formationRequests.delete(cacheKey);
        });
    formationRequests.set(cacheKey, request);
    return request;
}
