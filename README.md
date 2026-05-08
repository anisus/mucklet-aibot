# Mucklet AI Bot

A Node.js project for connecting to a Mucklet realm with a bot token. The first
version only verifies the bot login flow: connect, authenticate, fetch the bot
with `core.getBot`, log the result, and disconnect.

OpenAI/ChatGPT behavior is intentionally deferred until the Mucklet bot login
skeleton is working. Future ChatGPT integration should use the official
`openai` package and `OPENAI_API_KEY`.

## Prerequisites

* Node.js 22 or later
* A Mucklet bot token generated under _Character Settings_

## Install

```text
npm install
```

## Configure

Set the realm API WebSocket URL in `mucklet.config.js`:

```js
export default {
	realm: {
		apiUrl: "wss://api.test.mucklet.com",
	},
};
```

The API URL may also be passed with `--apiurl`.

## Run

```text
node index.js --token=<BOT_TOKEN>
```

or:

```text
MUCKLET_BOT_TOKEN=<BOT_TOKEN> npm start
```

Token sources are checked in this order:

1. `--token, -t <string>`
2. `--tokenfile, -T <file>`
3. `MUCKLET_BOT_TOKEN_FILE`
4. `MUCKLET_BOT_TOKEN`

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
-h, --help                Show help
```

## Development

```text
npm run lint
npm test
```
