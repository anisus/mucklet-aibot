#!/usr/bin/env node

import { parseCli, printHelp } from './src/cli.js';
import { loadConfig } from './src/config.js';
import { createBotClient } from './src/client.js';
import { errToString, printError } from './src/errors.js';
import { getToken } from './src/token.js';

async function main(args) {
	const cli = parseCli(args);
	if (cli.help) {
		printHelp();
		return;
	}

	const cfg = await loadConfig(cli.config || 'mucklet.config.js');
	const apiUrl = cli.apiurl || cfg.realm?.apiUrl || '';
	const token = getToken(cli.token, cli.tokenfile);

	if (!token) {
		throw "missing bot token";
	}
	if (!apiUrl) {
		throw "missing realm api url";
	}

	console.log("Connecting to " + apiUrl + " ...");

	const client = createBotClient(apiUrl, token);
	try {
		const bot = await client.getBot();
		const charName = bot?.char?.name || bot?.controlled?.name || "unknown character";
		const botId = bot?.id ? " #" + bot.id : "";
		console.log("Authenticated bot" + botId + " as " + charName + ".");
	} finally {
		client.disconnect();
	}
}

main(process.argv.slice(2)).catch(err => {
	printError(errToString(err));
});
