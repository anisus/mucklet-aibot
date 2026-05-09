import Err from './Err.js';
import listenResource from '../utils/listenResource.js';

export const defaultPingDuration = 1000 * 60 * 45; // 45 minutes between successful pings
export const defaultPingRetry = 1000 * 60 * 1; // 1 minute between retries

/**
 * @typedef {object} BotWrapperOptions
 * @property {number} [pingDuration] Ping duration in milliseconds.
 * @property {number} [pingRetry] Ping retry duration in milliseconds after a failed ping.
 * @property {(...msgs: unknown[]) => void} [onError] Error log function.
 * @property {(...msgs: unknown[]) => void} [onInfo] Info log function.
 */

/**
 * @typedef {object} WakeupOptions
 * @property {boolean} [hidden] Hides the character in the awake list.
 */

/**
 * Gets the controlled character or throws if the bot is not controlled.
 * @param {BotModel | null} bot Bot model.
 * @returns {CtrlModel} Controlled character model.
 */

function getControlledOrThrow(bot) {
	if (!bot?.controlled) {
		throw new Err('bot.notControlled', "Bot is not controlled");
	}
	return bot.controlled;
}

/**
 * Gets the controlled character or throws if the bot is not awake.
 * @param {BotModel | null} bot Bot model.
 * @returns {CtrlModel} Controlled character model.
 */
function assertAwake(bot) {
	const ctrl = getControlledOrThrow(bot);
	if (ctrl.state != 'awake') {
		throw new Err('bot.notAwake', "Bot is not awake");
	}
	return ctrl;
}

class BotWrapper {

	/**
	 * Creates a BotWrapper instance.
	 * @param {BotModel} bot Bot model.
	 * @param {BotWrapperOptions} [opts] Optional parameters.
	 */
	constructor(bot, opts = {}) {
		this.bot = bot;

		this.pingDuration = opts.pingDuration || defaultPingDuration;
		this.pingRetry = opts.pingRetry || defaultPingRetry;
		this.pingTimer = null;
		this.onError = opts.onError;
		this.onInfo = opts.onInfo;

		// Bind callbacks
		this._onBotUnsubscribe = this._onBotUnsubscribe.bind(this);
		this._onBotChange = this._onBotChange.bind(this);

		this._listenBot(true);
		this._startPing();
	}

	/**
	 * Gets the character model.
	 * @returns {CtrlModel | null} Bot character.
	 */
	getChar() {
		return this.bot?.char || null;
	}


	/**
	 * Gets the controlled character model.
	 * @returns {CtrlModel | null} Controlled bot character or null if not controlled.
	 */
	getCtrl() {
		return this.bot?.controlled || null;
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
	 * @param {WakeupOptions} [options] Optional parameters.
	 * @returns {Promise<boolean>} Promise to the result. True if character woke
	 * up, or false if already awake.
	 */
	async wakeup(options = {}) {
		const bot = this._requireBot();
		let char = this.getCtrl();
		if (!char) {
			char = await bot.call('controlChar');
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
		const ctrl = assertAwake(this.bot);
		await ctrl.call('say', { msg });
	}

	dispose() {
		this._listenBot(false);
		this._stopPing();
		this.bot = null;
	}

	/**
	 * Gets the active bot model.
	 * @returns {BotModel} Bot model.
	 * @throws {Err} Throws if the wrapper has been disposed.
	 */
	_requireBot() {
		if (!this.bot) {
			throw new Err('bot.disposed', "Bot wrapper is disposed");
		}
		return this.bot;
	}

	/**
	 * Adds or removes bot listeners.
	 * @param {boolean} on Adds listeners when true; removes them when false.
	 */
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

	/**
	 * Schedules the next ping if no ping is active.
	 */
	_startPing() {
		if (!this.pingTimer) {
			this._ping();
		}
	}

	/**
	 * Stops the active ping timer.
	 */
	_stopPing() {
		if (this.pingTimer && this.pingTimer !== true) {
			clearTimeout(this.pingTimer);
		}
		this.pingTimer = null;
	}

	/**
	 * Pings the controlled character and schedules the next ping.
	 */
	_ping() {
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
