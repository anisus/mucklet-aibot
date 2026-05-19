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
npm install -g mucklet-aibot
```

For local development from a checkout:

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
		memoryDir: 'memory',
		resetTimeout: 1000 * 60 * 15,
		compactThreshold: 100000,
		admins: [
			'admin-character-id',
		],
		visible: false,
	},
};
```

The API URL may also be passed with `--apiurl`. Character instructions may also
be passed with `--charinstructions` or read from a file with `--charinstructionsfile`.
Administrator characters allowed to use admin commands may be configured with
`bot.admins` or added with one or more `--admin=<CHARACTER_ID>` flags.
By default, the controlled character is hidden from the awake list. Set
`bot.visible` to `true` to make it visible.
Per-character memory summary files are stored in `bot.memoryDir`, or in the
directory passed with `--memorydir`. Each file contains a JSON record with the
memory text and first/last seen timestamps.
The response chain is reset after `bot.resetTimeout` milliseconds without an
addressed message, and defaults to 15 minutes.
OpenAI response chain compaction is always configured. The `bot.compactThreshold`
setting controls when compaction should trigger, and defaults to `100000` tokens.

## Run

```text
mucklet-aibot --token=<BOT_TOKEN> --openaikey=<OPENAI_API_KEY>
```

To allow one or more characters to use admin commands such as `sleep`, pass
their character IDs:

```text
mucklet-aibot --token=<BOT_TOKEN> --openaikey=<OPENAI_API_KEY> --admin=<CHARACTER_ID>
```

or:

```text
MUCKLET_BOT_TOKEN=<BOT_TOKEN> OPENAI_API_KEY=<OPENAI_API_KEY> mucklet-aibot
```

The process keeps running after startup so it can keep the character awake. Press
Ctrl+C to stop it.

## Docker

Run the official Docker Hub image with credentials from environment variables
and the realm API URL as a flag:

```text
docker run --rm \
  -e OPENAI_API_KEY=<OPENAI_API_KEY> \
  -e MUCKLET_BOT_TOKEN=<BOT_TOKEN> \
  -v ./memory:/app/memory \
  mucklet/mucklet-aibot \
  --apiurl=wss://api.test.mucklet.com
```

Or mount a config file:

```text
docker run --rm \
  -e OPENAI_API_KEY=<OPENAI_API_KEY> \
  -e MUCKLET_BOT_TOKEN=<BOT_TOKEN> \
  -v ./mucklet.config.js:/app/mucklet.config.js:ro \
  -v ./memory:/app/memory \
  mucklet/mucklet-aibot
```

To build a local image from the current source checkout:

```text
docker build -t mucklet-aibot .
```

When bind mounting a host memory directory, make sure it is writable by the
container `node` user. The official image runs as UID/GID `1000:1000`:

```text
mkdir -p ./memory
sudo chown -R 1000:1000 ./memory
```

Alternatively, use a named Docker volume for `/app/memory` instead of a host
bind mount.

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
mucklet-aibot [options]
```

Options:

```text
-c, --config <file>              Mucklet AI bot config file
-a, --apiurl <url>               Realm API WebSocket URL
-t, --token <string>             Bot token generated under Character Settings
-T, --tokenfile <file>           File containing the bot token
-k, --openaikey <string>         OpenAI API key
-K, --openaikeyfile <file>       File containing the OpenAI API key
-i, --charinstructions <string>  Character roleplay instructions
-I, --charinstructionsfile <file>  File containing character roleplay instructions
--admin <charId>                 Administrator character ID allowed to use admin commands
--memorydir <dir>                Directory for per-character memory files
-h, --help                       Show help
```

## Development

```text
npm run lint
npm test
```
