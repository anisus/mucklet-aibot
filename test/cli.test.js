import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCli } from '../src/cli.js';

test("parseCli parses public option names", () => {
	assert.deepEqual(parseCli([
		'--apiurl=wss://example.test',
		'--tokenfile=token.txt',
		'--openaikeyfile=openai-key.txt',
		'--charinstructions=Stay quiet.',
	]), {
		_: [],
		apiurl: 'wss://example.test',
		charinstructions: 'Stay quiet.',
		openaikeyfile: 'openai-key.txt',
		tokenfile: 'token.txt',
	});
});
