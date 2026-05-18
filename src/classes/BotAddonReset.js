const defaultResetTimeout = 1000 * 60 * 15;

class BotAddonReset {

	constructor(opts = {}) {
		this.resetTimeout = opts.resetTimeout ?? defaultResetTimeout;
		if (!Number.isSafeInteger(this.resetTimeout) || this.resetTimeout <= 0) {
			throw new Error("resetTimeout must be a positive integer");
		}
		this.timer = null;
		this.logger = console;
		this.setTimeout = opts.setTimeout || setTimeout;
		this.clearTimeout = opts.clearTimeout || clearTimeout;
	}

	get name() {
		return 'reset';
	}

	init(context) {
		this.logger = context.logger;
	}

	async onOut(ev, context) {
		if (ev.type == 'address' && ev.char?.id != context.bot.getId()) {
			this._resetTimer(context.controller);
		}

		if (ev.msg == 'reset' && context.admins.includes(ev.char?.id)) {
			await context.controller.reset();
			return false;
		}
	}

	_resetTimer(controller) {
		this.clearTimeout(this.timer);
		this.timer = this.setTimeout(async () => {
			this.timer = null;
			try {
				await controller.reset();
			} catch (err) {
				this.logger.error?.("error resetting response chain after timeout: ", err);
			}
		}, this.resetTimeout);
	}

	dispose() {
		this.clearTimeout(this.timer);
		this.timer = null;
	}
}

export default BotAddonReset;
