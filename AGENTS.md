# Agent Instructions

## Project Overview

This is a private Node.js 22+ ESM project for connecting to a Mucklet realm API and controlling a bot with OpenAI/ChatGPT. The bot can authenticate to a realm, wake and keep a character alive, listen for addressed room output, and generate pose responses.

## Repository Layout

- `index.js`: CLI executable wrapper.
- `src/main.js`: CLI startup flow and top-level bot runtime.
- `src/cli.js`: command-line option definitions, parsing, and help output.
- `src/classes/BotClient.js`: Mucklet/resclient connection and bot authentication logic.
- `src/classes/BotController.js`: OpenAI response generation and bot room-event handling.
- `src/classes/BotWrapper.js`: controlled-character wakeup, release, pose, and keepalive behavior.
- `src/classes/ShutdownListener.js`: process signal shutdown helper.
- `src/classes/Err.js`: local structured error type.
- `src/utils/config.js`: config file loading and path formatting helpers.
- `src/utils/token.js`: bot token and OpenAI API key lookup from CLI args, token files, and environment variables.
- `src/utils/errors.js`: error formatting and output helpers.
- `src/utils/listenResource.js`: resource listener attach/detach helpers.
- `test/*.test.js`: Node built-in test runner coverage for focused modules and runtime behavior.
- `mucklet.config.js`: local realm API configuration template.

## Commands

- Install dependencies with `npm install`.
- Run the bot with `npm start -- --token=<BOT_TOKEN> --openaikey=<OPENAI_API_KEY>` or `node index.js --token=<BOT_TOKEN> --openaikey=<OPENAI_API_KEY>`.
- Run tests with `npm test`.
- Run linting with `npm run lint`.

Before completing code changes, run `npm test` and `npm run lint` when practical. If a change only touches documentation, tests and linting are optional.

## Code Style

- Use ESM syntax; this package has `"type": "module"`.
- Target Node.js 22 or later.
- Follow ESLint for enforced formatting and correctness rules.
- For quote style, prefer double quotes for user-facing text and prose-like messages. Prefer single quotes only for machine identifiers such as resource IDs, option keys, and environment variable names when editing nearby code that already uses that convention.
- Keep modules small and focused. Prefer extending the existing helpers in `src/` over adding new patterns.
- Avoid broad refactors unless they are required for the task.
- Lean towards inlining code with comment instead of single use functions

## Testing Guidance

- Use Node's built-in test runner (`node --test` via `npm test`).
- Add or update tests under `test/` when changing CLI parsing, token/API key resolution, error formatting, bot wrapper behavior, or other deterministic behavior.
- Avoid tests that require live Mucklet credentials or network access. Keep live realm/API behavior behind manual runs.

## Configuration and Secrets

- Do not commit bot tokens, API keys, private realm URLs, or generated credential files.
- Use `MUCKLET_BOT_TOKEN`, `MUCKLET_BOT_TOKEN_FILE`, `--token`, or `--tokenfile` for Mucklet bot authentication.
- Use `OPENAI_API_KEY`, `OPENAI_API_KEY_FILE`, `--openaikey`, or `--openaikeyfile` for OpenAI authentication.
- Use `OPENAI_MODEL` to override the default model when needed.

## Operational Notes

- Preserve the current bot token and OpenAI API key lookup order documented in `README.md` unless explicitly changing that behavior.
- Keep CLI help text and README usage examples in sync when adding or changing options.
