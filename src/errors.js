export function errToString(err) {
	if (!err) {
		return "";
	}
	if (typeof err == "string") {
		return err;
	}
	if (typeof err != "object") {
		return String(err);
	}
	if (err.toString && !err.code) {
		return err.toString();
	}

	let msg = err.message || err.code || "An error occurred";
	let params = err.data || {};

	return msg.replace(/{([^}]+)}/g, (match, idx) => {
		return typeof params[idx] != "undefined"
			? params[idx]
			: "???";
	});
}

export function printError(msg) {
	console.error("\n" + (msg || "An error occurred"));
	process.exitCode = 1;
}
