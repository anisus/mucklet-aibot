import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getAdmins, getCharacterInstructions, getMemoryDir } from '../src/main.js';

test("getCharacterInstructions prefers CLI text over files and config", () => {
	assert.equal(
		getCharacterInstructions(" CLI instructions ", "missing.txt", "Config instructions", "missing-config.txt"),
		"CLI instructions",
	);
});

test("getCharacterInstructions reads CLI file before config text", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const instructionsFile = path.join(dir, 'character.txt');
	fs.writeFileSync(instructionsFile, " File instructions \n", 'utf8');

	assert.equal(
		getCharacterInstructions('', instructionsFile, "Config instructions", ''),
		"File instructions",
	);
});

test("getCharacterInstructions reads config text before config file", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const instructionsFile = path.join(dir, 'character.txt');
	fs.writeFileSync(instructionsFile, " Config file instructions \n", 'utf8');

	assert.equal(
		getCharacterInstructions('', '', " Config instructions ", instructionsFile),
		"Config instructions",
	);
});

test("getCharacterInstructions reads config file as fallback", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
	const instructionsFile = path.join(dir, 'character.txt');
	fs.writeFileSync(instructionsFile, " Config file instructions \n", 'utf8');

	assert.equal(
		getCharacterInstructions('', '', '', instructionsFile),
		"Config file instructions",
	);
});

test("getAdmins merges config and CLI admins", () => {
	assert.deepEqual(
		getAdmins([ ' cli-admin ', 'shared-admin' ], [ 'config-admin', 'shared-admin', '' ]),
		[ 'config-admin', 'shared-admin', 'cli-admin' ],
	);
});

test("getMemoryDir prefers CLI over config over default", () => {
	assert.equal(getMemoryDir('cli-memory', 'config-memory'), 'cli-memory');
	assert.equal(getMemoryDir('', 'config-memory'), 'config-memory');
	assert.equal(getMemoryDir('', ''), 'memory');
});
