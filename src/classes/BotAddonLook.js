import BotFunctionLook from './BotFunctionLook.js';

/**
 * @typedef {object} BotAddonLookOptions
 * @property {{ log?: (...msgs: unknown[]) => void, error?: (...msgs: unknown[]) => void}} [logger] Logger functions.
 */

class BotAddonLook {

	/**
	 * Creates a BotAddonLook instance.
	 * @param {BotAddonLookOptions} opts Optional parameters.
	 */
	constructor(opts = {}) {
		this.lookFunction = new BotFunctionLook(opts);
	}

	get name() {
		return 'look';
	}

	get functions() {
		return [ this.lookFunction ];
	}
}

export default BotAddonLook;
