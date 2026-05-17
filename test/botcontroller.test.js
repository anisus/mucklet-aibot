import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import BotAddonLook from '../src/classes/BotAddonLook.js';
import BotAddonMemory from '../src/classes/BotAddonMemory.js';
import BotAddonReset from '../src/classes/BotAddonReset.js';
import BotAddonSleep from '../src/classes/BotAddonSleep.js';
import BotController from '../src/classes/BotController.js';

test("BotController requires an OpenAI API key or client", () => {
	const calls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});

	assert.throws(() => new BotController({}, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		logger: {},
	}), /missing OpenAI API key/);

	const controller = new BotController({}, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
		logger: {},
	});
	controller.dispose();
});

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
	const controller = createBotController(api, {
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
	const controller = createBotController(api, {
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

test("BotAddonLook adds addressedBy description again after response chain reset", async () => {
	const calls = [];
	const requests = [];
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
		desc: "Bert wears a red coat.",
	});
	let controlled;
	controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
		desc: "Ada wears a brass-buttoned coat.",
		onCall(method, params) {
			if (method == 'look') {
				controlled.lookingAt = {
					charId: params.charId,
					char: addressedBy,
				};
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
					id: 'rsp_' + requests.length,
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = createBotController(api, {
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
		await controller.reset();
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Back again.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 3);
	assert.equal(JSON.parse(requests[0].input).addressedBy.description, "Bert wears a red coat.");
	assert.equal(Object.hasOwn(JSON.parse(requests[1].input).addressedBy, 'description'), false);
	assert.equal(JSON.parse(requests[2].input).addressedBy.description, "Bert wears a red coat.");
	assert.deepEqual(calls.filter(([ type, method ]) => type == 'char.call' && method == 'look'), [
		[ 'char.call', 'look', { charId: 'other-char' }],
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
	const controller = createBotController(api, {
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

test("BotAddonMemory adds addressedBy memory on first input from each character", async () => {
	const calls = [];
	const requests = [];
	const memoryDir = makeTempDir();
	fs.writeFileSync(path.join(memoryDir, 'other-char.txt'), "Bert met Ada near the market.\n", 'utf8');
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
					id: 'rsp_' + requests.length,
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const memory = new BotAddonMemory({ memoryDir });
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ memory ],
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
		await memory.afterReset();
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Back again.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 3);
	assert.equal(JSON.parse(requests[0].input).addressedBy.memory, "Bert met Ada near the market.");
	assert.equal(Object.hasOwn(JSON.parse(requests[1].input).addressedBy, 'memory'), false);
	assert.equal(JSON.parse(requests[2].input).addressedBy.memory, "Bert met Ada near the market.");
});

test("BotAddonMemory skips missing memory files", async () => {
	const calls = [];
	const requests = [];
	const memoryDir = makeTempDir();
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ new BotAddonMemory({ memoryDir }) ],
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
	assert.equal(Object.hasOwn(JSON.parse(requests[0].input).addressedBy, 'memory'), false);
});

test("BotAddonMemory summarizes tracked characters before reset", async () => {
	const calls = [];
	const requests = [];
	const memoryDir = makeTempDir();
	fs.writeFileSync(path.join(memoryDir, 'other-char.txt'), "Bert already trusts Ada.\n", 'utf8');
	const characters = {
		'other-char': createChar(calls, {
			id: 'other-char',
			name: 'Bert',
			surname: 'Example',
		}),
		'third-char': createChar(calls, {
			id: 'third-char',
			name: 'Cora',
			surname: 'Example',
		}),
	};
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
				if (params.instructions?.startsWith('Create a concise private memory')) {
					const input = JSON.parse(params.input);
					return Promise.resolve({
						id: 'summary_' + input.character.id,
						output_text: input.character.name + " remembers the conversation.",
						output: [],
					});
				}

				return Promise.resolve({
					id: 'rsp_' + requests.length,
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ new BotAddonMemory({ memoryDir }) ],
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
			char: { id: 'third-char', name: 'Cora', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
		await controller.reset();
	} finally {
		controller.dispose();
	}

	const summaryRequests = requests.filter(params => params.instructions?.startsWith('Create a concise private memory'));
	assert.equal(summaryRequests.length, 2);
	assert.deepEqual(summaryRequests.map(params => params.previous_response_id), [ 'rsp_2', 'rsp_2' ]);
	assert.equal(JSON.parse(summaryRequests[0].input).existingMemory, "Bert already trusts Ada.");
	assert.equal(fs.readFileSync(path.join(memoryDir, 'other-char.txt'), 'utf8'), "Bert remembers the conversation.\n");
	assert.equal(fs.readFileSync(path.join(memoryDir, 'third-char.txt'), 'utf8'), "Cora remembers the conversation.\n");
	assert.equal(controller.previousResponseId, null);
});

test("BotAddonMemory summarizes tracked characters before stop", async () => {
	const calls = [];
	const requests = [];
	const memoryDir = makeTempDir();
	fs.writeFileSync(path.join(memoryDir, 'other-char.txt'), "Bert already trusts Ada.\n", 'utf8');
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
				if (params.instructions?.startsWith('Create a concise private memory')) {
					return Promise.resolve({
						id: 'summary_1',
						output_text: "Bert remembers Ada before sleep.",
						output: [],
					});
				}

				return Promise.resolve({
					id: 'rsp_1',
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
		addons: [ new BotAddonMemory({ memoryDir }) ],
	});
	controller.started = true;

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
		await controller.stop();
	} finally {
		controller.dispose();
	}

	const summaryRequests = requests.filter(params => params.instructions?.startsWith('Create a concise private memory'));
	assert.equal(summaryRequests.length, 1);
	assert.equal(summaryRequests[0].previous_response_id, 'rsp_1');
	assert.equal(JSON.parse(summaryRequests[0].input).existingMemory, "Bert already trusts Ada.");
	assert.equal(fs.readFileSync(path.join(memoryDir, 'other-char.txt'), 'utf8'), "Bert remembers Ada before sleep.\n");
	assert.equal(controller.started, false);
});

test("BotAddonMemory leaves existing memory unchanged on empty summary", async () => {
	const calls = [];
	const requests = [];
	const errors = [];
	const memoryDir = makeTempDir();
	fs.writeFileSync(path.join(memoryDir, 'other-char.txt'), "Bert already trusts Ada.\n", 'utf8');
	const addressedBy = createChar(calls, {
		id: 'other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
				if (params.instructions?.startsWith('Create a concise private memory')) {
					return Promise.resolve({
						id: 'summary_1',
						output_text: '  ',
						output: [],
					});
				}

				return Promise.resolve({
					id: 'rsp_1',
					output_text: JSON.stringify({ pose: "Ada smiles." }),
					output: [],
				});
			},
		},
	};
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {
			error(...msgs) {
				errors.push(msgs);
			},
		},
		addons: [ new BotAddonMemory({ memoryDir }) ],
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
		await controller.reset();
	} finally {
		controller.dispose();
	}

	assert.equal(fs.readFileSync(path.join(memoryDir, 'other-char.txt'), 'utf8'), "Bert already trusts Ada.\n");
	assert.equal(errors.length, 1);
	assert.match(errors[0][0], /empty memory summary/);
});

test("BotAddonMemory skips unsafe character IDs", async () => {
	const calls = [];
	const requests = [];
	const errors = [];
	const memoryDir = makeTempDir();
	const addressedBy = createChar(calls, {
		id: '../other-char',
		name: 'Bert',
		surname: 'Example',
	});
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
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
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {
			error(...msgs) {
				errors.push(msgs);
			},
		},
		addons: [ new BotAddonMemory({ memoryDir }) ],
	});

	try {
		await controller._respondToAddress({
			type: 'address',
			char: { id: '../other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
		await controller.reset();
	} finally {
		controller.dispose();
	}

	assert.equal(requests.length, 1);
	assert.equal(Object.hasOwn(JSON.parse(requests[0].input).addressedBy, 'memory'), false);
	assert.deepEqual(fs.readdirSync(memoryDir), []);
	assert.equal(errors.length, 1);
	assert.match(errors[0][0], /invalid character id/);
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
	const controller = createBotController(api, {
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

test("BotController reset clears previous response id before next response", async () => {
	const calls = [];
	const requests = [];
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
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai,
		logger: {},
	});

	try {
		controller.previousResponseId = 'rsp_previous';
		await controller.reset();
		await controller._respondToAddress({
			type: 'address',
			char: { id: 'other-char', name: 'Bert', surname: 'Example' },
			msg: "Hello.",
			pose: false,
		});
	} finally {
		controller.dispose();
	}

	assert.equal(Object.hasOwn(requests[0], 'previous_response_id'), false);
	assert.equal(controller.previousResponseId, 'rsp_1');
});

test("BotController reset runs hooks around clearing previous response id", async () => {
	const calls = [];
	const hookCalls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const controller = createBotController({}, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
		logger: {},
		addons: [
			{
				beforeReset(context) {
					hookCalls.push([ 'before', context.controller.previousResponseId ]);
				},
				afterReset(context) {
					hookCalls.push([ 'after', context.controller.previousResponseId ]);
				},
			},
		],
	});

	try {
		controller.previousResponseId = 'rsp_previous';
		await controller.reset();
	} finally {
		controller.dispose();
	}

	assert.deepEqual(hookCalls, [
		[ 'before', 'rsp_previous' ],
		[ 'after', null ],
	]);
});

test("BotController reset logs hook errors and still resets", async () => {
	const calls = [];
	const errors = [];
	const hookCalls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const controller = createBotController({}, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
		logger: {
			error(...msgs) {
				errors.push(msgs);
			},
		},
		addons: [
			{
				beforeReset() {
					throw new Error("before failed");
				},
				afterReset(context) {
					hookCalls.push([ 'after', context.controller.previousResponseId ]);
				},
			},
		],
	});

	try {
		controller.previousResponseId = 'rsp_previous';
		await controller.reset();
	} finally {
		controller.dispose();
	}

	assert.equal(controller.previousResponseId, null);
	assert.deepEqual(hookCalls, [
		[ 'after', null ],
	]);
	assert.equal(errors.length, 1);
	assert.match(errors[0][0], /error before resetting response chain/);
	assert.match(errors[0][1].message, /before failed/);
});

test("BotAddonReset resets from response chain without deadlocking", async () => {
	const calls = [];
	const hookCalls = [];
	const controlled = createChar(calls, {
		id: 'bot-char',
		name: 'Ada',
		surname: 'Lovelace',
	});
	const controller = createBotController({}, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
		logger: {},
		admins: [ 'admin-char' ],
		addons: [
			new BotAddonReset(),
			{
				beforeReset(context) {
					hookCalls.push([ 'before', context.controller.previousResponseId ]);
				},
				afterReset(context) {
					hookCalls.push([ 'after', context.controller.previousResponseId ]);
				},
			},
		],
	});
	controller.previousResponseId = 'rsp_previous';

	try {
		controller._onOut({
			msg: 'reset',
			type: 'address',
			char: { id: 'admin-char' },
		});
		await waitForPromise(controller.responseChain);
	} finally {
		controller.dispose();
	}

	assert.equal(controller.previousResponseId, null);
	assert.deepEqual(hookCalls, [
		[ 'before', 'rsp_previous' ],
		[ 'after', null ],
	]);
	assert.deepEqual(calls, [
		[ 'char.call', 'ping', undefined ],
	]);
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
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
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
	const controller = createBotController(api, {
		char: controlled,
		controlled,
		on() {},
		off() {},
	}, {
		openai: createUnusedOpenAI(),
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
		[ 'api.get', 'core.char.other-char' ],
	]);
});

async function waitForPromise(promise, timeout = 100) {
	let timeoutId;
	try {
		return await Promise.race([
			promise,
			new Promise((_resolve, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error("promise did not resolve"));
				}, timeout);
			}),
		]);
	} finally {
		clearTimeout(timeoutId);
	}
}

function makeTempDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'mucklet-aibot-'));
}

function createUnusedOpenAI() {
	return {
		responses: {
			create() {
				throw new Error("unexpected OpenAI request");
			},
		},
	};
}

function createBotController(api, bot, opts = {}) {
	return new BotController(api, bot, {
		openaiApiKey: 'test-openai-key',
		...opts,
	});
}

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
