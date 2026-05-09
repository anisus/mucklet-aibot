import assert from 'node:assert/strict';
import test from 'node:test';

import BotWrapper from '../src/classes/BotWrapper.js';

test("BotWrapper controls and wakes an uncontrolled bot", async () => {
	const calls = [];
	const char = createChar(calls, { state: 'asleep' });
	const bot = createBot(calls, {
		char,
		controlled: null,
		controlChar: char,
	});
	const wrapper = new BotWrapper(bot);

	try {
		const woke = await wrapper.wakeup();

		assert.equal(woke, true);
		assert.deepEqual(calls, [
			[ 'bot.on', 'unsubscribe' ],
			[ 'bot.on', 'change' ],
			[ 'bot.call', 'controlChar', undefined ],
			[ 'char.call', 'wakeup', undefined ],
		]);
	} finally {
		wrapper.dispose();
	}
});

test("BotWrapper skips wakeup when the controlled character is awake", async () => {
	const calls = [];
	const char = createChar(calls, { state: 'awake' });
	const bot = createBot(calls, {
		char,
		controlled: char,
	});
	const wrapper = new BotWrapper(bot);

	try {
		const woke = await wrapper.wakeup();

		assert.equal(woke, false);
		assert.deepEqual(calls, [
			[ 'bot.on', 'unsubscribe' ],
			[ 'bot.on', 'change' ],
			[ 'char.call', 'ping', undefined ],
		]);
	} finally {
		wrapper.dispose();
	}
});

test("BotWrapper says a message when the controlled character is awake", async () => {
	const calls = [];
	const char = createChar(calls, { state: 'awake' });
	const bot = createBot(calls, {
		char,
		controlled: char,
	});
	const wrapper = new BotWrapper(bot);

	try {
		await wrapper.say("Hello, world");

		assert.deepEqual(calls, [
			[ 'bot.on', 'unsubscribe' ],
			[ 'bot.on', 'change' ],
			[ 'char.call', 'ping', undefined ],
			[ 'char.call', 'say', { msg: "Hello, world" }],
		]);
	} finally {
		wrapper.dispose();
	}
});

test("BotWrapper rejects say when the bot is not awake", async () => {
	const calls = [];
	const char = createChar(calls, { state: 'asleep' });
	const bot = createBot(calls, {
		char,
		controlled: char,
	});
	const wrapper = new BotWrapper(bot);

	try {
		await assert.rejects(
			() => wrapper.say("Hello, world"),
			err => err.code == 'bot.notAwake' && err.message == "Bot is not awake",
		);
	} finally {
		wrapper.dispose();
	}
});

test("BotWrapper exposes bot names and cleans up listeners", () => {
	const calls = [];
	const char = createChar(calls, {
		name: ' Ada ',
		surname: 'Lovelace',
		state: 'awake',
	});
	const bot = createBot(calls, {
		char,
		controlled: char,
	});
	const wrapper = new BotWrapper(bot);

	assert.equal(wrapper.getChar(), char);
	assert.equal(wrapper.getControlledChar(), char);
	assert.equal(wrapper.getName(), 'Ada');
	assert.equal(wrapper.getFullName(), 'Ada  Lovelace');

	wrapper.dispose();

	assert.deepEqual(calls, [
		[ 'bot.on', 'unsubscribe' ],
		[ 'bot.on', 'change' ],
		[ 'char.call', 'ping', undefined ],
		[ 'bot.off', 'unsubscribe' ],
		[ 'bot.off', 'change' ],
	]);
});

function createBot(calls, options = {}) {
	return {
		char: options.char || null,
		controlled: options.controlled || null,
		call(method, params) {
			calls.push([ 'bot.call', method, params ]);
			if (method == 'controlChar') {
				return Promise.resolve(options.controlChar);
			}
			return Promise.resolve();
		},
		on(event) {
			calls.push([ 'bot.on', event ]);
		},
		off(event) {
			calls.push([ 'bot.off', event ]);
		},
	};
}

function createChar(calls, options = {}) {
	return {
		name: options.name || 'Ada',
		surname: options.surname || 'Lovelace',
		state: options.state || 'awake',
		call(method, params) {
			calls.push([ 'char.call', method, params ]);
			return Promise.resolve();
		},
	};
}
