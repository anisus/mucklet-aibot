import { createRequire } from 'module';

import { errToString } from './errors.js';

const require = createRequire(import.meta.url);
const resclient = require('resclient');
const WebSocket = require('isomorphic-ws');
const ResClient = resclient.default;

class BotClient extends ResClient {
	constructor(apiUrl, token) {
		super(() => new WebSocket(apiUrl));

		this.authErr = null;
		this.setOnConnect(c => c.authenticate('auth', 'authenticateBot', {
			token,
		}).catch(err => {
			this.authErr = err;
		}));
	}

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

export function createBotClient(apiUrl, token) {
	return new BotClient(apiUrl, token);
}
