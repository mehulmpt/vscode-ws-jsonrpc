/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Message } from 'vscode-jsonrpc/lib/messages'
import { AbstractMessageWriter } from 'vscode-jsonrpc/lib/messageWriter'
import { IWebSocket } from './socket'
import { LSP_HANDSHAKE_HELLO } from '..'

export class WebSocketMessageWriter extends AbstractMessageWriter {
	protected errorCount = 0

	constructor(protected readonly socket: IWebSocket) {
		super()
	}

	write(msg: Message): void {
		try {
			const content = JSON.stringify(msg)
			this.socket.send(LSP_HANDSHAKE_HELLO + content)
		} catch (e) {
			this.errorCount++
			this.fireError(e, msg, this.errorCount)
		}
	}
}
