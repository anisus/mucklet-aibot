import assert from 'node:assert/strict';
import test from 'node:test';

import BotClient from '../src/classes/BotClient.js';

test("BotClient disconnect destroys a native WebSocket connection", () => {
	const controller = Symbol('controller');
	const calls = [];
	const ws = {
		CLOSED: 3,
		readyState: 2,
		close() {
			calls.push('close');
		},
		[controller]: {
			connection: {
				destroy() {
					calls.push('destroy');
				},
			},
		},
	};
	const client = new BotClient('ws://example.test', 'token');

	client.ws = ws;
	client.connected = true;

	client.disconnect();

	assert.deepEqual(calls, [ 'close', 'destroy' ]);
	assert.equal(client.connected, false);
	assert.equal(client.ws, null);
});
