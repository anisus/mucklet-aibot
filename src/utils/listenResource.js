/**
 * @callback ResourceEventCallback
 * @param {...unknown} args Event arguments.
 * @returns {void}
 */

/**
 * @typedef {object} ListenableResource
 * @property {(event?: string, callback?: ResourceEventCallback) => void} [on] Adds a listener.
 * @property {(event?: string, callback?: ResourceEventCallback) => void} [off] Removes a listener.
 */

/**
 * Listens or unlistens to a resource. If a callback is provided, it will
 * listen/unlisten to change on the resource, using the callback.
 * @param {ListenableResource | null | undefined} resource Resource object.
 * @param {boolean} [on] Listens if true, otherwise unlistens. Defaults to true.
 * @param {ResourceEventCallback} [onEvent] Callback function to call on event.
 * @param {string} [event] Event to listen to. Ignored if no callback is given. Defaults to 'change'.
 * @returns {ListenableResource | null | undefined} Resource being listened to.
 */
export default function listenResource(resource, on, onEvent, event) {
	if (resource && typeof resource == 'object') {
		/** @type {'on' | 'off'} */
		let method = on || typeof on == 'undefined' ? 'on' : 'off';
		if (typeof resource[method] == 'function') {
			if (onEvent) {
				resource[method](event || 'change', onEvent);
			} else {
				resource[method]();
			}
		}
	}
	return resource;
}

/**
 * Unlistens to one resource and starts listening to a second. If a callback is
 * provided, it will listen/unlisten to change on the resource, using the
 * callback.
 * @param {ListenableResource | null | undefined} oldResource Resource object to stop listening to.
 * @param {ListenableResource | null | undefined} newResource Resource object to start listening to.
 * @param {ResourceEventCallback} [onEvent] Callback function to call on change.
 * @param {string} [event] Event to listen to. Ignored if no callback is given. Defaults to 'change'.
 * @returns {ListenableResource | null} Resource being listened to, or null if no resource was provided.
 */
export function relistenResource(oldResource, newResource, onEvent, event) {
	newResource = newResource || null;
	if (oldResource !== newResource) {
		listenResource(oldResource, false, onEvent, event);
		listenResource(newResource, true, onEvent, event);
	}
	return newResource;
}
