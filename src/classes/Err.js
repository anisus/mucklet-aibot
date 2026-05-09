/**
 * Err represents a local error.
 */
class Err {

	/**
	 * Creates a local error.
	 * @param {string} [code] Error code.
	 * @param {string} [message] Error message.
	 * @param {unknown} [data] Additional error data.
	 */
	constructor(code, message, data) {
		/** @type {string} */
		this._code = code || 'unknown';
		/** @type {string} */
		this._message = message || `Unknown error`;
		/** @type {unknown} */
		this._data = data;
	}

	/**
	 * Error code
	 * @type {string}
	 */
	get code() {
		return this._code;
	}

	/**
	 * Error message
	 * @type {string}
	 */
	get message() {
		return this._message;
	}

	/**
	 * Error data object
	 * @type {unknown}
	 */
	get data() {
		return this._data;
	}
}

export default Err;
