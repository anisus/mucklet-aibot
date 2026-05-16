import BotFunctionLook from './BotFunctionLook.js';

class BotAddonLook {

	get name() {
		return 'look';
	}

	functions(context) {
		return [ new BotFunctionLook({ logger: context.logger }) ];
	}
}

export default BotAddonLook;
