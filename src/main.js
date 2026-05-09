import { parseCli, printHelp } from './cli.js';
import { loadConfig } from './utils/config.js';
import { createBotClient } from './classes/BotClient.js';
import BotWrapper from './classes/BotWrapper.js';
import { errToString, printError } from './utils/errors.js';
import { getToken } from './utils/token.js';

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
		error: options.error,
		log: options.log,
		waitForShutdown: options.waitForShutdown,
	});
}

export async function runBot(options = {}) {
	const apiUrl = options.apiUrl;
	const token = options.token;
	const createClient = options.createClient || createBotClient;
	const waitForShutdown = options.waitForShutdown || waitForProcessShutdown;
	const log = options.log || console.log;
	const error = options.error || console.error;

	log("Connecting to " + apiUrl + " ...");


	const client = createClient(apiUrl, token);
	const botModel = await client.getBot();
	const bot = new BotWrapper(botModel, {
		onError: error,
		onInfo: log,
	});
	log("Authenticated bot " + bot.getFullName() + ".");

	try {
		const woke = await bot.wakeup();
		log(woke
			? bot.getName() + " wakes up."
			: bot.getName() + " is already awake.");

		const sayMsg = "Hello, world";
		await bot.say(sayMsg);
		log(`${bot.getName()} says ,"${sayMsg}"`);

		log("Press Ctrl+C to stop.");
		await waitForShutdown();
	} finally {
		bot.dispose();
		client.disconnect();
	}
}

export function waitForProcessShutdown() {
	return new Promise(resolve => {
		process.once('SIGINT', resolve);
		process.once('SIGTERM', resolve);
	});
}
