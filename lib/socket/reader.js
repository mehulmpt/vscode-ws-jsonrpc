"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const messageReader_1 = require("vscode-jsonrpc/lib/messageReader");
function sliceAnyHeaders(string) {
    // ! TODO: Fix this "hacky" slice
    const splitter = string.split('\r\n\r\n');
    if (splitter.length > 1) {
        // content headers might be present
        return splitter[1].trim();
    }
    return splitter[0].trim();
}
class WebSocketMessageReader extends messageReader_1.AbstractMessageReader {
    constructor(socket) {
        super();
        this.socket = socket;
        this.state = 'initial';
        this.events = [];
        this.pendingTCPChunks = [];
        this.socket.onMessage((message) => {
            const HANDSHAKE_SUCCESS = typeof message !== 'string';
            debugger;
            if (HANDSHAKE_SUCCESS) {
                // message for this reader only
                let utf8decoder = new TextDecoder();
                let info = sliceAnyHeaders(utf8decoder.decode(new Uint8Array(message)));
                // debugger
                console.warn('Chunk value: ', info);
                try {
                    // docker container could send data in chunks
                    info = this.pendingTCPChunks.join('') + info;
                    JSON.parse(info);
                    // success!
                    console.log('Success! Clearing chunks');
                    this.pendingTCPChunks = [];
                }
                catch (error) {
                    // still an error
                    console.warn('Adding to pending chunk => ', info, error);
                    this.pendingTCPChunks.push(info);
                    return;
                }
                this.readMessage(info);
            }
        });
        this.socket.onError(error => this.fireError(error));
        this.socket.onClose((code, reason) => {
            if (code !== 1000) {
                const error = {
                    name: '' + code,
                    message: `Error during socket reconnect: code = ${code}, reason = ${reason}`
                };
                this.fireError(error);
            }
            this.fireClose();
        });
    }
    listen(callback) {
        if (this.state === 'initial') {
            this.state = 'listening';
            this.callback = callback;
            while (this.events.length !== 0) {
                const event = this.events.pop();
                if (event.message) {
                    this.readMessage(event.message);
                }
                else if (event.error) {
                    this.fireError(event.error);
                }
                else {
                    this.fireClose();
                }
            }
        }
    }
    readMessage(message) {
        if (this.state === 'initial') {
            this.events.splice(0, 0, { message });
        }
        else if (this.state === 'listening') {
            const data = JSON.parse(message);
            this.callback(data);
        }
    }
    fireError(error) {
        if (this.state === 'initial') {
            this.events.splice(0, 0, { error });
        }
        else if (this.state === 'listening') {
            super.fireError(error);
        }
    }
    fireClose() {
        if (this.state === 'initial') {
            this.events.splice(0, 0, {});
        }
        else if (this.state === 'listening') {
            super.fireClose();
        }
        this.state = 'closed';
    }
}
exports.WebSocketMessageReader = WebSocketMessageReader;
//# sourceMappingURL=reader.js.map