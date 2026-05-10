import BotWrapper from './BotWrapper.js';

class BotController {

	/**
	 * Creates a BotWrapper instance.
	 * @param {BotModel} bot Bot model.
	 * @param {BotWrapperOptions} [opts] Optional parameters.
	 */
	constructor(bot, opts = {}) {
		this.logger = opts.logger || console;
		this.opts = opts;
		this.bot = new BotWrapper(bot, { ...opts,
			onOut: this._onOut.bind(this),
		});
		this.started = false;
		this.stopPromise = null;
		this.stopPromiseResolve = null;
	}

	/**
	 * Starts controlling the bot, waking it up, listening to events, and acting
	 * on them.
	 */
	async start() {
		if (this.started) {
			return;
		}
		this.started = true;
		const woke = await this.bot.wakeup();
		this.logger.log?.(woke
			? this.bot.getName() + " wakes up."
			: this.bot.getName() + " is already awake.");

		const sayMsg = "Hello, world";
		await this.bot.say(sayMsg);
		this.logger.log?.(`${this.bot.getName()} says ,"${sayMsg}"`);
	}

	/**
	 * Stops controlling the bot.
	 */
	async stop() {
		if (!this.started) {
			return;
		}
		try {
			await this.bot.release(this.opts?.sleepMessage);
		} finally {
			this.started = false;
			this.stopPromiseResolve?.();
			this.stopPromise = null;
			this.stopPromiseResolve = null;
		}
	}

	async waitForStop() {
		// Resolve directly if not started
		if (!this.started) {
			return Promise.resolve();
		}
		this.stopPromise = this.stopPromise || new Promise((resolve) => {
			this.stopPromiseResolve = resolve;
		});
		await this.stopPromise;
	}

	/**
	 * Callback handling out events, the main output stream for room events
	 * @param {any} ev Event object.
	 */
	_onOut(ev) {
		this.logger?.log("CtrlEvent: ", JSON.stringify(ev));
		if (ev.msg == "sleep") {
			this.stop();
		}
	}

	/**
	 * Disposes the class and removes and listener. Behavior is undefined when
	 * calling any method after calling dispose.
	 */
	dispose() {
		this.bot.dispose();
	}
}

export default BotController;
