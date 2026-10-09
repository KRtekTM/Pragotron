import { createServer } from 'node:http';
import { attachBoardChannel } from './board-channel-server.mjs';
import { resolveBoardChannelUrl } from '../src/platform/board-transport.js';
import { getDefaultLiveApiUrl } from '../src/platform/live-departures.js';

const assertEqual = (label, actual, expected) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
};

assertEqual(
    'same-origin network channel',
    resolveBoardChannelUrl({
        protocol: 'http:',
        host: '192.168.1.20:4787',
        search: '',
        href: 'http://192.168.1.20:4787/departureBoard.html'
    }),
    'ws://192.168.1.20:4787/api/board-channel'
);

assertEqual(
    'file page without hub stays local',
    resolveBoardChannelUrl({
        protocol: 'file:',
        host: '',
        search: '',
        href: 'file:///departureBoard.html'
    }),
    ''
);

assertEqual(
    'explicit hub',
    resolveBoardChannelUrl({
        protocol: 'file:',
        host: '',
        search: '?hub=http://10.0.0.8:4787',
        href: 'file:///departureBoard.html?hub=http://10.0.0.8:4787'
    }),
    'ws://10.0.0.8:4787/api/board-channel'
);

assertEqual(
    'lan manage uses its own live api',
    getDefaultLiveApiUrl({
        protocol: 'http:',
        hostname: '192.168.1.20',
        port: '4787',
        origin: 'http://192.168.1.20:4787'
    }),
    'http://192.168.1.20:4787/api/live-departures'
);

assertEqual(
    'loopback scraper port stays on 127.0.0.1',
    getDefaultLiveApiUrl({
        protocol: 'http:',
        hostname: 'localhost',
        port: '4787',
        origin: 'http://localhost:4787'
    }),
    'http://127.0.0.1:4787/api/live-departures'
);

if (typeof WebSocket !== 'function') {
    console.log('ok (websocket client unavailable, relay test skipped)');
    process.exit(0);
}

const server = createServer();
attachBoardChannel(server);

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});

const { port } = server.address();
const url = `ws://127.0.0.1:${port}/api/board-channel`;
const first = new WebSocket(url);
const second = new WebSocket(url);

await Promise.all([first, second].map((socket) => new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
})));

const received = new Promise((resolve) => {
    second.addEventListener('message', (event) => resolve(String(event.data)), {
        once: true
    });
});
first.send(JSON.stringify({ version: 2, messageId: 'message-test' }));
const payload = await received;
const parsed = JSON.parse(payload);
if (parsed.messageId !== 'message-test') {
    throw new Error(`relay did not deliver the message: ${payload}`);
}
if (parsed.relay?.remoteAddress !== '127.0.0.1'
    || parsed.relay?.localAddress !== '127.0.0.1') {
    throw new Error(`relay did not include the peer address: ${payload}`);
}

first.close();
second.close();
await new Promise((resolve) => server.close(resolve));
console.log('ok');
