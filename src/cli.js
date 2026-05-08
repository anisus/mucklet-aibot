import { parse } from "tinyargs";

export const options = [
	{ name: "config", flags: [ "c" ], type: String, value: "file", desc: "Mucklet AI bot config file" },
	{ name: "apiurl", flags: [ "a" ], type: String, value: "url", desc: "Realm API WebSocket URL" },
	{ name: "token", flags: [ "t" ], type: String, value: "string", desc: "Bot token generated under Character Settings" },
	{ name: "tokenfile", flags: [ "T" ], type: String, value: "file", desc: "File containing the bot token" },
	{ name: "help", flags: [ "h" ], type: Boolean, stop: true, desc: "Show this message" },
];

const padding = 28;

export function parseCli(args) {
	return parse(args, options);
}

export function printHelp() {
	console.log("\n" +
		"Control a Mucklet realm bot using ChatGPT API.\n\n" +
		"Usage:\n" +
		"  node index.js [options]\n\n" +
		"Options:\n" +
		formatOptions(options) +
		"\n",
	);
}

function formatOptions(opts) {
	return opts.map(o => {
		let flags = o.flags?.length
			? o.flags.map(f => "-" + f).join(", ") + ", --" + o.name
			: "--" + o.name;
		if (o.value) {
			flags += " <" + o.value + ">";
		}
		let desc = Array.isArray(o.desc) ? o.desc.join(" ") : o.desc;
		return "  " + flags.padEnd(padding) + desc;
	}).join("\n");
}
