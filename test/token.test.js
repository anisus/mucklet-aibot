import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getToken } from '../src/token.js';

test("getToken prefers cli token over environment token", () => {
	const previous = process.env.MUCKLET_BOT_TOKEN;
	const previousFile = process.env.MUCKLET_BOT_TOKEN_FILE;
	process.env.MUCKLET_BOT_TOKEN = 'env-token';
	delete process.env.MUCKLET_BOT_TOKEN_FILE;

	try {
		assert.equal(getToken('cli-token', ''), 'cli-token');
	} finally {
		restoreEnv('MUCKLET_BOT_TOKEN', previous);
		restoreEnv('MUCKLET_BOT_TOKEN_FILE', previousFile);
	}
});

test("getToken reads cli token before cli token file", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const tokenFile = path.join(dir, 'token.txt');
	fs.writeFileSync(tokenFile, 'file-token\n', 'utf8');

	try {
		assert.equal(getToken('cli-token', tokenFile), 'cli-token');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("getToken reads cli token file after cli token", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const tokenFile = path.join(dir, 'token.txt');
	fs.writeFileSync(tokenFile, 'file-token\n', 'utf8');

	try {
		assert.equal(getToken('', tokenFile), 'file-token');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("getToken reads bot-specific environment token", () => {
	const previous = process.env.MUCKLET_BOT_TOKEN;
	const previousFile = process.env.MUCKLET_BOT_TOKEN_FILE;
	process.env.MUCKLET_BOT_TOKEN = 'env-token';
	delete process.env.MUCKLET_BOT_TOKEN_FILE;

	try {
		assert.equal(getToken('', ''), 'env-token');
	} finally {
		restoreEnv('MUCKLET_BOT_TOKEN', previous);
		restoreEnv('MUCKLET_BOT_TOKEN_FILE', previousFile);
	}
});

function restoreEnv(name, value) {
	if (typeof value == 'undefined') {
		delete process.env[name];
	} else {
		process.env[name] = value;
	}
}
