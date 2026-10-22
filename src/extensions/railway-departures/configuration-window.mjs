import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const [htmlPath, title, webviewDataFolder] = process.argv.slice(2);
const closeToken = randomUUID();
let closeServer = null;
let window = null;
let allowWindowClose = true;
let cleanupStarted = false;

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
            const authorized = requestUrl.searchParams.get("token") === closeToken;
            if (request.method !== "GET" || requestUrl.pathname !== "/close" || !authorized) {
                response.writeHead(404);
                response.end();
                return;
            }
            response.writeHead(204, {
                "Access-Control-Allow-Origin": "*"
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
        );
        if (updatedHtml !== currentHtml) await writeFile(htmlPath, updatedHtml, "utf8");
        resolve();
    });
});

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
