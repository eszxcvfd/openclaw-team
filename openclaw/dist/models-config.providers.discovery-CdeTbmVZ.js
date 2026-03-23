import { _ as resolveStateDir } from "./paths-GHJ97ebE.js";
import { t as createSubsystemLogger } from "./subsystem-YgTuVQVh.js";
import { y as resolveUserPath } from "./utils-DzdaH7JM.js";
import { t as DEFAULT_AGENT_ID } from "./session-key-CPq9Fbcf.js";
import { $ as isReasoningModelHeuristic, E as discoverVeniceModels, G as buildHuggingfaceModelDefinition, H as discoverKilocodeModels, J as OLLAMA_DEFAULT_COST, K as discoverHuggingfaceModels, S as VENICE_BASE_URL, U as HUGGINGFACE_BASE_URL, W as HUGGINGFACE_MODEL_CATALOG, Y as OLLAMA_DEFAULT_MAX_TOKENS, Z as enrichOllamaModelsWithContext, d as VLLM_PROVIDER_LABEL, et as resolveOllamaApiBase, n as VERCEL_AI_GATEWAY_BASE_URL, r as discoverVercelAiGatewayModels, s as SGLANG_PROVIDER_LABEL } from "./provider-models-C0j4qkh4.js";
import { c as KILOCODE_MODEL_CATALOG, r as KILOCODE_DEFAULT_COST, t as KILOCODE_BASE_URL } from "./kilocode-shared-piT8G4er.js";
import { n as saveJsonFile } from "./json-file-BAMAAlrD.js";
import fs, { readFileSync } from "node:fs";
import path from "node:path";
import fs$1 from "node:fs/promises";
//#region src/agents/auth-profiles/constants.ts
const AUTH_PROFILE_FILENAME = "auth-profiles.json";
const LEGACY_AUTH_FILENAME = "auth.json";
const CLAUDE_CLI_PROFILE_ID = "anthropic:claude-cli";
const CODEX_CLI_PROFILE_ID = "openai-codex:codex-cli";
const QWEN_CLI_PROFILE_ID = "qwen-portal:qwen-cli";
const MINIMAX_CLI_PROFILE_ID = "minimax-portal:minimax-cli";
const AUTH_STORE_LOCK_OPTIONS = {
	retries: {
		retries: 10,
		factor: 2,
		minTimeout: 100,
		maxTimeout: 1e4,
		randomize: true
	},
	stale: 3e4
};
const EXTERNAL_CLI_SYNC_TTL_MS = 900 * 1e3;
const log$1 = createSubsystemLogger("agents/auth-profiles");
//#endregion
//#region src/agents/agent-paths.ts
function resolveOpenClawAgentDir(env = process.env) {
	const override = env.OPENCLAW_AGENT_DIR?.trim() || env.PI_CODING_AGENT_DIR?.trim();
	if (override) return resolveUserPath(override, env);
	return resolveUserPath(path.join(resolveStateDir(env), "agents", DEFAULT_AGENT_ID, "agent"), env);
}
//#endregion
//#region extensions/kilocode/provider-catalog.ts
function buildKilocodeProvider() {
	return {
		baseUrl: KILOCODE_BASE_URL,
		api: "openai-completions",
		models: KILOCODE_MODEL_CATALOG.map((model) => ({
			id: model.id,
			name: model.name,
			reasoning: model.reasoning,
			input: model.input,
			cost: KILOCODE_DEFAULT_COST,
			contextWindow: model.contextWindow ?? 1e6,
			maxTokens: model.maxTokens ?? 128e3
		}))
	};
}
async function buildKilocodeProviderWithDiscovery() {
	return {
		baseUrl: KILOCODE_BASE_URL,
		api: "openai-completions",
		models: await discoverKilocodeModels()
	};
}
//#endregion
//#region src/infra/wsl.ts
let wslCached = null;
function resetWSLStateForTests() {
	wslCached = null;
}
function isWSLEnv() {
	if (process.env.WSL_INTEROP || process.env.WSL_DISTRO_NAME || process.env.WSLENV) return true;
	return false;
}
/**
* Synchronously check if running in WSL.
* Checks env vars first, then /proc/version.
*/
function isWSLSync() {
	if (process.platform !== "linux") return false;
	if (isWSLEnv()) return true;
	try {
		const release = readFileSync("/proc/version", "utf8").toLowerCase();
		return release.includes("microsoft") || release.includes("wsl");
	} catch {
		return false;
	}
}
/**
* Synchronously check if running in WSL2.
*/
function isWSL2Sync() {
	if (!isWSLSync()) return false;
	try {
		const version = readFileSync("/proc/version", "utf8").toLowerCase();
		return version.includes("wsl2") || version.includes("microsoft-standard");
	} catch {
		return false;
	}
}
async function isWSL() {
	if (wslCached !== null) return wslCached;
	if (process.platform !== "linux") {
		wslCached = false;
		return wslCached;
	}
	if (isWSLEnv()) {
		wslCached = true;
		return wslCached;
	}
	try {
		const release = await fs$1.readFile("/proc/sys/kernel/osrelease", "utf8");
		wslCached = release.toLowerCase().includes("microsoft") || release.toLowerCase().includes("wsl");
	} catch {
		wslCached = false;
	}
	return wslCached;
}
//#endregion
//#region src/agents/auth-profiles/paths.ts
function resolveAuthStorePath(agentDir) {
	const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
	return path.join(resolved, AUTH_PROFILE_FILENAME);
}
function resolveLegacyAuthStorePath(agentDir) {
	const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
	return path.join(resolved, LEGACY_AUTH_FILENAME);
}
function resolveAuthStorePathForDisplay(agentDir) {
	const pathname = resolveAuthStorePath(agentDir);
	return pathname.startsWith("~") ? pathname : resolveUserPath(pathname);
}
function ensureAuthStoreFile(pathname) {
	if (fs.existsSync(pathname)) return;
	saveJsonFile(pathname, {
		version: 1,
		profiles: {}
	});
}
//#endregion
//#region src/agents/self-hosted-provider-defaults.ts
const SELF_HOSTED_DEFAULT_CONTEXT_WINDOW = 128e3;
const SELF_HOSTED_DEFAULT_MAX_TOKENS = 8192;
const SELF_HOSTED_DEFAULT_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
//#endregion
//#region extensions/huggingface/provider-catalog.ts
async function buildHuggingfaceProvider(discoveryApiKey) {
	const resolvedSecret = discoveryApiKey?.trim() ?? "";
	return {
		baseUrl: HUGGINGFACE_BASE_URL,
		api: "openai-completions",
		models: resolvedSecret !== "" ? await discoverHuggingfaceModels(resolvedSecret) : HUGGINGFACE_MODEL_CATALOG.map(buildHuggingfaceModelDefinition)
	};
}
//#endregion
//#region extensions/venice/provider-catalog.ts
async function buildVeniceProvider() {
	return {
		baseUrl: VENICE_BASE_URL,
		api: "openai-completions",
		models: await discoverVeniceModels()
	};
}
//#endregion
//#region extensions/vercel-ai-gateway/provider-catalog.ts
async function buildVercelAiGatewayProvider() {
	return {
		baseUrl: VERCEL_AI_GATEWAY_BASE_URL,
		api: "anthropic-messages",
		models: await discoverVercelAiGatewayModels()
	};
}
//#endregion
//#region src/agents/models-config.providers.discovery.ts
const log = createSubsystemLogger("agents/model-providers");
const OLLAMA_SHOW_CONCURRENCY = 8;
const OLLAMA_SHOW_MAX_MODELS = 200;
async function discoverOllamaModels(baseUrl, opts) {
	if (process.env.VITEST || false) return [];
	try {
		const apiBase = resolveOllamaApiBase(baseUrl);
		const response = await fetch(`${apiBase}/api/tags`, { signal: AbortSignal.timeout(5e3) });
		if (!response.ok) {
			if (!opts?.quiet) log.warn(`Failed to discover Ollama models: ${response.status}`);
			return [];
		}
		const data = await response.json();
		if (!data.models || data.models.length === 0) {
			log.debug("No Ollama models found on local instance");
			return [];
		}
		const modelsToInspect = data.models.slice(0, OLLAMA_SHOW_MAX_MODELS);
		if (modelsToInspect.length < data.models.length && !opts?.quiet) log.warn(`Capping Ollama /api/show inspection to ${OLLAMA_SHOW_MAX_MODELS} models (received ${data.models.length})`);
		return (await enrichOllamaModelsWithContext(apiBase, modelsToInspect, { concurrency: OLLAMA_SHOW_CONCURRENCY })).map((model) => ({
			id: model.name,
			name: model.name,
			reasoning: isReasoningModelHeuristic(model.name),
			input: ["text"],
			cost: OLLAMA_DEFAULT_COST,
			contextWindow: model.contextWindow ?? 128e3,
			maxTokens: OLLAMA_DEFAULT_MAX_TOKENS
		}));
	} catch (error) {
		if (!opts?.quiet) log.warn(`Failed to discover Ollama models: ${String(error)}`);
		return [];
	}
}
async function discoverOpenAICompatibleLocalModels(params) {
	if (process.env.VITEST || false) return [];
	const url = `${params.baseUrl.trim().replace(/\/+$/, "")}/models`;
	try {
		const trimmedApiKey = params.apiKey?.trim();
		const response = await fetch(url, {
			headers: trimmedApiKey ? { Authorization: `Bearer ${trimmedApiKey}` } : void 0,
			signal: AbortSignal.timeout(5e3)
		});
		if (!response.ok) {
			log.warn(`Failed to discover ${params.label} models: ${response.status}`);
			return [];
		}
		const models = (await response.json()).data ?? [];
		if (models.length === 0) {
			log.warn(`No ${params.label} models found on local instance`);
			return [];
		}
		return models.map((model) => ({ id: typeof model.id === "string" ? model.id.trim() : "" })).filter((model) => Boolean(model.id)).map((model) => {
			const modelId = model.id;
			return {
				id: modelId,
				name: modelId,
				reasoning: isReasoningModelHeuristic(modelId),
				input: ["text"],
				cost: SELF_HOSTED_DEFAULT_COST,
				contextWindow: params.contextWindow ?? 128e3,
				maxTokens: params.maxTokens ?? 8192
			};
		});
	} catch (error) {
		log.warn(`Failed to discover ${params.label} models: ${String(error)}`);
		return [];
	}
}
async function buildOllamaProvider(configuredBaseUrl, opts) {
	const models = await discoverOllamaModels(configuredBaseUrl, opts);
	return {
		baseUrl: resolveOllamaApiBase(configuredBaseUrl),
		api: "ollama",
		models
	};
}
async function buildVllmProvider(params) {
	const baseUrl = (params?.baseUrl?.trim() || "http://127.0.0.1:8000/v1").replace(/\/+$/, "");
	return {
		baseUrl,
		api: "openai-completions",
		models: await discoverOpenAICompatibleLocalModels({
			baseUrl,
			apiKey: params?.apiKey,
			label: VLLM_PROVIDER_LABEL
		})
	};
}
async function buildSglangProvider(params) {
	const baseUrl = (params?.baseUrl?.trim() || "http://127.0.0.1:30000/v1").replace(/\/+$/, "");
	return {
		baseUrl,
		api: "openai-completions",
		models: await discoverOpenAICompatibleLocalModels({
			baseUrl,
			apiKey: params?.apiKey,
			label: SGLANG_PROVIDER_LABEL
		})
	};
}
//#endregion
export { CLAUDE_CLI_PROFILE_ID as C, QWEN_CLI_PROFILE_ID as D, MINIMAX_CLI_PROFILE_ID as E, log$1 as O, AUTH_STORE_LOCK_OPTIONS as S, EXTERNAL_CLI_SYNC_TTL_MS as T, isWSLSync as _, buildVeniceProvider as a, buildKilocodeProviderWithDiscovery as b, SELF_HOSTED_DEFAULT_COST as c, resolveAuthStorePath as d, resolveAuthStorePathForDisplay as f, isWSLEnv as g, isWSL2Sync as h, buildVercelAiGatewayProvider as i, SELF_HOSTED_DEFAULT_MAX_TOKENS as l, isWSL as m, buildSglangProvider as n, buildHuggingfaceProvider as o, resolveLegacyAuthStorePath as p, buildVllmProvider as r, SELF_HOSTED_DEFAULT_CONTEXT_WINDOW as s, buildOllamaProvider as t, ensureAuthStoreFile as u, resetWSLStateForTests as v, CODEX_CLI_PROFILE_ID as w, resolveOpenClawAgentDir as x, buildKilocodeProvider as y };
