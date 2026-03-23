import { o as requireActivePluginHttpRouteRegistry } from "./runtime-B5E7_GSf.js";
//#region src/infra/map-size.ts
function pruneMapToMaxSize(map, maxSize) {
	const limit = Math.max(0, Math.floor(maxSize));
	if (limit <= 0) {
		map.clear();
		return;
	}
	while (map.size > limit) {
		const oldest = map.keys().next();
		if (oldest.done) break;
		map.delete(oldest.value);
	}
}
//#endregion
//#region src/infra/http-body.ts
const DEFAULT_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_WEBHOOK_BODY_TIMEOUT_MS = 3e4;
const DEFAULT_ERROR_MESSAGE = {
	PAYLOAD_TOO_LARGE: "PayloadTooLarge",
	REQUEST_BODY_TIMEOUT: "RequestBodyTimeout",
	CONNECTION_CLOSED: "RequestBodyConnectionClosed"
};
const DEFAULT_ERROR_STATUS_CODE = {
	PAYLOAD_TOO_LARGE: 413,
	REQUEST_BODY_TIMEOUT: 408,
	CONNECTION_CLOSED: 400
};
const DEFAULT_RESPONSE_MESSAGE = {
	PAYLOAD_TOO_LARGE: "Payload too large",
	REQUEST_BODY_TIMEOUT: "Request body timeout",
	CONNECTION_CLOSED: "Connection closed"
};
var RequestBodyLimitError = class extends Error {
	constructor(init) {
		super(init.message ?? DEFAULT_ERROR_MESSAGE[init.code]);
		this.name = "RequestBodyLimitError";
		this.code = init.code;
		this.statusCode = DEFAULT_ERROR_STATUS_CODE[init.code];
	}
};
function isRequestBodyLimitError(error, code) {
	if (!(error instanceof RequestBodyLimitError)) return false;
	if (!code) return true;
	return error.code === code;
}
function requestBodyErrorToText(code) {
	return DEFAULT_RESPONSE_MESSAGE[code];
}
function parseContentLengthHeader(req) {
	const header = req.headers["content-length"];
	const raw = Array.isArray(header) ? header[0] : header;
	if (typeof raw !== "string") return null;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < 0) return null;
	return parsed;
}
function resolveRequestBodyLimitValues(options) {
	return {
		maxBytes: Number.isFinite(options.maxBytes) ? Math.max(1, Math.floor(options.maxBytes)) : 1,
		timeoutMs: typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs) ? Math.max(1, Math.floor(options.timeoutMs)) : DEFAULT_WEBHOOK_BODY_TIMEOUT_MS
	};
}
function advanceRequestBodyChunk(chunk, totalBytes, maxBytes) {
	const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
	const nextTotalBytes = totalBytes + buffer.length;
	return {
		buffer,
		totalBytes: nextTotalBytes,
		exceeded: nextTotalBytes > maxBytes
	};
}
async function readRequestBodyWithLimit(req, options) {
	const { maxBytes, timeoutMs } = resolveRequestBodyLimitValues(options);
	const encoding = options.encoding ?? "utf-8";
	const declaredLength = parseContentLengthHeader(req);
	if (declaredLength !== null && declaredLength > maxBytes) {
		const error = new RequestBodyLimitError({ code: "PAYLOAD_TOO_LARGE" });
		if (!req.destroyed) req.destroy();
		throw error;
	}
	return await new Promise((resolve, reject) => {
		let done = false;
		let ended = false;
		let totalBytes = 0;
		const chunks = [];
		const cleanup = () => {
			req.removeListener("data", onData);
			req.removeListener("end", onEnd);
			req.removeListener("error", onError);
			req.removeListener("close", onClose);
			clearTimeout(timer);
		};
		const finish = (cb) => {
			if (done) return;
			done = true;
			cleanup();
			cb();
		};
		const fail = (error) => {
			finish(() => reject(error));
		};
		const timer = setTimeout(() => {
			const error = new RequestBodyLimitError({ code: "REQUEST_BODY_TIMEOUT" });
			if (!req.destroyed) req.destroy();
			fail(error);
		}, timeoutMs);
		const onData = (chunk) => {
			if (done) return;
			const progress = advanceRequestBodyChunk(chunk, totalBytes, maxBytes);
			totalBytes = progress.totalBytes;
			if (progress.exceeded) {
				const error = new RequestBodyLimitError({ code: "PAYLOAD_TOO_LARGE" });
				if (!req.destroyed) req.destroy();
				fail(error);
				return;
			}
			chunks.push(progress.buffer);
		};
		const onEnd = () => {
			ended = true;
			finish(() => resolve(Buffer.concat(chunks).toString(encoding)));
		};
		const onError = (error) => {
			if (done) return;
			fail(error);
		};
		const onClose = () => {
			if (done || ended) return;
			fail(new RequestBodyLimitError({ code: "CONNECTION_CLOSED" }));
		};
		req.on("data", onData);
		req.on("end", onEnd);
		req.on("error", onError);
		req.on("close", onClose);
	});
}
async function readJsonBodyWithLimit(req, options) {
	try {
		const trimmed = (await readRequestBodyWithLimit(req, options)).trim();
		if (!trimmed) {
			if (options.emptyObjectOnEmpty === false) return {
				ok: false,
				code: "INVALID_JSON",
				error: "empty payload"
			};
			return {
				ok: true,
				value: {}
			};
		}
		try {
			return {
				ok: true,
				value: JSON.parse(trimmed)
			};
		} catch (error) {
			return {
				ok: false,
				code: "INVALID_JSON",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	} catch (error) {
		if (isRequestBodyLimitError(error)) return {
			ok: false,
			code: error.code,
			error: requestBodyErrorToText(error.code)
		};
		return {
			ok: false,
			code: "INVALID_JSON",
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
function installRequestBodyLimitGuard(req, res, options) {
	const { maxBytes, timeoutMs } = resolveRequestBodyLimitValues(options);
	const responseFormat = options.responseFormat ?? "json";
	const customText = options.responseText ?? {};
	let tripped = false;
	let reason = null;
	let done = false;
	let ended = false;
	let totalBytes = 0;
	const cleanup = () => {
		req.removeListener("data", onData);
		req.removeListener("end", onEnd);
		req.removeListener("close", onClose);
		req.removeListener("error", onError);
		clearTimeout(timer);
	};
	const finish = () => {
		if (done) return;
		done = true;
		cleanup();
	};
	const respond = (error) => {
		const text = customText[error.code] ?? requestBodyErrorToText(error.code);
		if (!res.headersSent) {
			res.statusCode = error.statusCode;
			if (responseFormat === "text") {
				res.setHeader("Content-Type", "text/plain; charset=utf-8");
				res.end(text);
			} else {
				res.setHeader("Content-Type", "application/json; charset=utf-8");
				res.end(JSON.stringify({ error: text }));
			}
		}
	};
	const trip = (error) => {
		if (tripped) return;
		tripped = true;
		reason = error.code;
		finish();
		respond(error);
		if (!req.destroyed) req.destroy();
	};
	const onData = (chunk) => {
		if (done) return;
		const progress = advanceRequestBodyChunk(chunk, totalBytes, maxBytes);
		totalBytes = progress.totalBytes;
		if (progress.exceeded) trip(new RequestBodyLimitError({ code: "PAYLOAD_TOO_LARGE" }));
	};
	const onEnd = () => {
		ended = true;
		finish();
	};
	const onClose = () => {
		if (done || ended) return;
		finish();
	};
	const onError = () => {
		finish();
	};
	const timer = setTimeout(() => {
		trip(new RequestBodyLimitError({ code: "REQUEST_BODY_TIMEOUT" }));
	}, timeoutMs);
	req.on("data", onData);
	req.on("end", onEnd);
	req.on("close", onClose);
	req.on("error", onError);
	const declaredLength = parseContentLengthHeader(req);
	if (declaredLength !== null && declaredLength > maxBytes) trip(new RequestBodyLimitError({ code: "PAYLOAD_TOO_LARGE" }));
	return {
		dispose: finish,
		isTripped: () => tripped,
		code: () => reason
	};
}
//#endregion
//#region src/plugins/http-path.ts
function normalizePluginHttpPath(path, fallback) {
	const trimmed = path?.trim();
	if (!trimmed) {
		const fallbackTrimmed = fallback?.trim();
		if (!fallbackTrimmed) return null;
		return fallbackTrimmed.startsWith("/") ? fallbackTrimmed : `/${fallbackTrimmed}`;
	}
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
//#endregion
//#region src/gateway/security-path.ts
const MAX_PATH_DECODE_PASSES = 32;
function normalizePathSeparators(pathname) {
	const collapsed = pathname.replace(/\/{2,}/g, "/");
	if (collapsed.length <= 1) return collapsed;
	return collapsed.replace(/\/+$/, "");
}
function resolveDotSegments(pathname) {
	try {
		return new URL(pathname, "http://localhost").pathname;
	} catch {
		return pathname;
	}
}
function normalizePathForSecurity(pathname) {
	return normalizePathSeparators(resolveDotSegments(pathname).toLowerCase()) || "/";
}
function pushNormalizedCandidate(candidates, seen, value) {
	const normalized = normalizePathForSecurity(value);
	if (seen.has(normalized)) return;
	seen.add(normalized);
	candidates.push(normalized);
}
function buildCanonicalPathCandidates(pathname, maxDecodePasses = MAX_PATH_DECODE_PASSES) {
	const candidates = [];
	const seen = /* @__PURE__ */ new Set();
	pushNormalizedCandidate(candidates, seen, pathname);
	let decoded = pathname;
	let malformedEncoding = false;
	let decodePasses = 0;
	for (let pass = 0; pass < maxDecodePasses; pass++) {
		let nextDecoded = decoded;
		try {
			nextDecoded = decodeURIComponent(decoded);
		} catch {
			malformedEncoding = true;
			break;
		}
		if (nextDecoded === decoded) break;
		decodePasses += 1;
		decoded = nextDecoded;
		pushNormalizedCandidate(candidates, seen, decoded);
	}
	let decodePassLimitReached = false;
	if (!malformedEncoding) try {
		decodePassLimitReached = decodeURIComponent(decoded) !== decoded;
	} catch {
		malformedEncoding = true;
	}
	return {
		candidates,
		decodePasses,
		decodePassLimitReached,
		malformedEncoding
	};
}
function canonicalizePathVariant(pathname) {
	const { candidates } = buildCanonicalPathCandidates(pathname);
	return candidates[candidates.length - 1] ?? "/";
}
function canonicalizePathForSecurity(pathname) {
	const { candidates, decodePasses, decodePassLimitReached, malformedEncoding } = buildCanonicalPathCandidates(pathname);
	return {
		canonicalPath: candidates[candidates.length - 1] ?? "/",
		candidates,
		decodePasses,
		decodePassLimitReached,
		malformedEncoding,
		rawNormalizedPath: normalizePathSeparators(pathname.toLowerCase()) || "/"
	};
}
const PROTECTED_PLUGIN_ROUTE_PREFIXES = ["/api/channels"];
//#endregion
//#region src/plugins/http-route-overlap.ts
function prefixMatchPath(pathname, prefix) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}%`);
}
function doPluginHttpRoutesOverlap(a, b) {
	const aPath = canonicalizePathVariant(a.path);
	const bPath = canonicalizePathVariant(b.path);
	if (a.match === "exact" && b.match === "exact") return aPath === bPath;
	if (a.match === "prefix" && b.match === "prefix") return prefixMatchPath(aPath, bPath) || prefixMatchPath(bPath, aPath);
	const prefixRoute = a.match === "prefix" ? a : b;
	return prefixMatchPath(canonicalizePathVariant((a.match === "exact" ? a : b).path), canonicalizePathVariant(prefixRoute.path));
}
function findOverlappingPluginHttpRoute(routes, candidate) {
	return routes.find((route) => doPluginHttpRoutesOverlap(route, candidate));
}
//#endregion
//#region src/plugins/http-registry.ts
function registerPluginHttpRoute(params) {
	const registry = params.registry ?? requireActivePluginHttpRouteRegistry();
	const routes = registry.httpRoutes ?? [];
	registry.httpRoutes = routes;
	const normalizedPath = normalizePluginHttpPath(params.path, params.fallbackPath);
	const suffix = params.accountId ? ` for account "${params.accountId}"` : "";
	if (!normalizedPath) {
		params.log?.(`plugin: webhook path missing${suffix}`);
		return () => {};
	}
	const routeMatch = params.match ?? "exact";
	const overlappingRoute = findOverlappingPluginHttpRoute(routes, {
		path: normalizedPath,
		match: routeMatch
	});
	if (overlappingRoute && overlappingRoute.auth !== params.auth) {
		params.log?.(`plugin: route overlap denied at ${normalizedPath} (${routeMatch}, ${params.auth})${suffix}; overlaps ${overlappingRoute.path} (${overlappingRoute.match}, ${overlappingRoute.auth}) owned by ${overlappingRoute.pluginId ?? "unknown-plugin"} (${overlappingRoute.source ?? "unknown-source"})`);
		return () => {};
	}
	const existingIndex = routes.findIndex((entry) => entry.path === normalizedPath && entry.match === routeMatch);
	if (existingIndex >= 0) {
		const existing = routes[existingIndex];
		if (!existing) return () => {};
		if (!params.replaceExisting) {
			params.log?.(`plugin: route conflict at ${normalizedPath} (${routeMatch})${suffix}; owned by ${existing.pluginId ?? "unknown-plugin"} (${existing.source ?? "unknown-source"})`);
			return () => {};
		}
		if (existing.pluginId && params.pluginId && existing.pluginId !== params.pluginId) {
			params.log?.(`plugin: route replacement denied for ${normalizedPath} (${routeMatch})${suffix}; owned by ${existing.pluginId}`);
			return () => {};
		}
		const pluginHint = params.pluginId ? ` (${params.pluginId})` : "";
		params.log?.(`plugin: replacing stale webhook path ${normalizedPath} (${routeMatch})${suffix}${pluginHint}`);
		routes.splice(existingIndex, 1);
	}
	const entry = {
		path: normalizedPath,
		handler: params.handler,
		auth: params.auth,
		match: routeMatch,
		pluginId: params.pluginId,
		source: params.source
	};
	routes.push(entry);
	return () => {
		const index = routes.indexOf(entry);
		if (index >= 0) routes.splice(index, 1);
	};
}
//#endregion
export { canonicalizePathVariant as a, DEFAULT_WEBHOOK_MAX_BODY_BYTES as c, isRequestBodyLimitError as d, readJsonBodyWithLimit as f, pruneMapToMaxSize as h, canonicalizePathForSecurity as i, RequestBodyLimitError as l, requestBodyErrorToText as m, findOverlappingPluginHttpRoute as n, normalizePluginHttpPath as o, readRequestBodyWithLimit as p, PROTECTED_PLUGIN_ROUTE_PREFIXES as r, DEFAULT_WEBHOOK_BODY_TIMEOUT_MS as s, registerPluginHttpRoute as t, installRequestBodyLimitGuard as u };
