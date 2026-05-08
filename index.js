#!/usr/bin/env node

import { parseCli, printHelp } from './src/cli.js';
import { loadConfig } from './src/config.js';
import { createBotClient } from './src/client.js';
import { defaultHelloMessage, sayHello, startKeepAwake, wakeupBot } from './src/botcontrol.js';
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
	let stopKeepAwake = null;
	try {
		const bot = await client.getBot();
		const charName = bot?.char?.name || bot?.controlled?.name || "unknown character";
		const botId = bot?.id ? " #" + bot.id : "";
		console.log("Authenticated bot" + botId + " as " + charName + ".");

		const { char, woke } = await wakeupBot(bot);
		const controlledName = formatCharName(char);
		console.log(woke
			? "Woke up " + controlledName + "."
			: controlledName + " is already awake.");

		await sayHello(char, defaultHelloMessage);
		console.log(controlledName + " said: " + defaultHelloMessage);

		stopKeepAwake = startKeepAwake(char, {
			onError: err => {
				console.error("Error pinging " + controlledName + ": " + errToString(err));
			},
		});
		console.log("Keeping " + controlledName + " awake. Press Ctrl+C to stop.");

		await waitForShutdown();
	} finally {
		if (stopKeepAwake) {
			stopKeepAwake();
		}
		client.disconnect();
	}
}

function formatCharName(char) {
	return [ char?.name, char?.surname ].filter(Boolean).join(' ') || "controlled character";
}

function waitForShutdown() {
	return new Promise(resolve => {
		process.once('SIGINT', resolve);
		process.once('SIGTERM', resolve);
	});
}

main(process.argv.slice(2)).catch(err => {
	printError(errToString(err));
});
