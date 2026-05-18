import { parse } from 'tinyargs';

export const options = [
	{ name: 'config', flags: [ 'c' ], type: String, value: 'file', desc: "Mucklet AI bot config file" },
	{ name: 'apiurl', flags: [ 'a' ], type: String, value: 'url', desc: "Realm API WebSocket URL" },
	{ name: 'token', flags: [ 't' ], type: String, value: 'string', desc: "Bot token generated under Character Settings" },
	{ name: 'tokenfile', flags: [ 'T' ], type: String, value: 'file', desc: "File containing the bot token" },
	{ name: 'openaikey', flags: [ 'k' ], type: String, value: 'string', desc: "OpenAI API key" },
	{ name: 'openaikeyfile', flags: [ 'K' ], type: String, value: 'file', desc: "File containing the OpenAI API key" },
	{ name: 'charinstructions', flags: [ 'i' ], type: String, value: 'string', desc: "Character roleplay instructions" },
	{ name: 'charinstructionsfile', flags: [ 'I' ], type: String, value: 'file', desc: "File containing character roleplay instructions" },
	{ name: 'admin', type: String, multiple: true, value: 'charId', desc: "Administrator character ID allowed to use admin commands" },
	{ name: 'memorydir', type: String, value: 'dir', desc: "Directory for per-character memory files" },
	{ name: 'help', flags: [ 'h' ], type: Boolean, stop: true, desc: "Show this message" },
];

export function parseCli(args) {
	return parse(args, options);
}

export function printHelp() {
	console.log('\n' +
		"Control a Mucklet realm bot using ChatGPT API.\n\n" +
		"Usage:\n" +
		"  mucklet-aibot [options]\n\n" +
		"Options:\n" +
		formatOptions(options) +
		'\n',
	);
}

function formatOptions(opts) {
	const padding = Math.max(...opts.map(o => formatFlags(o).length)) + 2;
	return opts.map(o => {
		const flags = formatFlags(o);
		let desc = Array.isArray(o.desc) ? o.desc.join(' ') : o.desc;
		return '  ' + flags.padEnd(padding) + desc;
	}).join('\n');
}

function formatFlags(option) {
	let flags = option.flags?.length
		? option.flags.map(f => '-' + f).join(', ') + ', --' + option.name
		: '--' + option.name;
	if (option.value) {
		flags += ' <' + option.value + '>';
	}
	return flags;
}
