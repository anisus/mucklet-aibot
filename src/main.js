import fs from 'fs';

import { parseCli, printHelp } from './cli.js';
import { loadConfig } from './utils/config.js';
import { createBotClient } from './classes/BotClient.js';
import BotController from './classes/BotController.js';
import { errToString, printError } from './utils/errors.js';
import { getOpenAIKey, getToken } from './utils/token.js';
import ShutdownListener from './classes/ShutdownListener.js';
import BotAddonLook from './classes/BotAddonLook.js';

export async function runCli(args) {
	try {
		await main(args);
	} catch (err) {
		printError(errToString(err));
	}
}

export async function main(args, options = {}) {
	const cli = parseCli(args);
	if (cli.help) {
		printHelp();
		return;
	}

	const cfg = await loadConfig(cli.config || 'mucklet.config.js');
	const apiUrl = cli.apiurl || cfg.realm?.apiUrl || '';
	const token = getToken(cli.token, cli.tokenfile);
	const openaiApiKey = getOpenAIKey(cli.openaikey, cli.openaikeyfile);
	const characterInstructions = getCharacterInstructions(
		cli.charinstructions,
		cli.charinstructionsfile,
		cfg.bot?.characterInstructions,
		cfg.bot?.characterInstructionsFile,
	);

	if (!token) {
		throw "missing bot token";
	}
	if (!openaiApiKey) {
		throw "missing OpenAI API key";
	}
	if (!apiUrl) {
		throw "missing realm api url";
	}

	await runBot({
		apiUrl,
		token,
		openaiApiKey,
		characterInstructions,
		createClient: options.createClient,
		logger: options.logger,
		waitForShutdown: options.waitForShutdown,
	});
}

export async function runBot(options = {}) {
	const apiUrl = options.apiUrl;
	const token = options.token;
	const openaiApiKey = options.openaiApiKey;
	const characterInstructions = options.characterInstructions || '';
	const createClient = options.createClient || createBotClient;
	const waitForShutdown = options.waitForShutdown;
	const logger = options.logger || console;

	if (!openaiApiKey) {
		throw "missing OpenAI API key";
	}

	logger.log?.("Connecting to " + apiUrl + " ...");

	const api = createClient(apiUrl, token);
	const botModel = await api.getBot();
	logger.log?.("Authenticated bot " + (botModel.char?.name + ' ' + botModel.char?.surname).trim() + ".");
	const bot = new BotController(api, botModel, {
		logger,
		openaiApiKey,
		characterInstructions,
		addons: [
			new BotAddonLook({ logger }),
		],
	});
	const shutdown = !waitForShutdown && new ShutdownListener();

	try {
		await bot.start();
		// Wait for either an external shutdown, or if the bot itself stops.
		await Promise.any([
			shutdown.waitForShutdown?.() || waitForShutdown(),
			bot.waitForStop(),
		]);
	} finally {
		logger.log?.("Shutting down.");
		try {
			await bot.stop();
		} finally {
			bot.dispose();
			shutdown?.dispose();
			api.disconnect();
		}
	}
}

export function getCharacterInstructions(
	characterInstructions,
	characterInstructionsFile,
	configCharacterInstructions,
	configCharacterInstructionsFile,
) {
	if (characterInstructions) {
		return characterInstructions.trim();
	}
	if (characterInstructionsFile) {
		return readInstructionsFile(characterInstructionsFile);
	}
	if (configCharacterInstructions) {
		return configCharacterInstructions.trim();
	}
	if (configCharacterInstructionsFile) {
		return readInstructionsFile(configCharacterInstructionsFile);
	}
	return '';
}

function readInstructionsFile(file) {
	return fs.readFileSync(file, 'utf8').trim();
}
