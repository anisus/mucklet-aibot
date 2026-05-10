import assert from 'node:assert/strict';
import test from 'node:test';

import ShutdownListener from '../src/classes/ShutdownListener.js';

test("ShutdownListener resolves when SIGTERM is emitted", async () => {
	const sigintListeners = process.listenerCount('SIGINT');
	const sigtermListeners = process.listenerCount('SIGTERM');
	const shutdown = new ShutdownListener();

	assert.equal(process.listenerCount('SIGINT'), sigintListeners + 1);
	assert.equal(process.listenerCount('SIGTERM'), sigtermListeners + 1);

	process.emit('SIGTERM');
	await shutdown.waitForShutdown();

	assert.equal(process.listenerCount('SIGINT'), sigintListeners);
	assert.equal(process.listenerCount('SIGTERM'), sigtermListeners);
});

test("ShutdownListener dispose removes signal listeners", () => {
	const sigintListeners = process.listenerCount('SIGINT');
	const sigtermListeners = process.listenerCount('SIGTERM');
	const shutdown = new ShutdownListener();

	shutdown.dispose();

	assert.equal(process.listenerCount('SIGINT'), sigintListeners);
	assert.equal(process.listenerCount('SIGTERM'), sigtermListeners);
});
