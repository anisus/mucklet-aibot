import assert from 'node:assert/strict';
import test from 'node:test';

import BotAddonLook from '../src/classes/BotAddonLook.js';
import BotAddonSleep from '../src/classes/BotAddonSleep.js';
import BotController from '../src/classes/BotController.js';

test("BotController resolves look tool calls before posing", async () => {
	const calls = [];
	const requests = [];
	const lookedAt = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
		desc: "Ada wears a brass-buttoned coat.",
	});
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(addressedBy);
		},
	};
	const openai = {
		responses: {
			create(params) {
				requests.push(params);
				if (requests.length == 1) {
					return Promise.resolve({
						id: 'rsp_1',
						output_text: '',
						output: [
							{
								type: 'function_call',
								name: 'look',
								call_id: 'call_1',
								arguments: JSON.stringify({ charId: 'other-char' }),
							},
						],
					});
				}

				return Promise.resolve({
					id: 'rsp_2',
					output_text: JSON.stringify({ pose: "Ada nods at the polished boots." }),
					output: [],
				});
			},
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
	});
	controller.addFunction({
		name: 'look',
		description: "Gets the public in-character appearance description of a visible character.",
		instructions: '',
		parameters: {
			type: 'object',
			properties: {
				charId: {
					type: 'string',
					description: "The id of the visible character to inspect.",
				},
			},
			required: [ 'charId' ],
			additionalProperties: false,
		},
		call(_bot, args, context) {
			lookedAt.push(args.charId);
			return {
				name: context.addressedBy.name,
				surname: context.addressedBy.surname,
				description: "Bert's boots are polished to a mirror shine.",
			};
		},
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "What do you think?",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 2);
	assert.equal(requests[0].tools[0].name, 'look');
	assert.deepEqual(requests[0].tools[0].parameters.required, [ 'charId' ]);
	assert.equal(JSON.parse(requests[0].input).addressedBy.id, 'other-char');
	assert.equal(requests[1].previous_response_id, 'rsp_1');
	assert.deepEqual(lookedAt, [ 'other-char' ]);
	assert.deepEqual(requests[1].input, [
		{
			type: 'function_call_output',
			call_id: 'call_1',
			output: JSON.stringify({
				name: 'Bert',
				surname: 'Example',
				description: "Bert's boots are polished to a mirror shine.",
			}),
		},
	]);
	assert.deepEqual(calls, [
		[ 'char.call', 'ping', undefined ],
		[ 'api.get', 'core.char.other-char' ],
		[ 'char.call', 'pose', { msg: "nods at the polished boots." }],
	]);
});

test("BotAddonLook adds addressedBy description on first input from each character", async () => {
	const calls = [];
	const requests = [];
	const characters = {
		'other-char': createChar(calls, {
			id: 'other-char',
			name: 'Bert',
			surname: 'Example',
			desc: "Bert wears a red coat.",
		}),
		'third-char': createChar(calls, {
			id: 'third-char',
			name: 'Cora',
			surname: 'Example',
			desc: "Cora has a blue scarf.",
		}),
	};
	let controlled;
	controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
		desc: "Ada wears a brass-buttoned coat.",
		onCall(method, params) {
			if (method == 'look') {
				controlled.lookingAt = params.charId == controlled.id
					? null
					: {
						charId: params.charId,
						char: characters[params.charId],
					};
			}
		},
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(characters[rid.slice('core.char.'.length)]);
		},
	};
	const openai = {
		responses: {
			create(params) {
				requests.push(params);
				return Promise.resolve({
					id: 'rsp_' + requests.length,
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ new BotAddonLook() ],
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Still here.",
			pose: false,
		});
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'third-char', name: 'Cora', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 3);
	assert.equal(JSON.parse(requests[0].input).addressedBy.description, "Bert wears a red coat.");
	assert.equal(Object.hasOwn(JSON.parse(requests[1].input).addressedBy, 'description'), false);
	assert.equal(JSON.parse(requests[2].input).addressedBy.description, "Cora has a blue scarf.");
	assert.deepEqual(calls.filter(([ type, method ]) => type == 'char.call' && method == 'look'), [
		[ 'char.call', 'look', { charId: 'other-char' }],
		[ 'char.call', 'look', { charId: 'third-char' }],
	]);
});

