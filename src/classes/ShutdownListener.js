
/**
 * ShutdownListener creates a disposable listener for SIGINT and SIGTERM process
 * signals.
 */
class ShutdownListener {

	/**
	 * Creates a local shutdown listener.
	 */
	constructor() {
		this.promise = new Promise((resolve) => {
			this.resolve = (() => {
				resolve();
				this.dispose();
			});
			process.once('SIGINT', this.resolve);
			process.once('SIGTERM', this.resolve);
		});
	}

	async waitForShutdown() {
		await this.promise;
	}

	dispose() {
		if (this.resolve) {
			process.removeListener('SIGINT', this.resolve);
			process.removeListener('SIGTERM', this.resolve);
			this.resolve = null;
		}
	}
}

export default ShutdownListener;
