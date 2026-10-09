import { createHash } from 'node:crypto';

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE_BYTES = 2_000_000;
export const BOARD_CHANNEL_PATH = '/api/board-channel';

const encodeFrame = (opcode, payload) => {
    const length = payload.length;
    let header;
    if (length < 126) {
        header = Buffer.from([0x80 | opcode, length]);
    } else if (length <= 0xffff) {
        header = Buffer.alloc(4);
        header[0] = 0x80 | opcode;
        header[1] = 126;
        header.writeUInt16BE(length, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payload]);
};

const encodeServerText = (text) => encodeFrame(
    0x1,
    Buffer.from(String(text), 'utf8')
);

const normalizeIp = (value) => {
    const text = String(value || '').trim();
    const mapped = text.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    return mapped ? mapped[1] : text;
};

const annotateRelay = (text, client) => {
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return text;
        }
        parsed.relay = {
            remoteAddress: client.remoteAddress || '',
            localAddress: client.localAddress || ''
        };
        return JSON.stringify(parsed);
    } catch {
        return text;
    }
};

const createClient = (socket, onText) => {
    let buffer = Buffer.alloc(0);
    let fragments = [];

    const sendControl = (opcode, payload = Buffer.alloc(0)) => {
        if (!socket.destroyed) {
            socket.write(encodeFrame(opcode, payload));
        }
    };

    const fail = () => {
        socket.destroy();
    };

    const consume = () => {
        while (buffer.length >= 2) {
            const first = buffer[0];
            const second = buffer[1];
            const fin = (first & 0x80) !== 0;
            const opcode = first & 0x0f;
            const masked = (second & 0x80) !== 0;
            let length = second & 0x7f;
            let offset = 2;

            if (length === 126) {
                if (buffer.length < 4) {
                    return;
                }
                length = buffer.readUInt16BE(2);
                offset = 4;
            } else if (length === 127) {
                if (buffer.length < 10) {
                    return;
                }
                const wideLength = buffer.readBigUInt64BE(2);
                if (wideLength > BigInt(MAX_MESSAGE_BYTES)) {
                    fail();
                    return;
                }
                length = Number(wideLength);
                offset = 10;
            }

            if (length > MAX_MESSAGE_BYTES) {
                fail();
                return;
            }

            const maskLength = masked ? 4 : 0;
            const frameLength = offset + maskLength + length;
            if (buffer.length < frameLength) {
                return;
            }

            let payload = buffer.subarray(offset + maskLength, frameLength);
            if (masked) {
                const mask = buffer.subarray(offset, offset + 4);
                payload = Buffer.from(payload);
                for (let index = 0; index < payload.length; index += 1) {
                    payload[index] ^= mask[index % 4];
                }
            }
            buffer = Buffer.from(buffer.subarray(frameLength));

            if (opcode === 0x8) {
                sendControl(0x8);
                socket.end();
                return;
            }
            if (opcode === 0x9) {
                sendControl(0xa, payload);
                continue;
            }
            if (opcode === 0xa) {
                continue;
            }
            if (opcode !== 0x1 && opcode !== 0x0) {
                continue;
            }

            if (opcode === 0x1) {
                fragments = [payload];
            } else {
                fragments.push(payload);
            }
            if (!fin) {
                continue;
            }

            const text = Buffer.concat(fragments).toString('utf8');
            fragments = [];
            onText(text);
        }
    };

    return {
        send(text) {
            if (!socket.destroyed) {
                socket.write(encodeServerText(text));
            }
        },
        push(chunk) {
            if (!chunk?.length || socket.destroyed) {
                return;
            }
            buffer = Buffer.concat([buffer, chunk]);
            consume();
        },
        close() {
            if (!socket.destroyed) {
                socket.destroy();
            }
        }
    };
};

export const attachBoardChannel = (server) => {
    const clients = new Set();

    server.on('upgrade', (request, socket, head) => {
        let pathname = '/';
        try {
            pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
        } catch {
            socket.destroy();
            return;
        }

        if (pathname !== BOARD_CHANNEL_PATH) {
            socket.destroy();
            return;
        }

        const key = request.headers['sec-websocket-key'];
        if (!key || Array.isArray(key)) {
            socket.destroy();
            return;
        }

        const accept = createHash('sha1')
            .update(`${key}${WEBSOCKET_GUID}`)
            .digest('base64');
        socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n'
            + 'Upgrade: websocket\r\n'
            + 'Connection: Upgrade\r\n'
            + `Sec-WebSocket-Accept: ${accept}\r\n`
            + '\r\n'
        );

        const client = createClient(socket, (text) => {
            const outbound = annotateRelay(text, client);
            clients.forEach((other) => {
                if (other !== client) {
                    other.send(outbound);
                }
            });
        });
        client.remoteAddress = normalizeIp(socket.remoteAddress);
        client.localAddress = normalizeIp(socket.localAddress);
        clients.add(client);
        if (head?.length) {
            client.push(head);
        }

        const remove = () => {
            clients.delete(client);
        };
        socket.on('data', (chunk) => client.push(chunk));
        socket.on('close', remove);
        socket.on('end', remove);
        socket.on('error', () => {
            remove();
            client.close();
        });
    });

    return {
        close() {
            clients.forEach((client) => client.close());
            clients.clear();
        }
    };
};
