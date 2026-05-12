import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getOpenAIKey, getToken } from '../src/utils/token.js';

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

test("getOpenAIKey prefers cli key over environment key", () => {
	const previous = process.env.OPENAI_API_KEY;
	const previousFile = process.env.OPENAI_API_KEY_FILE;
	process.env.OPENAI_API_KEY = 'env-key';
	delete process.env.OPENAI_API_KEY_FILE;

	try {
		assert.equal(getOpenAIKey('cli-key', ''), 'cli-key');
	} finally {
		restoreEnv('OPENAI_API_KEY', previous);
		restoreEnv('OPENAI_API_KEY_FILE', previousFile);
	}
});

test("getOpenAIKey reads cli key before cli key file", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const keyFile = path.join(dir, 'openai-key.txt');
	fs.writeFileSync(keyFile, 'file-key\n', 'utf8');

	try {
		assert.equal(getOpenAIKey('cli-key', keyFile), 'cli-key');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("getOpenAIKey reads cli key file after cli key", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const keyFile = path.join(dir, 'openai-key.txt');
	fs.writeFileSync(keyFile, 'file-key\n', 'utf8');

	try {
		assert.equal(getOpenAIKey('', keyFile), 'file-key');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("getOpenAIKey reads environment key file before environment key", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const keyFile = path.join(dir, 'openai-key.txt');
	const previous = process.env.OPENAI_API_KEY;
	const previousFile = process.env.OPENAI_API_KEY_FILE;
	fs.writeFileSync(keyFile, 'file-key\n', 'utf8');
	process.env.OPENAI_API_KEY = 'env-key';
	process.env.OPENAI_API_KEY_FILE = keyFile;

	try {
		assert.equal(getOpenAIKey('', ''), 'file-key');
	} finally {
		restoreEnv('OPENAI_API_KEY', previous);
		restoreEnv('OPENAI_API_KEY_FILE', previousFile);
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("getOpenAIKey reads environment key", () => {
	const previous = process.env.OPENAI_API_KEY;
	const previousFile = process.env.OPENAI_API_KEY_FILE;
	process.env.OPENAI_API_KEY = 'env-key';
	delete process.env.OPENAI_API_KEY_FILE;

	try {
		assert.equal(getOpenAIKey('', ''), 'env-key');
	} finally {
		restoreEnv('OPENAI_API_KEY', previous);
		restoreEnv('OPENAI_API_KEY_FILE', previousFile);
	}
});

function restoreEnv(name, value) {
	if (typeof value == 'undefined') {
		delete process.env[name];
	} else {
		process.env[name] = value;
	}
}
