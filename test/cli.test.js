import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCli } from '../src/cli.js';

test("parseCli parses public option names", () => {
	assert.deepEqual(parseCli([
		'--apiurl=wss://example.test',
		'--tokenfile=token.txt',
		'--openaikeyfile=openai-key.txt',
		'--charinstructions=Stay quiet.',
		'--charinstructionsfile=character.txt',
		'--admin=char-one',
		'--admin=char-two',
	]), {
		_: [],
		admin: [ 'char-one', 'char-two' ],
		apiurl: 'wss://example.test',
		charinstructions: 'Stay quiet.',
		charinstructionsfile: 'character.txt',
		openaikeyfile: 'openai-key.txt',
		tokenfile: 'token.txt',
	});
});