test("BotAddonLook keeps responding with empty addressedBy description when first look fails", async () => {
	const calls = [];
	const requests = [];
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
		desc: "Bert wears a red coat.",
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
		desc: "Ada wears a brass-buttoned coat.",
		onCall(method) {
			if (method == 'look') {
				throw new Error("look failed");
			}
		},
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(addressedBy);
		},
	};
	const openai = {
		responses: {
			create(params) {
				requests.push(params);
				return Promise.resolve({
					id: 'rsp_1',
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ new BotAddonLook() ],
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 1);
	assert.equal(JSON.parse(requests[0].input).addressedBy.description, '');
	assert.deepEqual(calls.filter(([ type, method ]) => type == 'char.call' && method == 'look'), [
		[ 'char.call', 'look', { charId: 'other-char' }],
	]);
});

test("BotController accepts addons with functions, instructions, and pose hooks", async () => {
	const calls = [];
	const requests = [];
	let disposed = false;
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(addressedBy);
		},
	};
	const openai = {
		responses: {
			create(params) {
				requests.push(params);
				return Promise.resolve({
					id: 'rsp_1',
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const addon = {
		name: 'test-addon',
		instructions: "Addon instruction.",
		functions: [
			{
				name: 'noop',
				description: "Does nothing.",
				instructions: "Function instruction.",
				parameters: {
					type: 'object',
					properties: {},
					required: [],
					additionalProperties: false,
				},
				call() {
					return {};
				},
			},
		],
		beforeRespond(context) {
			context.params.max_output_tokens = 256;
			context.params.metadata = {
				addon: 'test-addon',
			};
		},
		beforePose(result) {
			result.pose += " quietly.";
		},
		dispose() {
			disposed = true;
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ addon ],
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 1);
	assert.equal(requests[0].tools[0].name, 'noop');
	assert.equal(requests[0].max_output_tokens, 256);
	assert.deepEqual(requests[0].metadata, {
		addon: 'test-addon',
	});
	assert.match(requests[0].instructions, /Function instruction\./);
	assert.match(requests[0].instructions, /Addon instruction\./);
	assert.deepEqual(calls, [
		[ 'char.call', 'ping', undefined ],
		[ 'api.get', 'core.char.other-char' ],
		[ 'char.call', 'pose', { msg: "smiles. quietly." }],
	]);
	assert.equal(disposed, true);
});

test("BotAddonSleep stops the controller on sleep output", async () => {
	const calls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(createChar(calls));
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		logger: {},
		admins: [ 'other-char' ],
		addons: [ new BotAddonSleep() ],
	});
	controller.started = true;

	try {
		controller._onOut({
			msg: 'sleep',
			type: 'address',
			char: { id: 'other-char' },
		});
		await controller.responseChain;
	} finally {
		controller.dispose();
	}

	assert.equal(controller.started, false);
	assert.deepEqual(calls, [
		[ 'char.call', 'ping', undefined ],
		[ 'char.call', 'release', undefined ],
	]);
});

test("BotAddonSleep ignores sleep output from non-admin characters", async () => {
	const calls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const api = {
		get(rid) {
			calls.push([ 'api.get', rid ]);
			return Promise.resolve(createChar(calls));
		},
	};
	const controller = new BotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		logger: {},
		admins: [ 'admin-char' ],
		addons: [ new BotAddonSleep() ],
	});
	controller.started = true;

	try {
		controller._onOut({
			msg: 'sleep',
			type: 'address',
			char: { id: 'other-char' },
		});
		await controller.responseChain;
	} finally {
		controller.dispose();
	}

	assert.equal(controller.started, true);
	assert.deepEqual(calls, [
		[ 'char.call', 'ping', undefined ],
	]);
});

function createChar(calls, options = {}) {
	return {
		id: options.id || 'char-id',
		name: options.name || 'Ada',
		surname: options.surname || 'Lovelace',
		gender: options.gender || 'female',
		species: options.species || 'human',
		desc: options.desc || '',
		about: options.about || '',
		state: options.state || 'awake',
		call(method, params) {
			calls.push([ 'char.call', method, params ]);
			options.onCall?.(method, params);
			return Promise.resolve();
		},
	};
}
