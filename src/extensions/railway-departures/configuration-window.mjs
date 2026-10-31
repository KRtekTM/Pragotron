import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const [htmlPath, title, webviewDataFolder, favoriteSelectionPath] = process.argv.slice(2);
const closeToken = randomUUID();
const saveToken = randomUUID();
let closeServer = null;
let window = null;
let allowWindowClose = true;
let cleanupStarted = false;

const closeConfigurationWindow = () => {
    allowWindowClose = true;
    setTimeout(() => {
        try {
            if (window && !window.isDestroyed()) window.close({ force: true });
        } catch { }
    }, 50);
};

const cleanup = async () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    if (closeServer) {
        const server = closeServer;
        closeServer = null;
        await new Promise((resolve) => server.close(() => resolve()));
    }
    if (htmlPath) await rm(htmlPath, { force: true }).catch(() => { });
    if (webviewDataFolder) await rm(webviewDataFolder, { recursive: true, force: true }).catch(() => { });
};

const startCloseServer = () => new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
        try {
            const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
            const isClose = request.method === "GET" && requestUrl.pathname === "/close";
            const isSave = request.method === "POST" && requestUrl.pathname === "/save";
            const isPreflight = request.method === "OPTIONS"
                && (requestUrl.pathname === "/close" || requestUrl.pathname === "/save");
            if (isPreflight) {
                response.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "content-type"
                });
                response.end();
                return;
            }
            const authorized = (isClose && requestUrl.searchParams.get("token") === closeToken)
                || (isSave && requestUrl.searchParams.get("token") === saveToken);
            if (!authorized) {
                response.writeHead(404);
                response.end();
                return;
            }

            if (isSave) {
                const chunks = [];
                let size = 0;
                request.on("data", (chunk) => {
                    size += chunk.length;
                    if (size <= 4 * 1024 * 1024) chunks.push(chunk);
                });
                request.on("end", async () => {
                    try {
                        if (size > 4 * 1024 * 1024) throw new Error("The configuration update is too large.");
                        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                        const favorites = [...new Set(
                            Array.isArray(body?.favorites)
                                ? body.favorites.filter((url) => typeof url === "string" && url.trim())
                                    .map((url) => url.trim())
                                : []
                        )];
                        const id = randomUUID();
                        await writeSelectionAtomically(favoriteSelectionPath, {
                            version: 1,
                            id,
                            favorites
                        });
                        const payload = JSON.stringify({ ok: true });
                        response.writeHead(200, {
                            "content-type": "application/json; charset=utf-8",
                            "content-length": Buffer.byteLength(payload),
                            "connection": "close",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                            "Access-Control-Allow-Headers": "content-type"
                        });
                        response.end(payload);
                        closeConfigurationWindow();
                    } catch (error) {
                        response.writeHead(400, {
                            "content-type": "application/json; charset=utf-8",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                            "Access-Control-Allow-Headers": "content-type"
                        });
                        response.end(JSON.stringify({
                            ok: false,
                            error: error instanceof Error ? error.message : String(error)
                        }));
                    }
                });
                return;
            }

            response.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "content-type"
            });
            response.end();
            allowWindowClose = true;
            setTimeout(() => {
                try {
                    if (window && !window.isDestroyed()) window.close({ force: true });
                } catch { }
            }, 20);
        } catch {
            response.writeHead(400);
            response.end();
        }
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", async () => {
        closeServer = server;
        const address = server.address();
        const currentHtml = await readFile(htmlPath, "utf8");
        const updatedHtml = currentHtml.replaceAll(
            "__PRAGOTRON_CLOSE_ENDPOINT__",
            `http://127.0.0.1:${address.port}/close?token=${encodeURIComponent(closeToken)}`
        ).replaceAll(
            "__PRAGOTRON_SAVE_ENDPOINT__",
            `http://127.0.0.1:${address.port}/save?token=${encodeURIComponent(saveToken)}`
        );
        if (updatedHtml !== currentHtml) await writeFile(htmlPath, updatedHtml, "utf8");
        resolve();
    });
});

const writeSelectionAtomically = async (path, selection) => {
    if (!path) throw new Error("No writable configuration path is available.");
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporaryPath, JSON.stringify(selection), "utf8");
        try {
            await rename(temporaryPath, path);
        } catch (error) {
            // Windows does not replace an existing file with rename().
            if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
            await rm(path, { force: true });
            await rename(temporaryPath, path);
        }
    } finally {
        await rm(temporaryPath, { force: true }).catch(() => { });
    }
};

try {
    if (!htmlPath || !title) throw new Error("The configuration WebView launcher received incomplete arguments.");
    await startCloseServer();

    const { WebView } = require(join(extensionDirectory, "node_modules", "webview-node"));
    if (typeof WebView !== "function") throw new Error("webview-node did not export WebView.");

    window = new WebView({
        title,
        width: 760,
        height: 600,
        icon: join(extensionDirectory, "sprzel.ico"),
        minWidth: 600,
        minHeight: 420,
        resizable: true,
        maximizable: false,
        minimizable: true,
        closable: true,
        center: true,
        backgroundColor: "#eff8fe",
        ...(webviewDataFolder ? { userDataFolder: webviewDataFolder } : {}),
        windowsHide: true
    });

    window.on("ready", () => {
        window.show();
        window.focus();
    });
    window.on("error", async () => {
        allowWindowClose = true;
        try {
            if (window && !window.isDestroyed()) window.close({ force: true });
        } catch { }
        await cleanup();
        process.exit(1);
    });
    window.on("close", (event) => {
        if (!allowWindowClose) event.preventDefault();
    });
    window.on("closed", async () => {
        await cleanup();
        process.exit(0);
    });
    window.loadFile(htmlPath);
    window.show();
    window.focus();
} catch (error) {
    console.error(`[TabuleSprZel] configuration dialog: ${error instanceof Error ? error.message : String(error)}`);
    await cleanup();
    process.exit(1);
}
