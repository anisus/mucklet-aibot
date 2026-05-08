import assert from 'node:assert/strict';
import test from 'node:test';

import { runBot } from '../src/main.js';

test("runBot connects, wakes, greets, and disconnects", async () => {
	const calls = [];
	const logs = [];
	let disconnected = false;
	const char = {
		name: 'Ada',
		surname: 'Lovelace',
		state: 'asleep',
		call(method, params) {
			calls.push([ method, params ]);
			if (method == 'wakeup') {
				this.state = 'awake';
			}
			return Promise.resolve();
		},
	};
	const botModel = {
		char,
		controlled: char,
	};

	await runBot({
		apiUrl: 'ws://example.test',
		token: 'bot-token',
		createClient(apiUrl, token) {
			assert.equal(apiUrl, 'ws://example.test');
			assert.equal(token, 'bot-token');
			return {
				getBot() {
					return Promise.resolve(botModel);
				},
				disconnect() {
					disconnected = true;
				},
			};
		},
		waitForShutdown() {
			return Promise.resolve();
		},
		log(msg) {
			logs.push(msg);
		},
	});

	assert.equal(disconnected, true);
	assert.deepEqual(calls, [
		[ 'ping', undefined ],
		[ 'wakeup', undefined ],
		[ 'say', { msg: "Hello, world" }],
	]);
	assert.deepEqual(logs, [
		"Connecting to ws://example.test ...",
		"Authenticated bot Ada Lovelace.",
		"Ada wakes up.",
		"Ada says ,\"Hello, world\"",
		"Press Ctrl+C to stop.",
	]);
});
