/**
 * Listens to a model or collection resource and returns a promise that resolves
 * once the resource condition returns true.
 *
 * It will resolve with the resource, or the result of calling the optional
 * value callback.
 *
 * If timeout is set, it will reject with a timeout error if the condition is
 * not fulfilled before the timeout has passed.
 * @param {Model | Collection} resource Model or collection resource.
 * @param {(resource: Model | Collection) => boolean } condition Condition callback
 * @param {object} [opts] Optional parameters
 * @param {(model: Model) => any } [opts.value] Value callback.
 * @param {number} [opts.timeout] Timeout duration.
 */
export default function awaitResourceState(resource, condition, opts) {
	opts = opts || {};

	return new Promise((resolve, reject) => {
		let timer = null;
		let done = false;
		let events = [ 'change', 'add', 'remove' ];
		let cleanup = () => {
			clearTimeout(timer);
			for (let event of events) {
				resource.off(event, onEvent);
			}
		};
		let rejectState = (err) => {
			if (done) {
				return;
			}
			done = true;
			cleanup();
			reject(err);
		};
		let resolveState = () => {
			if (done) {
				return;
			}

			let value;
			try {
				value = opts.value ? opts.value(resource) : resource;
			} catch (err) {
				rejectState(err);
				return;
			}

			done = true;
			cleanup();
			resolve(value);
		};
		let onEvent = () => {
			try {
				if (condition(resource)) {
					resolveState();
				}
			} catch (err) {
				rejectState(err);
			}
		};

		try {
			if (condition(resource)) {
				resolve(opts.value ? opts.value(resource) : resource);
				return;
			}
		} catch (err) {
			reject(err);
			return;
		}

		for (let event of events) {
			resource.on(event, onEvent);
		}

		if (opts.timeout) {
			timer = setTimeout(() => {
				rejectState(new Error("timeout"));
			}, opts.timeout);
		}
	});
}
