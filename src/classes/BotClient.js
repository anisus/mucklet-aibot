import { createRequire } from 'module';
import { errToString } from '../utils/errors.js';

const require = createRequire(import.meta.url);
const resclient = require('resclient');
const ResClient = resclient.default;

function destroyNativeWebSocketConnection(ws) {
	if (!ws || ws.readyState == ws.CLOSED) {
		return;
	}

	for (const sym of Object.getOwnPropertySymbols(ws)) {
		const controller = ws[sym];
		if (typeof controller?.connection?.destroy == 'function') {
			controller.connection.destroy();
			return;
		}
	}
}

class BotClient extends ResClient {
	constructor(apiUrl, token) {
		super(() => new globalThis.WebSocket(apiUrl));

		this.authErr = null;
		this.setOnConnect(c => c.authenticate('auth', 'authenticate', {
			token,
		}).catch(err => {
			this.authErr = err;
		}));
	}

	disconnect() {
		const ws = this.ws;
		super.disconnect();
		destroyNativeWebSocketConnection(ws);
	}

	/**
	 * Gets a m
	 *
	 * @param {object} [opts] Optional parameters.
	 * @param {object} [opts.pingDuration] Ping duration is milliseconds. Defaults to 45 min.
	 * @param {object} [opts.defaultPingRetry] Ping retry duration is milliseconds on failed ping. Defaults to 1 min.
	 * @returns {Model} Bot model
	 */
	async getBot() {
		try {
			await this.connect();
			return await this.call('core', 'getBot');
		} catch (err) {
			if (err?.code == 'system.connectionError') {
				throw "failed to connect to realm api";
			}
			if (err?.code == 'system.notFound') {
				throw "api service unavailable";
			}
			throw errToString(this.authErr || err);
		}
	}
}

export default BotClient;

export function createBotClient(apiUrl, token) {
	return new BotClient(apiUrl, token);
}
