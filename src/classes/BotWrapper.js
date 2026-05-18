import Err from './Err.js';
import listenResource from '../utils/listenResource.js';

export const defaultPingDuration = 1000 * 60 * 45; // 45 minutes between successful pings
export const defaultPingRetry = 1000 * 60 * 1; // 1 minute between retries

/**
 * @typedef {object} BotWrapperOptions
 * @property {(ev: unknown) => void} [onOut] On out event callback.
 * @property {number} [pingDuration] Ping duration in milliseconds.
 * @property {number} [pingRetry] Ping retry duration in milliseconds after a failed ping.
 * @property {{ log?: (...msgs: unknown[]) => void, error?: (...msgs: unknown[]) => void}} [logger] Logger functions.
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
		this.logger = opts.logger || console;
		this.onOut = opts.onOut;

		// Bind callbacks
		this._onBotUnsubscribe = this._onBotUnsubscribe.bind(this);
		this._onBotChange = this._onBotChange.bind(this);
		this._onCtrlOut = this._onCtrlOut.bind(this);

		this.controlled = null;

		this._listenBot(true);
		this._onBotChange();
		this._startPing();
	}

	/**
	 * Gets the character id.
	 * @returns {string} Bot character ID.
	 */
	getId() {
		return this.bot.char?.id || '';
	}

	/**
	 * Gets the character model.
	 * @returns {CtrlModel | null} Bot character.
	 */
	getChar() {
		return this.bot.char || null;
	}


	/**
	 * Gets the controlled character model.
	 * @returns {CtrlModel | null} Controlled bot character or null if not controlled.
	 */
	getControlledChar() {
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
	 * @param {WakeupOptions} [options] Optional parameters.
	 * @returns {Promise<boolean>} Promise to the result. True if character woke
	 * up, or false if already awake.
	 */
	async wakeup(options = {}) {
		let char = this.getControlledChar();
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
	 * Puts a character to sleep and releases the control of a character.
	 * @param {string} [message] Optional message.
	 * @returns {Promise<void>} Promise to the controlled character being released.
	 */
	async release(message = '') {
		const ctrl = getControlledOrThrow(this);
		await ctrl.call('release', message ? { msg: message } : undefined);
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

	/**
	 * Poses an action to the room.
	 * @throws {Err} Throws an error if character is not awake.
	 * @param {string} msg Message to pose
	 */
	async pose(msg) {
		const ctrl = assertAwake(this.bot);
		await ctrl.call('pose', { msg });
	}

	/**
	 * Addresses one or more characters in the the room.
	 * @throws {Err} Throws an error if character is not awake.
	 * @param {string[]} charIds IDs of characters to address.
	 * @param {object} [opts] Optional parameters.
	 * @param {boolean} [opts.pose] Pose the message instead of saying it. Defaults to false.
	 * @param {boolean} [opts.ooc] Out of character message. Defaults to false.
	 */
	async address(charIds, msg, opts = {}) {
		const ctrl = assertAwake(this.bot);
		await ctrl.call('address', {
			charIds,
			msg,
			pose: opts.pose || undefined,
			ooc: opts.ooc || undefined,
		});
	}

	/**
	 * Looks at a character in the room.
	 * @throws {Err} Throws an error if character is not awake.
	 * @param {string | null} charId ID of character to look at or null to stop looking.
	 */
	async look(charId) {
		const ctrl = assertAwake(this.bot);
		await ctrl.call('look', charId ? { charId } : { charId: ctrl.id });
	}

	/**
	 * Adds or removes bot listeners.
	 * @param {boolean} on Adds listeners when true; removes them when false.
	 */
	_listenBot(on) {
		listenResource(this.bot, on, this._onBotUnsubscribe, 'unsubscribe');
		listenResource(this.bot, on, this._onBotChange);
	}

	/**
	 * Adds or removes bot listeners.
	 * @param {boolean} on Adds listeners when true; removes them when false.
	 */
	_listenCtrl(on) {
		listenResource(this.controlled, on, this._onCtrlOut, 'out');
	}

	_onBotUnsubscribe() {
		// Remove bot model subscription
		this.dispose();
	}

	_onBotChange() {
		let c = this.getControlledChar();
		if (c === this.controlled) return;

		this._listenCtrl(false);
		this.controlled = c;
		this._listenCtrl(true);

		if (c) {
			this._startPing();
		} else {
			this._stopPing();
		}
	}

	_onCtrlOut(ev) {
		this.onOut?.(ev);
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
		let ctrl = this.getControlledChar();
		if (!ctrl) {
			this._stopPing();
			return;
		}
		this.pingTimer = true;

		ctrl.call('ping').then(
			() => this.pingDuration,
			(err) => {
				this.logger.error?.("error pinging: ", err);
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

	dispose() {
		this._listenCtrl(false);
		this._listenBot(false);
		this._stopPing();
		this.controlled = null;
	}
}

export default BotWrapper;
