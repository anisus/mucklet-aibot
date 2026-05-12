const config = {
	realm: {
		/** URL to the realm API WebSocket endpoint. */
		// apiUrl: 'wss://api.test.mucklet.com',
		apiUrl: 'ws://localhost:8080/',

		/**
		 * For security reason, it is not possible to store the token in the config file.
		 *
		 * Instead consider using:
		 * - MUCKLET_BOT_TOKEN_FILE environment variable with the path to a file containing the token
		 * - MUCKLET_BOT_TOKEN environment variable containing the token
		 * - --tokenfile flag with a path to a file containing the token
		 * - --token flag with the token.
		 */
	},
	bot: {
		/** Additional character roleplay instructions passed to the LLM. */
		characterInstructions: '',
	},
};

export default config;
