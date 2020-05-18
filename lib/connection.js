"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("./socket");
const logger_1 = require("./logger");
function listen(options) {
    const { webSocket, onConnection } = options;
    const logger = options.logger || new logger_1.ConsoleLogger();
    const socket = toSocket(webSocket);
    if (webSocket.readyState === WebSocket.OPEN) {
        const connection = socket_1.createWebSocketConnection(socket, logger);
        onConnection(connection);
    }
    else {
        webSocket.addEventListener('open', () => {
            const connection = socket_1.createWebSocketConnection(socket, logger);
            onConnection(connection);
        });
    }
}
exports.listen = listen;
function toSocket(webSocket) {
    return {
        send: (content) => {
            const t = new TextDecoder();
            const text = t.decode(new Uint8Array(content));
            if (text.length < 200 &&
                (text.includes('data did not match any variant of untagged enum Documentation') ||
                    text.includes('"method":"exit"'))) {
                console.warn('Prevented LSP crash.');
                return;
            }
            console.log('>>> TO LSP = ' + text);
            webSocket.send(content);
        },
        onMessage: (cb) => webSocket.addEventListener('message', (event) => cb(event.data)),
        onError: (cb) => webSocket.addEventListener('error', (event) => {
            if ('message' in event) {
                cb(event.message);
            }
        }),
        onClose: (cb) => webSocket.addEventListener('close', (event) => cb(event.code, event.reason)),
        dispose: () => console.warn('Trying to dispose websocket connection from WS JSONRPC')
    };
}
exports.toSocket = toSocket;
//# sourceMappingURL=connection.js.map