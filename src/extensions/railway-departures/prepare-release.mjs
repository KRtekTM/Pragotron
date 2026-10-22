import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const releaseDirectory = join(extensionDirectory, "release");

// Keep root-level runtime files explicit. Runtime asset directories below are copied recursively.
const ROOT_RUNTIME_FILES = [
    "extension.json",
    "main.mjs",
    "departure-window.mjs",
    "departure-formation.mjs",
    "departure-details.html",
    "colors-light.css",
    "colors-dark.css",
    "departure_details.css",
    "vagonweb.css",
    "config.json",
    "config-all-stations.json",
    "icon.svg",
    "icon-dark.svg",
    "sprzel.ico"
];

// New icons and locale files are included automatically when added to these directories.
const RUNTIME_DIRECTORIES = ["fonts", "icons", "locales"];

// webview-node contains development sources in bin/source; copy only what the launcher needs.
const WEBVIEW_RUNTIME_FILES = [
    "node_modules/webview-node/package.json",
    "node_modules/webview-node/src/index.js",
    "node_modules/webview-node/src/WebView.js",
    "node_modules/webview-node/src/ipc.js",
    "node_modules/webview-node/bin/webview2-host.exe",
    "node_modules/webview-node/bin/WebView2Loader.dll"
];

const copyFileToRelease = async (relativePath) => {
    const source = join(extensionDirectory, relativePath);
    const destination = join(releaseDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return relativePath;
};

const copyDirectoryToRelease = async (relativePath) => {
    const sourceDirectory = join(extensionDirectory, relativePath);
    const destinationDirectory = join(releaseDirectory, relativePath);
    const copied = [];
    await mkdir(destinationDirectory, { recursive: true });

    for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
        const entryPath = join(relativePath, entry.name);
        if (entry.isDirectory()) {
            copied.push(...await copyDirectoryToRelease(entryPath));
        } else if (entry.isFile()) {
            copied.push(await copyFileToRelease(entryPath));
        } else {
            throw new Error(`Unsupported runtime directory entry: ${entryPath}`);
        }
    }
    return copied;
};

await rm(releaseDirectory, { recursive: true, force: true });
await mkdir(releaseDirectory, { recursive: true });

const copiedFiles = [];
for (const relativePath of ROOT_RUNTIME_FILES) {
    copiedFiles.push(await copyFileToRelease(relativePath));
}
for (const relativePath of WEBVIEW_RUNTIME_FILES) {
    copiedFiles.push(await copyFileToRelease(relativePath));
}
for (const relativePath of RUNTIME_DIRECTORIES) {
    copiedFiles.push(...await copyDirectoryToRelease(relativePath));
}

const releaseRelativePath = relative(extensionDirectory, releaseDirectory);
console.log(`Prepared ${copiedFiles.length} runtime files in ${releaseRelativePath}`);
