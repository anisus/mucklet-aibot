import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCli } from '../src/cli.js';

test("parseCli parses public option names", () => {
	assert.deepEqual(parseCli([
		'--apiurl=wss://example.test',
		'--tokenfile=token.txt',
	]), {
		_: [],
		apiurl: 'wss://example.test',
		tokenfile: 'token.txt',
	});
});
