export const defaultHelloMessage = "Hello, world!";
export const defaultPingDuration = 1000 * 60 * 3;
export const defaultPingRetry = 1000 * 15;

export async function wakeupBot(bot, options = {}) {
	let char = bot.controlled || null;
	if (!char) {
		char = await bot.call('controlChar');
	}

	const woke = char.state != 'awake';
	if (woke) {
		await char.call('wakeup', { hidden: Boolean(options.hidden) });
	}

	return { char, woke };
}

export async function sayHello(char, msg = defaultHelloMessage) {
	await char.call('say', { msg });
}

export function startKeepAwake(char, options = {}) {
	const duration = options.duration || defaultPingDuration;
	const retry = options.retry || defaultPingRetry;
	const onError = options.onError || (() => {});
	let timer = null;
	let stopped = false;

	const ping = () => {
		char.call('ping').then(() => {
			if (!stopped) {
				timer = setTimeout(ping, duration);
			}
		}).catch(err => {
			if (!stopped) {
				onError(err);
				timer = setTimeout(ping, retry);
			}
		});
	};

	ping();

	return () => {
		stopped = true;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};
}
