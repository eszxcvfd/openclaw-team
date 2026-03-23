import { d as isRecord$1 } from "./utils-DzdaH7JM.js";
import { t as isBlockedObjectKey } from "./prototype-keys-mkcCRiyK.js";
import { c as normalizeResolvedSecretInputString } from "./types.secrets-CV05Fs_3.js";
import { t as isSafeExecutableValue } from "./exec-safety-sb8-_ay_.js";
import { s as normalizeChatChannelId } from "./registry-COOqBSUM.js";
import { i as withTrustedEnvProxyGuardedFetchMode, n as fetchWithSsrFGuard, r as withStrictGuardedFetchMode } from "./fetch-guard-ClSe9uaR.js";
import { n as normalizeSecretInput } from "./normalize-secret-input-BZufH2HR.js";
//#region src/config/legacy.shared.ts
const getRecord = (value) => isRecord$1(value) ? value : null;
const ensureRecord$1 = (root, key) => {
	const existing = root[key];
	if (isRecord$1(existing)) return existing;
	const next = {};
	root[key] = next;
	return next;
};
const mergeMissing = (target, source) => {
	for (const [key, value] of Object.entries(source)) {
		if (value === void 0 || isBlockedObjectKey(key)) continue;
		const existing = target[key];
		if (existing === void 0) {
			target[key] = value;
			continue;
		}
		if (isRecord$1(existing) && isRecord$1(value)) mergeMissing(existing, value);
	}
};
const mapLegacyAudioTranscription = (value) => {
	const transcriber = getRecord(value);
	const command = Array.isArray(transcriber?.command) ? transcriber?.command : null;
	if (!command || command.length === 0) return null;
	if (typeof command[0] !== "string") return null;
	if (!command.every((part) => typeof part === "string")) return null;
	const rawExecutable = command[0].trim();
	if (!rawExecutable) return null;
	if (!isSafeExecutableValue(rawExecutable)) return null;
	const args = command.slice(1);
	const timeoutSeconds = typeof transcriber?.timeoutSeconds === "number" ? transcriber?.timeoutSeconds : void 0;
	const result = {
		command: rawExecutable,
		type: "cli"
	};
	if (args.length > 0) result.args = args;
	if (timeoutSeconds !== void 0) result.timeoutSeconds = timeoutSeconds;
	return result;
};
const getAgentsList = (agents) => {
	const list = agents?.list;
	return Array.isArray(list) ? list : [];
};
const resolveDefaultAgentIdFromRaw = (raw) => {
	const list = getAgentsList(getRecord(raw.agents));
	const defaultEntry = list.find((entry) => isRecord$1(entry) && entry.default === true && typeof entry.id === "string" && entry.id.trim() !== "");
	if (defaultEntry) return defaultEntry.id.trim();
	const routing = getRecord(raw.routing);
	const routingDefault = typeof routing?.defaultAgentId === "string" ? routing.defaultAgentId.trim() : "";
	if (routingDefault) return routingDefault;
	const firstEntry = list.find((entry) => isRecord$1(entry) && typeof entry.id === "string" && entry.id.trim() !== "");
	if (firstEntry) return firstEntry.id.trim();
	return "main";
};
const ensureAgentEntry = (list, id) => {
	const normalized = id.trim();
	const existing = list.find((entry) => isRecord$1(entry) && typeof entry.id === "string" && entry.id.trim() === normalized);
	if (existing) return existing;
	const created = { id: normalized };
	list.push(created);
	return created;
};
//#endregion
//#region src/agents/tools/web-guarded-fetch.ts
const WEB_TOOLS_TRUSTED_NETWORK_SSRF_POLICY = {
	dangerouslyAllowPrivateNetwork: true,
	allowRfc2544BenchmarkRange: true
};
function resolveTimeoutMs(params) {
	if (typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs)) return params.timeoutMs;
	if (typeof params.timeoutSeconds === "number" && Number.isFinite(params.timeoutSeconds)) return params.timeoutSeconds * 1e3;
}
async function fetchWithWebToolsNetworkGuard(params) {
	const { timeoutSeconds, useEnvProxy, ...rest } = params;
	const resolved = {
		...rest,
		timeoutMs: resolveTimeoutMs({
			timeoutMs: rest.timeoutMs,
			timeoutSeconds
		})
	};
	return fetchWithSsrFGuard(useEnvProxy ? withTrustedEnvProxyGuardedFetchMode(resolved) : withStrictGuardedFetchMode(resolved));
}
async function withWebToolsNetworkGuard(params, run) {
	const { response, finalUrl, release } = await fetchWithWebToolsNetworkGuard(params);
	try {
		return await run({
			response,
			finalUrl
		});
	} finally {
		await release();
	}
}
async function withTrustedWebToolsEndpoint(params, run) {
	return await withWebToolsNetworkGuard({
		...params,
		policy: WEB_TOOLS_TRUSTED_NETWORK_SSRF_POLICY,
		useEnvProxy: true
	}, run);
}
async function withStrictWebToolsEndpoint(params, run) {
	return await withWebToolsNetworkGuard(params, run);
}
//#endregion
//#region src/agents/tools/web-search-citation-redirect.ts
const REDIRECT_TIMEOUT_MS = 5e3;
/**
* Resolve a citation redirect URL to its final destination using a HEAD request.
* Returns the original URL if resolution fails or times out.
*/
async function resolveCitationRedirectUrl(url) {
	try {
		return await withStrictWebToolsEndpoint({
			url,
			init: { method: "HEAD" },
			timeoutMs: REDIRECT_TIMEOUT_MS
		}, async ({ finalUrl }) => finalUrl || url);
	} catch {
		return url;
	}
}
//#endregion
//#region src/agents/tools/web-shared.ts
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_CACHE_TTL_MINUTES = 15;
const DEFAULT_CACHE_MAX_ENTRIES = 100;
function resolveTimeoutSeconds(value, fallback) {
	const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
	return Math.max(1, Math.floor(parsed));
}
function resolveCacheTtlMs(value, fallbackMinutes) {
	const minutes = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallbackMinutes;
	return Math.round(minutes * 6e4);
}
function normalizeCacheKey(value) {
	return value.trim().toLowerCase();
}
function readCache(cache, key) {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return {
		value: entry.value,
		cached: true
	};
}
function writeCache(cache, key, value, ttlMs) {
	if (ttlMs <= 0) return;
	if (cache.size >= DEFAULT_CACHE_MAX_ENTRIES) {
		const oldest = cache.keys().next();
		if (!oldest.done) cache.delete(oldest.value);
	}
	cache.set(key, {
		value,
		expiresAt: Date.now() + ttlMs,
		insertedAt: Date.now()
	});
}
function withTimeout(signal, timeoutMs) {
	if (timeoutMs <= 0) return signal ?? new AbortController().signal;
	const controller = new AbortController();
	const timer = setTimeout(controller.abort.bind(controller), timeoutMs);
	if (signal) signal.addEventListener("abort", () => {
		clearTimeout(timer);
		controller.abort();
	}, { once: true });
	controller.signal.addEventListener("abort", () => {
		clearTimeout(timer);
	}, { once: true });
	return controller.signal;
}
async function readResponseText(res, options) {
	const maxBytesRaw = options?.maxBytes;
	const maxBytes = typeof maxBytesRaw === "number" && Number.isFinite(maxBytesRaw) && maxBytesRaw > 0 ? Math.floor(maxBytesRaw) : void 0;
	const body = res.body;
	if (maxBytes && body && typeof body === "object" && "getReader" in body && typeof body.getReader === "function") {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let bytesRead = 0;
		let truncated = false;
		const parts = [];
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				if (!value || value.byteLength === 0) continue;
				let chunk = value;
				if (bytesRead + chunk.byteLength > maxBytes) {
					const remaining = Math.max(0, maxBytes - bytesRead);
					if (remaining <= 0) {
						truncated = true;
						break;
					}
					chunk = chunk.subarray(0, remaining);
					truncated = true;
				}
				bytesRead += chunk.byteLength;
				parts.push(decoder.decode(chunk, { stream: true }));
				if (truncated || bytesRead >= maxBytes) {
					truncated = true;
					break;
				}
			}
		} catch {} finally {
			if (truncated) try {
				await reader.cancel();
			} catch {}
		}
		parts.push(decoder.decode());
		return {
			text: parts.join(""),
			truncated,
			bytesRead
		};
	}
	try {
		const text = await res.text();
		return {
			text,
			truncated: false,
			bytesRead: text.length
		};
	} catch {
		return {
			text: "",
			truncated: false,
			bytesRead: 0
		};
	}
}
//#endregion
//#region src/agents/tools/web-search-provider-common.ts
const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;
const SEARCH_CACHE_KEY = Symbol.for("openclaw.web-search.cache");
function getSharedSearchCache() {
	const root = globalThis;
	const existing = root[SEARCH_CACHE_KEY];
	if (existing instanceof Map) return existing;
	const next = /* @__PURE__ */ new Map();
	root[SEARCH_CACHE_KEY] = next;
	return next;
}
const SEARCH_CACHE = getSharedSearchCache();
function resolveSearchTimeoutSeconds(searchConfig) {
	return resolveTimeoutSeconds(searchConfig?.timeoutSeconds, 30);
}
function resolveSearchCacheTtlMs(searchConfig) {
	return resolveCacheTtlMs(searchConfig?.cacheTtlMinutes, 15);
}
function resolveSearchCount(value, fallback) {
	const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
	return Math.max(1, Math.min(10, Math.floor(parsed)));
}
function readConfiguredSecretString(value, path) {
	return normalizeSecretInput(normalizeResolvedSecretInputString({
		value,
		path
	})) || void 0;
}
function readProviderEnvValue(envVars) {
	for (const envVar of envVars) {
		const value = normalizeSecretInput(process.env[envVar]);
		if (value) return value;
	}
}
async function withTrustedWebSearchEndpoint(params, run) {
	return withTrustedWebToolsEndpoint({
		url: params.url,
		init: params.init,
		timeoutSeconds: params.timeoutSeconds
	}, async ({ response }) => run(response));
}
async function postTrustedWebToolsJson(params, parseResponse) {
	return withTrustedWebToolsEndpoint({
		url: params.url,
		timeoutSeconds: params.timeoutSeconds,
		init: {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${params.apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(params.body)
		}
	}, async ({ response }) => {
		if (!response.ok) {
			const detail = await readResponseText(response, { maxBytes: params.maxErrorBytes ?? 64e3 });
			throw new Error(`${params.errorLabel} API error (${response.status}): ${detail.text || response.statusText}`);
		}
		return await parseResponse(response);
	});
}
async function throwWebSearchApiError(res, providerLabel) {
	const detail = (await readResponseText(res, { maxBytes: 64e3 })).text;
	throw new Error(`${providerLabel} API error (${res.status}): ${detail || res.statusText}`);
}
function resolveSiteName(url) {
	if (!url) return;
	try {
		return new URL(url).hostname;
	} catch {
		return;
	}
}
const BRAVE_FRESHNESS_SHORTCUTS = new Set([
	"pd",
	"pw",
	"pm",
	"py"
]);
const BRAVE_FRESHNESS_RANGE = /^(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})$/;
const PERPLEXITY_RECENCY_VALUES = new Set([
	"day",
	"week",
	"month",
	"year"
]);
const FRESHNESS_TO_RECENCY = {
	pd: "day",
	pw: "week",
	pm: "month",
	py: "year"
};
const RECENCY_TO_FRESHNESS = {
	day: "pd",
	week: "pw",
	month: "pm",
	year: "py"
};
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PERPLEXITY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
function isValidIsoDate(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isoToPerplexityDate(iso) {
	const match = iso.match(ISO_DATE_PATTERN);
	if (!match) return;
	const [, year, month, day] = match;
	return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
}
function normalizeToIsoDate(value) {
	const trimmed = value.trim();
	if (ISO_DATE_PATTERN.test(trimmed)) return isValidIsoDate(trimmed) ? trimmed : void 0;
	const match = trimmed.match(PERPLEXITY_DATE_PATTERN);
	if (match) {
		const [, month, day, year] = match;
		const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
		return isValidIsoDate(iso) ? iso : void 0;
	}
}
function normalizeFreshness(value, provider) {
	if (!value) return;
	const trimmed = value.trim();
	if (!trimmed) return;
	const lower = trimmed.toLowerCase();
	if (BRAVE_FRESHNESS_SHORTCUTS.has(lower)) return provider === "brave" ? lower : FRESHNESS_TO_RECENCY[lower];
	if (PERPLEXITY_RECENCY_VALUES.has(lower)) return provider === "perplexity" ? lower : RECENCY_TO_FRESHNESS[lower];
	if (provider === "brave") {
		const match = trimmed.match(BRAVE_FRESHNESS_RANGE);
		if (match) {
			const [, start, end] = match;
			if (isValidIsoDate(start) && isValidIsoDate(end) && start <= end) return `${start}to${end}`;
		}
	}
}
function readCachedSearchPayload(cacheKey) {
	const cached = readCache(SEARCH_CACHE, cacheKey);
	return cached ? {
		...cached.value,
		cached: true
	} : void 0;
}
function buildSearchCacheKey(parts) {
	return normalizeCacheKey(parts.map((part) => part === void 0 ? "default" : String(part)).join(":"));
}
function writeCachedSearchPayload(cacheKey, payload, ttlMs) {
	writeCache(SEARCH_CACHE, cacheKey, payload, ttlMs);
}
function readUnsupportedSearchFilter(params) {
	for (const name of [
		"country",
		"language",
		"freshness",
		"date_after",
		"date_before"
	]) {
		const value = params[name];
		if (typeof value === "string" && value.trim()) return name;
	}
}
function describeUnsupportedSearchFilter(name) {
	switch (name) {
		case "country": return "country filtering";
		case "language": return "language filtering";
		case "freshness": return "freshness filtering";
		case "date_after":
		case "date_before": return "date_after/date_before filtering";
	}
}
function buildUnsupportedSearchFilterResponse(params, provider, docs = "https://docs.openclaw.ai/tools/web") {
	const unsupported = readUnsupportedSearchFilter(params);
	if (!unsupported) return;
	const label = describeUnsupportedSearchFilter(unsupported);
	const supportedLabel = unsupported === "date_after" || unsupported === "date_before" ? "date filtering" : label;
	return {
		error: unsupported.startsWith("date_") ? "unsupported_date_filter" : `unsupported_${unsupported}`,
		message: `${label} is not supported by the ${provider} provider. Only Brave and Perplexity support ${supportedLabel}.`,
		docs
	};
}
//#endregion
//#region src/config/legacy-web-search.ts
const GENERIC_WEB_SEARCH_KEYS = new Set([
	"enabled",
	"provider",
	"maxResults",
	"timeoutSeconds",
	"cacheTtlMinutes"
]);
const LEGACY_PROVIDER_MAP = {
	brave: "brave",
	firecrawl: "firecrawl",
	gemini: "google",
	grok: "xai",
	kimi: "moonshot",
	perplexity: "perplexity"
};
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneRecord(value) {
	return { ...value };
}
function ensureRecord(target, key) {
	const current = target[key];
	if (isRecord(current)) return current;
	const next = {};
	target[key] = next;
	return next;
}
function resolveLegacySearchConfig(raw) {
	if (!isRecord(raw)) return;
	const tools = isRecord(raw.tools) ? raw.tools : void 0;
	const web = isRecord(tools?.web) ? tools.web : void 0;
	return isRecord(web?.search) ? web.search : void 0;
}
function copyLegacyProviderConfig(search, providerKey) {
	const current = search[providerKey];
	return isRecord(current) ? cloneRecord(current) : void 0;
}
function hasOwnKey(target, key) {
	return Object.prototype.hasOwnProperty.call(target, key);
}
function hasMappedLegacyWebSearchConfig(raw) {
	const search = resolveLegacySearchConfig(raw);
	if (!search) return false;
	if (hasOwnKey(search, "apiKey")) return true;
	return Object.keys(LEGACY_PROVIDER_MAP).some((providerId) => isRecord(search[providerId]));
}
function migratePluginWebSearchConfig(params) {
	const entry = ensureRecord(ensureRecord(ensureRecord(params.root, "plugins"), "entries"), params.pluginId);
	const config = ensureRecord(entry, "config");
	const hadEnabled = entry.enabled !== void 0;
	const existing = isRecord(config.webSearch) ? cloneRecord(config.webSearch) : void 0;
	if (!hadEnabled) entry.enabled = true;
	if (!existing) {
		config.webSearch = cloneRecord(params.payload);
		params.changes.push(`Moved ${params.legacyPath} → ${params.targetPath}.`);
		return;
	}
	const merged = cloneRecord(existing);
	mergeMissing(merged, params.payload);
	const changed = JSON.stringify(merged) !== JSON.stringify(existing) || !hadEnabled;
	config.webSearch = merged;
	if (changed) {
		params.changes.push(`Merged ${params.legacyPath} → ${params.targetPath} (filled missing fields from legacy; kept explicit plugin config values).`);
		return;
	}
	params.changes.push(`Removed ${params.legacyPath} (${params.targetPath} already set).`);
}
function listLegacyWebSearchConfigPaths(raw) {
	const search = resolveLegacySearchConfig(raw);
	if (!search) return [];
	const paths = [];
	if ("apiKey" in search) paths.push("tools.web.search.apiKey");
	for (const providerId of Object.keys(LEGACY_PROVIDER_MAP)) {
		const scoped = search[providerId];
		if (isRecord(scoped)) for (const key of Object.keys(scoped)) paths.push(`tools.web.search.${providerId}.${key}`);
	}
	return paths;
}
function normalizeLegacyWebSearchConfig(raw) {
	if (!isRecord(raw)) return raw;
	if (!resolveLegacySearchConfig(raw)) return raw;
	return normalizeLegacyWebSearchConfigRecord(raw).config;
}
function migrateLegacyWebSearchConfig(raw) {
	if (!isRecord(raw)) return {
		config: raw,
		changes: []
	};
	if (!hasMappedLegacyWebSearchConfig(raw)) return {
		config: raw,
		changes: []
	};
	return normalizeLegacyWebSearchConfigRecord(raw);
}
function normalizeLegacyWebSearchConfigRecord(raw) {
	const nextRoot = cloneRecord(raw);
	const web = ensureRecord(ensureRecord(nextRoot, "tools"), "web");
	const search = resolveLegacySearchConfig(nextRoot);
	if (!search) return {
		config: raw,
		changes: []
	};
	const nextSearch = {};
	const changes = [];
	for (const [key, value] of Object.entries(search)) {
		if (key === "apiKey") continue;
		if (Object.keys(LEGACY_PROVIDER_MAP).includes(key)) {
			if (isRecord(value)) continue;
		}
		if (GENERIC_WEB_SEARCH_KEYS.has(key) || !isRecord(value)) nextSearch[key] = value;
	}
	web.search = nextSearch;
	const legacyBraveConfig = copyLegacyProviderConfig(search, "brave");
	const braveConfig = legacyBraveConfig ?? {};
	if (hasOwnKey(search, "apiKey")) braveConfig.apiKey = search.apiKey;
	if (Object.keys(braveConfig).length > 0) migratePluginWebSearchConfig({
		root: nextRoot,
		legacyPath: hasOwnKey(search, "apiKey") ? "tools.web.search.apiKey" : "tools.web.search.brave",
		targetPath: hasOwnKey(search, "apiKey") && !legacyBraveConfig ? "plugins.entries.brave.config.webSearch.apiKey" : "plugins.entries.brave.config.webSearch",
		pluginId: LEGACY_PROVIDER_MAP.brave,
		payload: braveConfig,
		changes
	});
	for (const providerId of [
		"firecrawl",
		"gemini",
		"grok",
		"kimi",
		"perplexity"
	]) {
		const scoped = copyLegacyProviderConfig(search, providerId);
		if (!scoped || Object.keys(scoped).length === 0) continue;
		migratePluginWebSearchConfig({
			root: nextRoot,
			legacyPath: `tools.web.search.${providerId}`,
			targetPath: `plugins.entries.${LEGACY_PROVIDER_MAP[providerId]}.config.webSearch`,
			pluginId: LEGACY_PROVIDER_MAP[providerId],
			payload: scoped,
			changes
		});
	}
	return {
		config: nextRoot,
		changes
	};
}
function resolvePluginWebSearchConfig(config, pluginId) {
	const pluginConfig = config?.plugins?.entries?.[pluginId]?.config;
	if (!isRecord(pluginConfig)) return;
	const webSearch = pluginConfig.webSearch;
	return isRecord(webSearch) ? webSearch : void 0;
}
//#endregion
//#region src/agents/tools/web-search-provider-config.ts
function getTopLevelCredentialValue(searchConfig) {
	return searchConfig?.apiKey;
}
function setTopLevelCredentialValue(searchConfigTarget, value) {
	searchConfigTarget.apiKey = value;
}
function getScopedCredentialValue(searchConfig, key) {
	const scoped = searchConfig?.[key];
	if (!scoped || typeof scoped !== "object" || Array.isArray(scoped)) return;
	return scoped.apiKey;
}
function setScopedCredentialValue(searchConfigTarget, key, value) {
	const scoped = searchConfigTarget[key];
	if (!scoped || typeof scoped !== "object" || Array.isArray(scoped)) {
		searchConfigTarget[key] = { apiKey: value };
		return;
	}
	scoped.apiKey = value;
}
function mergeScopedSearchConfig(searchConfig, key, pluginConfig, options) {
	if (!pluginConfig) return searchConfig;
	const currentScoped = searchConfig?.[key] && typeof searchConfig[key] === "object" && !Array.isArray(searchConfig[key]) ? searchConfig[key] : {};
	const next = {
		...searchConfig,
		[key]: {
			...currentScoped,
			...pluginConfig
		}
	};
	if (options?.mirrorApiKeyToTopLevel && pluginConfig.apiKey !== void 0) next.apiKey = pluginConfig.apiKey;
	return next;
}
function resolveProviderWebSearchPluginConfig(config, pluginId) {
	return resolvePluginWebSearchConfig(config, pluginId);
}
function ensureObject(target, key) {
	const current = target[key];
	if (current && typeof current === "object" && !Array.isArray(current)) return current;
	const next = {};
	target[key] = next;
	return next;
}
function setProviderWebSearchPluginConfigValue(configTarget, pluginId, key, value) {
	const entry = ensureObject(ensureObject(ensureObject(configTarget, "plugins"), "entries"), pluginId);
	if (entry.enabled === void 0) entry.enabled = true;
	const webSearch = ensureObject(ensureObject(entry, "config"), "webSearch");
	webSearch[key] = value;
}
//#endregion
//#region src/agents/tools/web-search-provider-credentials.ts
function resolveWebSearchProviderCredential(params) {
	const fromConfig = normalizeSecretInput(normalizeResolvedSecretInputString({
		value: params.credentialValue,
		path: params.path
	}));
	if (fromConfig) return fromConfig;
	for (const envVar of params.envVars) {
		const fromEnv = normalizeSecretInput(process.env[envVar]);
		if (fromEnv) return fromEnv;
	}
}
//#endregion
//#region src/config/plugins-allowlist.ts
function ensurePluginAllowlisted(cfg, pluginId) {
	const allow = cfg.plugins?.allow;
	if (!Array.isArray(allow) || allow.includes(pluginId)) return cfg;
	return {
		...cfg,
		plugins: {
			...cfg.plugins,
			allow: [...allow, pluginId]
		}
	};
}
//#endregion
//#region src/plugins/toggle-config.ts
function setPluginEnabledInConfig(config, pluginId, enabled) {
	const builtInChannelId = normalizeChatChannelId(pluginId);
	const resolvedId = builtInChannelId ?? pluginId;
	const next = {
		...config,
		plugins: {
			...config.plugins,
			entries: {
				...config.plugins?.entries,
				[resolvedId]: {
					...config.plugins?.entries?.[resolvedId],
					enabled
				}
			}
		}
	};
	if (!builtInChannelId) return next;
	const existing = config.channels?.[builtInChannelId];
	const existingRecord = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
	return {
		...next,
		channels: {
			...config.channels,
			[builtInChannelId]: {
				...existingRecord,
				enabled
			}
		}
	};
}
//#endregion
//#region src/plugins/enable.ts
function enablePluginInConfig(cfg, pluginId) {
	const resolvedId = normalizeChatChannelId(pluginId) ?? pluginId;
	if (cfg.plugins?.enabled === false) return {
		config: cfg,
		enabled: false,
		reason: "plugins disabled"
	};
	if (cfg.plugins?.deny?.includes(pluginId) || cfg.plugins?.deny?.includes(resolvedId)) return {
		config: cfg,
		enabled: false,
		reason: "blocked by denylist"
	};
	let next = setPluginEnabledInConfig(cfg, resolvedId, true);
	next = ensurePluginAllowlisted(next, resolvedId);
	return {
		config: next,
		enabled: true
	};
}
//#endregion
//#region src/plugin-sdk/provider-web-search.ts
/**
* @deprecated Implement provider-owned `createTool(...)` directly on the
* returned WebSearchProviderPlugin instead of routing through core.
*/
function createPluginBackedWebSearchProvider(provider) {
	return {
		...provider,
		createTool: () => {
			throw new Error(`createPluginBackedWebSearchProvider(${provider.id}) is no longer supported. Define provider-owned createTool(...) directly in the extension's WebSearchProviderPlugin.`);
		}
	};
}
//#endregion
export { mergeMissing as $, resolveSearchTimeoutSeconds as A, resolveCacheTtlMs as B, normalizeToIsoDate as C, readProviderEnvValue as D, readConfiguredSecretString as E, DEFAULT_CACHE_TTL_MINUTES as F, fetchWithWebToolsNetworkGuard as G, withTimeout as H, DEFAULT_TIMEOUT_SECONDS as I, ensureAgentEntry as J, withStrictWebToolsEndpoint as K, normalizeCacheKey as L, throwWebSearchApiError as M, withTrustedWebSearchEndpoint as N, resolveSearchCacheTtlMs as O, writeCachedSearchPayload as P, mapLegacyAudioTranscription as Q, readCache as R, normalizeFreshness as S, readCachedSearchPayload as T, writeCache as U, resolveTimeoutSeconds as V, resolveCitationRedirectUrl as W, getAgentsList as X, ensureRecord$1 as Y, getRecord as Z, FRESHNESS_TO_RECENCY as _, resolveWebSearchProviderCredential as a, buildUnsupportedSearchFilterResponse as b, mergeScopedSearchConfig as c, setScopedCredentialValue as d, resolveDefaultAgentIdFromRaw as et, setTopLevelCredentialValue as f, DEFAULT_SEARCH_COUNT as g, normalizeLegacyWebSearchConfig as h, ensurePluginAllowlisted as i, resolveSiteName as j, resolveSearchCount as k, resolveProviderWebSearchPluginConfig as l, migrateLegacyWebSearchConfig as m, enablePluginInConfig as n, getScopedCredentialValue as o, listLegacyWebSearchConfigPaths as p, withTrustedWebToolsEndpoint as q, setPluginEnabledInConfig as r, getTopLevelCredentialValue as s, createPluginBackedWebSearchProvider as t, setProviderWebSearchPluginConfigValue as u, MAX_SEARCH_COUNT as v, postTrustedWebToolsJson as w, isoToPerplexityDate as x, buildSearchCacheKey as y, readResponseText as z };
