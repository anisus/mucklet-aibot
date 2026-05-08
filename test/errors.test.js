import assert from 'node:assert/strict';
import test from 'node:test';

import { errToString } from '../src/errors.js';

test("errToString formats res error parameters", () => {
	assert.equal(errToString({
		message: "invalid token: {token}",
		data: { token: 'bot.123' },
		code: 'auth.invalid',
	}), "invalid token: bot.123");
});

test("errToString handles primitive errors", () => {
	assert.equal(errToString("missing bot token"), "missing bot token");
	assert.equal(errToString(404), '404');
});
