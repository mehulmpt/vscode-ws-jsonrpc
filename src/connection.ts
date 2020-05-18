/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { MessageConnection, Logger } from 'vscode-jsonrpc'
import { createWebSocketConnection, IWebSocket } from './socket'
import { ConsoleLogger } from './logger'

export function listen(options: {
	webSocket: WebSocket
	logger?: Logger
	onConnection: (connection: MessageConnection) => void
}) {
	const { webSocket, onConnection } = options
	const logger = options.logger || new ConsoleLogger()

	const socket = toSocket(webSocket)

	if (webSocket.readyState === WebSocket.OPEN) {
		const connection = createWebSocketConnection(socket, logger)
		onConnection(connection)
	} else {
		webSocket.addEventListener('open', () => {
			const connection = createWebSocketConnection(socket, logger)
			onConnection(connection)
		})
	}
}

export function toSocket(webSocket: WebSocket): IWebSocket {
	return {
		send: (content: Buffer) => {
			const t = new TextDecoder()
			const text = t.decode(new Uint8Array(content))

			if (
				text.length < 200 &&
				(text.includes('data did not match any variant of untagged enum Documentation') ||
					text.includes('"method":"exit"'))
			) {
				console.warn('Prevented LSP crash.')
				return
			}

			console.log('>>> TO LSP = ' + text)
			webSocket.send(content)
		},
		onMessage: (cb) => webSocket.addEventListener('message', (event) => cb(event.data)),
		onError: (cb) =>
			webSocket.addEventListener('error', (event) => {
				if ('message' in event) {
					cb((event as any).message)
				}
			}),
		onClose: (cb) =>
			webSocket.addEventListener('close', (event) => cb(event.code, event.reason)),
		dispose: () => console.warn('Trying to dispose websocket connection from WS JSONRPC')
	}
}
