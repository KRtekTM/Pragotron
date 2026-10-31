import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchStationTable, lensLeadSecondsFromConfig } from "./station-table.mjs";

const require = createRequire(import.meta.url);
const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const [statePath, webviewDataFolder, initialUrl, initialName] = process.argv.slice(2);

const POWERSHELL = "powershell.exe";
const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 760;
const DEFAULT_REFRESH_MS = 30000;
const PAGE_FILES = Object.freeze({
    "/": "station-departures.html",
    "/station-departures.css": "station-departures.css",
    "/station-departures.js": "station-departures.js"
});
const PAGE_TYPES = Object.freeze({
    "/": "text/html; charset=utf-8",
    "/station-departures.css": "text/css; charset=utf-8",
    "/station-departures.js": "text/javascript; charset=utf-8"
});

const nativeWindowScript = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class PragotronWindowApi {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
'@
`;

const getParentPosition = () => {
    const result = spawnSync(
        POWERSHELL,
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", `${nativeWindowScript}
$hWnd = [PragotronWindowApi]::GetForegroundWindow()
$rect = New-Object PragotronWindowApi+RECT
if ($hWnd -eq [IntPtr]::Zero -or -not [PragotronWindowApi]::GetWindowRect($hWnd, [ref]$rect)) { exit 1 }
Write-Output "$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"`],
        { encoding: "utf8", timeout: 2000, windowsHide: true }
    );
    if (result.status !== 0 || result.error) return null;
    const values = String(result.stdout || "")
        .trim()
        .split(",")
        .map((value) => Number(value));
    if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
    const [left, top, right, bottom] = values;
    return {
        x: Math.round(left + (right - left - WINDOW_WIDTH) / 2),
        y: Math.round(top + (bottom - top - WINDOW_HEIGHT) / 2)
    };
};

const startEscapeMonitor = (expectedTitle, onEscape) => {
    const script = `${nativeWindowScript}
$expectedTitle = $env:PRAGOTRON_WEBVIEW_TITLE
$wasEscapeDown = $false
while ($true) {
    $isEscapeDown = (([PragotronWindowApi]::GetAsyncKeyState(0x1B) -band 0x8000) -ne 0)
    if ($isEscapeDown -and -not $wasEscapeDown) {
        $foreground = [PragotronWindowApi]::GetForegroundWindow()
        $text = New-Object System.Text.StringBuilder 1024
        [void][PragotronWindowApi]::GetWindowText($foreground, $text, $text.Capacity)
        if ($text.ToString().StartsWith($expectedTitle, [System.StringComparison]::Ordinal)) {
            Write-Output 'ESC'
            [Console]::Out.Flush()
        }
    }
    $wasEscapeDown = $isEscapeDown
    Start-Sleep -Milliseconds 40
}`;
    const monitor = spawn(
        POWERSHELL,
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        {
            windowsHide: true,
            stdio: ["ignore", "pipe", "ignore"],
            env: { ...process.env, PRAGOTRON_WEBVIEW_TITLE: expectedTitle }
        }
    );
    monitor.stdout.setEncoding("utf8");
    let monitorBuffer = "";
    monitor.stdout.on("data", (data) => {
        monitorBuffer += String(data);
        const lines = monitorBuffer.split(/\r?\n/);
        monitorBuffer = lines.pop() || "";
        for (const line of lines) {
            if (line === "ESC") onEscape();
        }
    });
    monitor.on("error", () => { });
    return monitor;
};

const describeError = (error) => {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown WebView error");
    return message.replace(/\s+/g, " ").trim().slice(0, 1000) || "Unknown WebView error";
};

const errorPath = statePath ? `${statePath}.error` : "";
let server = null;
let port = 0;
let webView = null;
let allowWindowClose = false;
let escapeMonitor = null;
let exitCode = 0;
let webViewClosed = false;
let cleanupStarted = false;
let nativeUnavailable = false;
let refreshTimer = null;
let fetchGeneration = 0;
let currentUrl = String(initialUrl || "").trim();
let currentName = String(initialName || "").trim();
const controlToken = randomUUID();
let feed = {
    revision: 0,
    url: currentUrl,
    station: currentName,
    lensLeadSeconds: 90,
    departures: [],
    loading: true,
    error: ""
};

const readConfig = async () => {
    try {
        return JSON.parse(await readFile(join(extensionDirectory, "config.json"), "utf8"));
    } catch {
        return {};
    }
};

const refreshInterval = (config) => {
    const value = Number(config?.refreshMs);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_REFRESH_MS;
};

const readRequestBody = (request) => new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
        body += chunk;
        if (body.length > 64 * 1024) {
            reject(new Error("Control request is too large."));
            request.destroy();
        }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
});

const applyWindowTitle = (name) => {
    if (!webView || webView.isDestroyed() || nativeUnavailable) return;
    const title = String(name || "Odjezdy na tabulích").slice(0, 300);
    try {
        webView.setTitle(title);
    } catch { }
    if (escapeMonitor) {
        escapeMonitor.kill();
        escapeMonitor = null;
    }
    escapeMonitor = startEscapeMonitor(title, () => {
        if (webView && !webView.isDestroyed()) webView.hide();
    });
};

const loadStation = async (url, name) => {
    clearTimeout(refreshTimer);
    const generation = ++fetchGeneration;
    const config = await readConfig();
    const interval = refreshInterval(config);
    const lead = lensLeadSecondsFromConfig(config);
    const sameStation = feed.url === url;
    feed = {
        ...feed,
        revision: feed.revision + 1,
        url,
        station: name || feed.station,
        lensLeadSeconds: lead,
        departures: sameStation ? feed.departures : [],
        loading: true,
        error: ""
    };
    try {
        const result = await fetchStationTable({ url });
        if (generation !== fetchGeneration) return;
        feed = {
            ...feed,
            revision: feed.revision + 1,
            station: name || result.station || feed.station,
            departures: Array.isArray(result.departures) ? result.departures : [],
            loading: false,
            error: ""
        };
    } catch (error) {
        if (generation !== fetchGeneration) return;
        feed = {
            ...feed,
            revision: feed.revision + 1,
            loading: false,
            error: describeError(error)
        };
    }
    if (generation !== fetchGeneration) return;
    refreshTimer = setTimeout(() => {
        void loadStation(currentUrl, currentName);
    }, interval);
};

const showStation = async (url, name) => {
    const nextUrl = String(url || "").trim();
    const nextName = String(name || "").trim();
    if (!nextUrl) return;
    const changed = nextUrl !== currentUrl;
    currentUrl = nextUrl;
    currentName = nextName || currentName;
    applyWindowTitle(currentName);
    if (changed || feed.error) {
        await loadStation(currentUrl, currentName);
    }
    if (!webView || webView.isDestroyed() || nativeUnavailable) return;
    webView.show();
    webView.focus();
    setTimeout(() => {
        if (webView && !webView.isDestroyed()) webView.focus();
    }, 50);
};

const startServer = () => new Promise((resolve, reject) => {
    const httpServer = createServer(async (request, response) => {
        try {
            const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
            if (request.method === "GET" && requestUrl.pathname === "/feed") {
                response.writeHead(200, {
                    "content-type": "application/json; charset=utf-8",
                    "cache-control": "no-store"
                });
                response.end(JSON.stringify(feed));
                return;
            }
            if (request.method === "POST" && requestUrl.pathname === "/show") {
                const payload = JSON.parse(await readRequestBody(request));
                if (payload.token !== controlToken) {
                    response.writeHead(403);
                    response.end();
                    return;
                }
                if (!webView || webView.isDestroyed() || nativeUnavailable) {
                    response.writeHead(503);
                    response.end();
                    return;
                }
                await showStation(payload.url, payload.name);
                response.writeHead(204);
                response.end();
                return;
            }
            if (request.method !== "GET" || !PAGE_FILES[requestUrl.pathname]) {
                response.writeHead(404);
                response.end();
                return;
            }
            const filePath = join(extensionDirectory, PAGE_FILES[requestUrl.pathname]);
            const body = await readFile(filePath);
            response.writeHead(200, {
                "content-type": PAGE_TYPES[requestUrl.pathname],
                "cache-control": "no-store"
            });
            response.end(body);
        } catch (error) {
            response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            response.end(describeError(error));
        }
    });
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
        server = httpServer;
        port = httpServer.address().port;
        resolve();
    });
});

const stopServer = async () => {
    clearTimeout(refreshTimer);
    if (!server) return;
    const current = server;
    server = null;
    await new Promise((resolve) => current.close(() => resolve()));
};

const reportError = async (error) => {
    if (!errorPath) return;
    try {
        await writeFile(errorPath, describeError(error), "utf8");
    } catch { }
};

const cleanup = async () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    fetchGeneration += 1;
    await stopServer();
    if (statePath) await rm(statePath, { force: true }).catch(() => { });
    if (webviewDataFolder) {
        await rm(webviewDataFolder, { recursive: true, force: true }).catch(() => { });
    }
};

try {
    if (!statePath || !webviewDataFolder || !currentUrl) {
        throw new Error("The station departures WebView launcher received incomplete arguments.");
    }

    await startServer();
    void loadStation(currentUrl, currentName);

    const { WebView } = require(join(extensionDirectory, "node_modules", "webview-node"));
    if (typeof WebView !== "function") {
        throw new Error("webview-node did not export WebView.");
    }

    const position = getParentPosition();
    const title = currentName || "Odjezdy na tabulích";
    webView = new WebView({
        title,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        icon: join(extensionDirectory, "sprzel.ico"),
        minWidth: 960,
        minHeight: 420,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        center: true,
        backgroundColor: "#111111",
        userDataFolder: webviewDataFolder,
        windowsHide: true,
        ...(position || {})
    });

    let ready = false;
    let errorReported = false;
    let startupFailed = false;
    const reportOnce = (error) => {
        if (errorReported) return;
        errorReported = true;
        void reportError(error);
    };
    const reportStartupFailure = (error) => {
        startupFailed = true;
        allowWindowClose = true;
        reportOnce(error);
    };
    let startupTimer = setTimeout(() => {
        if (ready) return;
        reportStartupFailure(new Error("The WebView helper did not become ready within 8 seconds."));
        try {
            webView.close({ force: true });
        } catch { }
    }, 8000);

    webView.on("ready", () => {
        ready = true;
        clearTimeout(startupTimer);
        startupTimer = null;
        webView.show();
        webView.focus();
        escapeMonitor = startEscapeMonitor(title, () => {
            if (webView && !webView.isDestroyed()) webView.hide();
        });
        const hostPid = webView?._ipc?._proc?.pid;
        if (!Number.isInteger(hostPid) || hostPid < 1) {
            reportStartupFailure(new Error("The WebView native host did not expose a process ID."));
            return;
        }
        void writeFile(statePath, JSON.stringify({
            version: 1,
            port,
            token: controlToken,
            hostPid
        }), "utf8").catch((error) => {
            reportStartupFailure(error);
        });
    });
    webView.on("error", (error) => {
        if (!ready) reportStartupFailure(error);
        else {
            nativeUnavailable = true;
            allowWindowClose = true;
            reportOnce(error);
        }
        if (!ready) {
            try {
                webView.close({ force: true });
            } catch { }
            void cleanup();
        } else {
            void (async () => {
                await cleanup();
                process.exit(1);
            })();
        }
    });
    webView.on("close", (event) => {
        if (allowWindowClose) return;
        event.preventDefault();
        webView.hide();
    });
    webView.on("closed", () => {
        webViewClosed = true;
        if (startupTimer) clearTimeout(startupTimer);
        if (escapeMonitor) {
            escapeMonitor.kill();
            escapeMonitor = null;
        }
        void (async () => {
            if (!ready) reportStartupFailure(new Error("The WebView window closed before it became ready."));
            await cleanup();
            process.exit(startupFailed ? 1 : exitCode);
        })();
    });

    webView.loadURL(`http://127.0.0.1:${port}/`);
    webView.show();
} catch (error) {
    exitCode = 1;
    allowWindowClose = true;
    await reportError(error);
    try {
        if (webView && !webView.isDestroyed()) webView.close({ force: true });
    } catch { }
    try {
        if (escapeMonitor) escapeMonitor.kill();
    } catch { }
    await cleanup();
    process.exitCode = 1;
}

void webViewClosed;
