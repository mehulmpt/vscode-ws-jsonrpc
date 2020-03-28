"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const messageReader_1 = require("vscode-jsonrpc/lib/messageReader");
// function sliceAnyHeaders(string: string) {
// 	// ! TODO: Fix this "hacky" slice
// 	const splitter = string.split('\r\n\r\n')
// 	if (splitter.length > 1) {
// 		// content headers might be present
// 		return splitter[1].trim()
// 	}
// 	return splitter[0].trim()
// }
class WebSocketMessageReader extends messageReader_1.AbstractMessageReader {
    constructor(socket) {
        super();
        this.socket = socket;
        this.state = 'initial';
        this.events = [];
        this.pendingTCPChunk = '';
        this.socket.onMessage((message) => {
            const HANDSHAKE_SUCCESS = typeof message !== 'string';
            console.warn('SUCCESSFUL HANDSHAKE? ', HANDSHAKE_SUCCESS);
            if (HANDSHAKE_SUCCESS) {
                // message for this reader only
                let utf8decoder = new TextDecoder();
                let text = utf8decoder.decode(new Uint8Array(message));
                this.getReadableChunks(text);
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
    getReadableChunks(data) {
        // Explanation:
        // 0. Remove newlines
        // 1. Start matching { <-- start of JSON character
        // 2. Match as much as you can until you get a } followed by C
        // 3. It'll also match } followed by a $ in case a perfect chunk arrives
        // 4. It'll also match only opening { without a closing json matching a broken chunk (parent chunk)
        // 5. It'll also match a closing } without an opening } matching a broken chunk (child chunk)
        data = data.replace(/\r|\n/gm, '');
        const regex = this.pendingTCPChunk === '' ? /((\{)(.*?)(\}|$))(C|$)/g : /((\{|^)(.*?)(\}|$))(C|$)/g;
        // const test1 = /(\{(.*?)\})(C|$)/g
        let match;
        debugger;
        while (true) {
            match = regex.exec(data);
            if (!match)
                break;
            const possibleJSON = match[1];
            try {
                const payload = JSON.parse(this.pendingTCPChunk + possibleJSON);
                // success
                this.pendingTCPChunk = '';
                this.readMessage(payload);
                console.log('Sending payload to read successfully');
            }
            catch (error) {
                // corrupted payload
                console.log('Corrupted payload received => ' + possibleJSON);
                this.pendingTCPChunk += possibleJSON;
                break; // this should technically be the point where no matches should happen anyway
            }
        }
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
            this.events.splice(0, 0, { message: message.toString() });
        }
        else if (this.state === 'listening') {
            // const data = JSON.parse(message)
            this.callback(message); // already JSON parse'd
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