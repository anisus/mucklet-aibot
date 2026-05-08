import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadConfig(configFile) {
	const resolved = path.resolve(configFile);
	if (!fs.existsSync(resolved)) {
		return {};
	}

	try {
		const mod = await import(pathToFileURL(resolved));
		const cfg = mod.default;
		return typeof cfg == "function"
			? await cfg()
			: cfg || {};
	} catch (err) {
		throw "error loading config file: " + (err?.message || err);
	}
}

export function formatPath(from, to) {
	return "./" + path.relative(from, to).replace(/\\/g, "/");
}

export function rootRelativePath(to) {
	return formatPath(path.join(dirname, ".."), to);
}
