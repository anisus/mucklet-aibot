class BotAddonReset {

	get name() {
		return 'reset';
	}

	async onOut(ev, context) {
		if (ev.msg == 'reset' && context.admins.includes(ev.char?.id)) {
			await context.controller.reset();
			return false;
		}
	}
}

export default BotAddonReset;
