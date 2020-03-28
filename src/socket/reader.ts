/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { DataCallback, AbstractMessageReader } from 'vscode-jsonrpc/lib/messageReader'
import { IWebSocket } from './socket'

function sliceAnyHeaders(string: string) {
	// ! TODO: Fix this "hacky" slice
	const splitter = string.split('\r\n\r\n')

	if (splitter.length > 1) {
		// content headers might be present
		return splitter[1].trim()
	}
	return splitter[0].trim()
}

export class WebSocketMessageReader extends AbstractMessageReader {
	protected state: 'initial' | 'listening' | 'closed' = 'initial'
	protected callback: DataCallback | undefined
	protected readonly events: { message?: any; error?: any }[] = []

	pendingTCPChunks: string[] = []

	constructor(protected readonly socket: IWebSocket) {
		super()
		this.socket.onMessage((message: ArrayBuffer | string) => {
			const HANDSHAKE_SUCCESS = typeof message !== 'string'

			console.warn('SUCCESSFUL HANDSHAKE? ', HANDSHAKE_SUCCESS)

			debugger

			if (HANDSHAKE_SUCCESS) {
				// message for this reader only

				let utf8decoder = new TextDecoder()
				let info = sliceAnyHeaders(
					utf8decoder.decode(new Uint8Array(message as ArrayBuffer))
				)

				// debugger
				console.warn('Chunk value: ', info)
				try {
					// docker container could send data in chunks
					info = this.pendingTCPChunks.join('') + info

					JSON.parse(info)
					// success!
					console.log('Success! Clearing chunks')
					this.pendingTCPChunks = []
				} catch (error) {
					// still an error
					console.warn('Adding to pending chunk => ', info, error)
					this.pendingTCPChunks.push(info)
					return
				}

				this.readMessage(info)
			}
		})
		this.socket.onError(error => this.fireError(error))
		this.socket.onClose((code, reason) => {
			if (code !== 1000) {
				const error: Error = {
					name: '' + code,
					message: `Error during socket reconnect: code = ${code}, reason = ${reason}`
				}
				this.fireError(error)
			}
			this.fireClose()
		})
	}

	listen(callback: DataCallback): void {
		if (this.state === 'initial') {
			this.state = 'listening'
			this.callback = callback
			while (this.events.length !== 0) {
				const event = this.events.pop()!
				if (event.message) {
					this.readMessage(event.message)
				} else if (event.error) {
					this.fireError(event.error)
				} else {
					this.fireClose()
				}
			}
		}
	}

	protected readMessage(message: any): void {
		if (this.state === 'initial') {
			this.events.splice(0, 0, { message })
		} else if (this.state === 'listening') {
			const data = JSON.parse(message)
			this.callback!(data)
		}
	}

	protected fireError(error: any): void {
		if (this.state === 'initial') {
			this.events.splice(0, 0, { error })
		} else if (this.state === 'listening') {
			super.fireError(error)
		}
	}

	protected fireClose(): void {
		if (this.state === 'initial') {
			this.events.splice(0, 0, {})
		} else if (this.state === 'listening') {
			super.fireClose()
		}
		this.state = 'closed'
	}
}
