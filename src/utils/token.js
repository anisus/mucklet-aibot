import fs from 'fs';

export function getToken(token, tokenFile) {
	if (token) {
		return token.trim();
	}
	if (tokenFile) {
		return readTokenFile(tokenFile);
	}
	if (process.env['MUCKLET_BOT_TOKEN_FILE']) {
		return readTokenFile(process.env['MUCKLET_BOT_TOKEN_FILE']);
	}
	if (process.env['MUCKLET_BOT_TOKEN']) {
		return process.env['MUCKLET_BOT_TOKEN'].trim();
	}

	return '';
}

export function getOpenAIKey(openaiKey, openaiKeyFile) {
	if (openaiKey) {
		return openaiKey.trim();
	}
	if (openaiKeyFile) {
		return readTokenFile(openaiKeyFile);
	}
	if (process.env['OPENAI_API_KEY_FILE']) {
		return readTokenFile(process.env['OPENAI_API_KEY_FILE']);
	}
	if (process.env['OPENAI_API_KEY']) {
		return process.env['OPENAI_API_KEY'].trim();
	}

	return '';
}

function readTokenFile(file) {
	return fs.readFileSync(file, 'utf8').trim();
}
