class BotAddonSleep {

	get name() {
		return 'sleep';
	}

	async onOut(ev, context) {
		if (ev.msg == 'sleep' && context.admins.includes(ev.char?.id)) {
			await context.controller.stop();
			return false;
		}
	}
}

export default BotAddonSleep;
