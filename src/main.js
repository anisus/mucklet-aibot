import { parseCli, printHelp } from './cli.js';
import { loadConfig } from './utils/config.js';
import { createBotClient } from './classes/BotClient.js';
import BotController from './classes/BotController.js';
import { errToString, printError } from './utils/errors.js';
import { getToken } from './utils/token.js';
import ShutdownListener from './classes/ShutdownListener.js';

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

	if (!token) {
		throw "missing bot token";
	}
	if (!apiUrl) {
		throw "missing realm api url";
	}

	await runBot({
		apiUrl,
		token,
		createClient: options.createClient,
		logger: options.logger,
		waitForShutdown: options.waitForShutdown,
	});
}

export async function runBot(options = {}) {
	const apiUrl = options.apiUrl;
	const token = options.token;
	const createClient = options.createClient || createBotClient;
	const waitForShutdown = options.waitForShutdown;
	const logger = options.logger || console;

	logger.log?.("Connecting to " + apiUrl + " ...");

	const client = createClient(apiUrl, token);
	const botModel = await client.getBot();
	logger.log?.("Authenticated bot " + (botModel.char?.name + ' ' + botModel.char?.surname).trim() + ".");
	const bot = new BotController(botModel, { logger });
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
			client.disconnect();
		}
	}
}
