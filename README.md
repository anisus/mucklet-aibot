# Mucklet AI Bot

A Node.js project for connecting to a Mucklet realm with a bot token and using
ChatGPT to control it.

It is still under construction.

## Prerequisites

* Node.js 22 or later
* A Mucklet bot token generated under _Character Settings_
* An OpenAI API key

## Install

```text
npm install
```

## Configure

Set the realm API WebSocket URL in `mucklet.config.js`:

```js
export default {
	realm: {
		apiUrl: 'wss://api.test.mucklet.com',
	},
	bot: {
		characterInstructions: 'You cannot speak, but you communicate with expressive beeps.',
		characterInstructionsFile: '',
	},
};
```

The API URL may also be passed with `--apiurl`. Character instructions may also
be passed with `--charinstructions` or read from a file with `--charinstructionsfile`.

## Run

```text
node index.js --token=<BOT_TOKEN> --openaikey=<OPENAI_API_KEY>
```

or:

```text
MUCKLET_BOT_TOKEN=<BOT_TOKEN> OPENAI_API_KEY=<OPENAI_API_KEY> npm start
```

The process keeps running after startup so it can keep the character awake. Press
Ctrl+C to stop it.

Token sources are checked in this order:

1. `--token, -t <string>`
2. `--tokenfile, -T <file>`
3. `MUCKLET_BOT_TOKEN_FILE`
4. `MUCKLET_BOT_TOKEN`

OpenAI API key sources are checked in this order:

1. `--openaikey, -k <string>`
2. `--openaikeyfile, -K <file>`
3. `OPENAI_API_KEY_FILE`
4. `OPENAI_API_KEY`

## Usage

```text
node index.js [options]
```

Options:

```text
-c, --config <file>       Mucklet AI bot config file
-a, --apiurl <url>        Realm API WebSocket URL
-t, --token <string>      Bot token generated under Character Settings
-T, --tokenfile <file>    File containing the bot token
-k, --openaikey <string>  OpenAI API key
-K, --openaikeyfile <file> File containing the OpenAI API key
-i, --charinstructions <string> Character roleplay instructions
-I, --charinstructionsfile <file> File containing character roleplay instructions
-h, --help                Show help
```

## Development

```text
npm run lint
npm test
```
