import Err from './Err.js';
import listenResource from '../utils/listenResource.js';

export const defaultPingDuration = 1000 * 60 * 45; // 45 minutes between successful pings
export const defaultPingRetry = 1000 * 60 * 1; // 1 minute between retries

function assertControlled(bot) {
	if (!bot.controlled) {
		throw new Err('bot.notControlled', "Bot is not controlled");
	}
}

function assertAwake(bot) {
	assertControlled(bot);
	if (bot.controlled.state != 'awake') {
		throw new Err('bot.notAwake', "Bot is not awake");
	}
}

class BotWrapper {

	/**
	 * Creates a BotWrapper instance.
	 * @param {Model} bot Bot model.
	 * @param {object} [opts] Optional parameters.
	 * @param {object} [opts.pingDuration] Ping duration is milliseconds. Defaults to 45 min.
	 * @param {object} [opts.pingRetry] Ping retry duration is milliseconds on failed ping. Defaults to 1 min.
	 * @param {(...msgs: any[]) => void} [opts.onError] Error log function.
	 * @param {(...msgs: any[]) => void} [opts.onInfo] Info log function.
	 */
	constructor(bot, opts = {}) {
		this.bot = bot;

		this.pingDuration = opts?.pingDuration || defaultPingDuration;
		this.pingRetry = opts?.pingRetry || defaultPingRetry;
		this.pingTimer = null;
		this.onError = opts?.onError;
		this.onInfo = opts?.onInfo;

		// Bind callbacks
		this._onBotUnsubscribe = this._onBotUnsubscribe.bind(this);
		this._onBotChange = this._onBotChange.bind(this);

		this._listenBot(true);
		this._startPing();
	}

	/**
	 * Gets the character model.
	 * @returns {Model} Bot character.
	 */
	getChar() {
		return this.bot.char || null;
	}


	/**
	 * Gets the controlled character model.
	 * @returns {Model | null} Controlled bot character or null if not controlled.
	 */
	getCtrl() {
		return this.bot.controlled || null;
	}

	/**
	 * Gets the name of the bot character.
	 * @returns {string} Bot name.
	 */
	getName() {
		const char = this.getChar();
		return char ? char?.name.trim() : "Unknown";
	}

	/**
	 * Gets the full name of the bot character.
	 * @returns {string} Bot name.
	 */
	getFullName() {
		const char = this.getChar();
		return char ? (char?.name + ' ' + char?.surname).trim() : "Unknown character";
	}

	/**
	 * Controls and wakes up the character if needed.
	 * @param {object} [options] Optional parameters
	 * @param {boolean} [options.hidden] Flag to hide the character in the awake list.
	 * @returns {Promise<boolean>} Promise to the result. True if character woke
	 * up, or false if already awake.
	 */
	async wakeup(options = {}) {
		let char = this.getCtrl();
		if (!char) {
			char = await this.bot.call('controlChar');
		}

		const woke = char.state != 'awake';
		if (woke) {
			await char.call('wakeup', options.hidden ? { hidden: true } : undefined);
		}

		return woke;
	}

	/**
	 * Says a message to the room.
	 * @throws {Err} Throws an error if character is not awake.
	 * @param {string} msg Message to say.
	 */
	async say(msg) {
		assertAwake(this.bot);
		await this.getCtrl().call('say', { msg });
	}

	dispose() {
		this._listenBot(false);
		this._stopPing();
		this.bot = null;
	}

	_listenBot(on) {
		listenResource(this.bot, on, this._onBotUnsubscribe, 'unsubscribe');
		listenResource(this.bot, on, this._onBotChange);
	}

	_onBotUnsubscribe() {
		// Remove bot model subscription
		this.dispose();
	}

	_onBotChange() {
		if (this.getCtrl()) {
			this._startPing();
		} else {
			this._stopPing();
		}
	}

	_startPing() {
		if (!this.pingTimer) {
			this._ping();
		}
	}

	_stopPing() {
		clearTimeout(this.pingTimer);
		this.pingTimer = null;
	}

	_ping(since = 0) {
		let ctrl = this.getCtrl();
		if (!ctrl) {
			this._stopPing();
			return;
		}
		this.pingTimer = true;

		ctrl.call('ping').then(
			() => this.pingDuration,
			(err) => {
				this.onError?.("error pinging: ", err);
				return this.pingRetry;
			},
		).then(d => {
			if (this.pingTimer === true) {
				let t = setTimeout(() => {
					if (this.pingTimer === t) {
						this._ping();
					}
				}, d);
				this.pingTimer = t;
			}
		});
	}
}

export default BotWrapper;
