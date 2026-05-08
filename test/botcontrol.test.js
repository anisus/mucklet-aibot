import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultHelloMessage, sayHello, wakeupBot } from '../src/botcontrol.js';

test("wakeupBot controls and wakes an uncontrolled bot", async () => {
	const calls = [];
	const char = {
		state: 'asleep',
		call(method, params) {
			calls.push([ method, params ]);
			return Promise.resolve();
		},
	};
	const bot = {
		controlled: null,
		call(method) {
			calls.push([ method ]);
			return Promise.resolve(char);
		},
	};

	const result = await wakeupBot(bot);

	assert.equal(result.char, char);
	assert.equal(result.woke, true);
	assert.deepEqual(calls, [
		[ 'controlChar' ],
		[ 'wakeup', { hidden: false }],
	]);
});

test("wakeupBot skips wakeup when the controlled character is awake", async () => {
	const calls = [];
	const char = {
		state: 'awake',
		call(method, params) {
			calls.push([ method, params ]);
			return Promise.resolve();
		},
	};
	const bot = {
		controlled: char,
		call(method) {
			calls.push([ method ]);
			return Promise.resolve(char);
		},
	};

	const result = await wakeupBot(bot);

	assert.equal(result.char, char);
	assert.equal(result.woke, false);
	assert.deepEqual(calls, []);
});

test("sayHello sends the default greeting with say", async () => {
	const calls = [];
	const char = {
		call(method, params) {
			calls.push([ method, params ]);
			return Promise.resolve();
		},
	};

	await sayHello(char);

	assert.deepEqual(calls, [
		[ 'say', { msg: defaultHelloMessage }],
	]);
});
