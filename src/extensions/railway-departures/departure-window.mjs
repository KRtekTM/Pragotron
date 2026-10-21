import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchVagonwebFormation } from "./departure-formation.mjs";

const require = createRequire(import.meta.url);
const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const [htmlPath, directory, title, vagonwebUrl] = process.argv.slice(2);

const POWERSHELL = "powershell.exe";
const WINDOW_WIDTH = 1014;
const WINDOW_HEIGHT = 520;

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

const errorPath = directory ? join(directory, "webview-error.txt") : "";

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

let window = null;
let escapeMonitor = null;
let exitCode = 0;
let windowClosed = false;
try {
    if (!htmlPath || !directory || !title) {
        throw new Error("The departure WebView launcher received incomplete arguments.");
    }

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
        maxWidth: 1400,
        maxHeight: 1100,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        center: true,
        backgroundColor: "#eff8fe",
        userDataFolder: join(directory, "webview-data"),
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
    window.on("closed", () => {
        windowClosed = true;
        if (startupTimer) clearTimeout(startupTimer);
        if (escapeMonitor) {
            escapeMonitor.kill();
            escapeMonitor = null;
        }
        void (async () => {
            if (!ready) reportStartupFailure(new Error("The WebView window closed before it became ready."));
            await rm(directory, { recursive: true, force: true }).catch(() => { });
            process.exit(startupFailed ? 1 : exitCode);
        })();
    });

    escapeMonitor = startEscapeMonitor(() => {
        if (window && !window.isDestroyed()) window.close({ force: true });
    });
    window.loadFile(htmlPath);
    window.show();
    if (vagonwebUrl) {
        void (async () => {
            const formation = await fetchVagonwebFormation(vagonwebUrl);
            if (windowClosed || !window || window.isDestroyed()) return;
            const current = await readFile(htmlPath, "utf8");
            const marker = /<!-- PRAGOTRON_FORMATION_START -->[\s\S]*?<!-- PRAGOTRON_FORMATION_END -->/;
            if (!marker.test(current)) return;
            const updated = current.replace(
                marker,
                () => `<!-- PRAGOTRON_FORMATION_START -->${formation.html}<!-- PRAGOTRON_FORMATION_END -->`
            );
            if (updated === current) return;
            await writeFile(htmlPath, updated, "utf8");
            if (!windowClosed && window && !window.isDestroyed()) window.loadFile(htmlPath);
        })().catch(reportOnce);
    }
} catch (error) {
    exitCode = 1;
    await reportError(error);
    try {
        if (window && !window.isDestroyed()) window.close({ force: true });
    } catch { }
    try {
        if (escapeMonitor) escapeMonitor.kill();
    } catch { }
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => { });
    process.exitCode = 1;
}
