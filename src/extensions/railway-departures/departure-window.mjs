import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchVagonwebFormation } from "./departure-formation.mjs";

const require = createRequire(import.meta.url);
const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const [htmlPath, directory, title, vagonwebUrl, formationErrorText, webviewDataFolder, statePath] = process.argv.slice(2);

const POWERSHELL = "powershell.exe";
const WINDOW_WIDTH = 975;
const WINDOW_HEIGHT = 665;

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

const startEscapeMonitor = (onEscape) => {
    const script = `${nativeWindowScript}
$expectedTitle = $env:PRAGOTRON_WEBVIEW_TITLE
$wasDown = $false
while ($true) {
    $isDown = (([PragotronWindowApi]::GetAsyncKeyState(0x1B) -band 0x8000) -ne 0)
    if ($isDown -and -not $wasDown) {
        $foreground = [PragotronWindowApi]::GetForegroundWindow()
        $text = New-Object System.Text.StringBuilder 1024
        [void][PragotronWindowApi]::GetWindowText($foreground, $text, $text.Capacity)
        if ($text.ToString() -eq $expectedTitle) {
            Write-Output 'ESC'
            [Console]::Out.Flush()
            break
        }
    }
    $wasDown = $isDown
    Start-Sleep -Milliseconds 40
}`;
    const monitor = spawn(
        POWERSHELL,
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        {
            windowsHide: true,
            stdio: ["ignore", "pipe", "ignore"],
            env: { ...process.env, PRAGOTRON_WEBVIEW_TITLE: title }
        }
    );
    monitor.stdout.setEncoding("utf8");
    monitor.stdout.on("data", (data) => {
        if (String(data).includes("ESC")) onEscape();
    });
    monitor.on("error", () => { });
    return monitor;
};

const errorPath = htmlPath ? `${htmlPath}.error` : "";
const userDataPath = webviewDataFolder || (directory ? join(directory, "webview-data") : "");
let formationServer = null;
let formationEndpoint = "";
let controlServer = null;
let window = null;
let allowWindowClose = false;
let escapeMonitor = null;
let exitCode = 0;
let windowClosed = false;
const controlToken = randomUUID();

const startFormationServer = () => new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (request.method === "OPTIONS") {
            response.writeHead(204);
            response.end();
            return;
        }
        try {
            const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
            if (request.method !== "GET" || requestUrl.pathname !== "/formation") {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(JSON.stringify({ html: "", error: "Not found." }));
                return;
            }
            const result = await fetchVagonwebFormation(
                requestUrl.searchParams.get("url") || "",
                formationErrorText
            );
            response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
            response.end(JSON.stringify({
                html: result.html || "",
                error: result.error ? describeError(result.error) : null
            }));
        } catch (error) {
            response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
            response.end(JSON.stringify({ html: "", error: describeError(error) }));
        }
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
        formationServer = server;
        const address = server.address();
        resolve(`http://127.0.0.1:${address.port}/formation`);
    });
});

const stopFormationServer = async () => {
    if (!formationServer) return;
    const server = formationServer;
    formationServer = null;
    await new Promise((resolve) => server.close(() => resolve()));
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

const startControlServer = () => new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
        try {
            const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
            if (request.method !== "POST" || requestUrl.pathname !== "/show") {
                response.writeHead(404);
                response.end();
                return;
            }
            const payload = JSON.parse(await readRequestBody(request));
            if (payload.token !== controlToken) {
                response.writeHead(403);
                response.end();
                return;
            }
            if (!window || window.isDestroyed()) {
                response.writeHead(503);
                response.end();
                return;
            }
            const currentHtml = await readFile(htmlPath, "utf8");
            const updatedHtml = currentHtml.replaceAll("__PRAGOTRON_FORMATION_ENDPOINT__", formationEndpoint);
            if (updatedHtml !== currentHtml) await writeFile(htmlPath, updatedHtml, "utf8");
            const nextTitle = String(payload.title || title).slice(0, 300);
            window.setTitle(nextTitle);
            window.loadFile(htmlPath);
            window.show();
            window.focus();
            response.writeHead(204);
            response.end();
        } catch {
            response.writeHead(400);
            response.end();
        }
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", async () => {
        controlServer = server;
        try {
            const address = server.address();
            await writeFile(statePath, JSON.stringify({
                port: address.port,
                token: controlToken
            }), "utf8");
            resolve();
        } catch (error) {
            reject(error);
        }
    });
});

const stopControlServer = async () => {
    if (controlServer) {
        const server = controlServer;
        controlServer = null;
        await new Promise((resolve) => server.close(() => resolve()));
    }
    if (statePath) await rm(statePath, { force: true }).catch(() => { });
};

const cleanup = async () => {
    await stopControlServer();
    await stopFormationServer();
    if (htmlPath) await rm(htmlPath, { force: true }).catch(() => { });
    if (errorPath) await rm(errorPath, { force: true }).catch(() => { });
    if (webviewDataFolder) {
        await rm(webviewDataFolder, { recursive: true, force: true }).catch(() => { });
    } else if (directory) {
        await rm(directory, { recursive: true, force: true }).catch(() => { });
    }
};

const describeError = (error) => {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown WebView error");
    return message.replace(/\s+/g, " ").trim().slice(0, 1000) || "Unknown WebView error";
};

const reportError = async (error) => {
    if (!errorPath) return;
    try {
        await writeFile(errorPath, describeError(error), "utf8");
    } catch { }
};

try {
    if (!htmlPath || !directory || !title || !statePath) {
        throw new Error("The departure WebView launcher received incomplete arguments.");
    }

    formationEndpoint = await startFormationServer();
    const currentHtml = await readFile(htmlPath, "utf8");
    const updatedHtml = currentHtml.replaceAll("__PRAGOTRON_FORMATION_ENDPOINT__", formationEndpoint);
    if (updatedHtml !== currentHtml) await writeFile(htmlPath, updatedHtml, "utf8");

    const { WebView } = require(join(extensionDirectory, "node_modules", "webview-node"));
    if (typeof WebView !== "function") {
        throw new Error("webview-node did not export WebView.");
    }

    const position = getParentPosition();
    window = new WebView({
        title,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        icon: join(extensionDirectory, "sprzel.ico"),
        minWidth: 760,
        minHeight: 420,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        center: true,
        backgroundColor: "#eff8fe",
        userDataFolder: userDataPath,
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
            window.close({ force: true });
        } catch { }
    }, 8000);

    window.on("ready", () => {
        ready = true;
        clearTimeout(startupTimer);
        startupTimer = null;
    });
    window.on("error", (error) => {
        if (!ready) reportStartupFailure(error);
        else reportOnce(error);
        if (!ready) {
            try {
                window.close({ force: true });
            } catch { }
        }
    });
    window.on("close", (event) => {
        if (allowWindowClose) return;
        event.preventDefault();
        window.hide();
    });
    window.on("closed", () => {
        windowClosed = true;
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

    await startControlServer();
    escapeMonitor = startEscapeMonitor(() => {
        if (window && !window.isDestroyed()) window.hide();
    });
    window.loadFile(htmlPath);
    window.show();
} catch (error) {
    exitCode = 1;
    allowWindowClose = true;
    await reportError(error);
    try {
        if (window && !window.isDestroyed()) window.close({ force: true });
    } catch { }
    try {
        if (escapeMonitor) escapeMonitor.kill();
    } catch { }
    await cleanup();
    process.exitCode = 1;
}
