import { a as parseOpenClawManifestInstallBase, c as resolveOpenClawManifestOs, d as evaluateRuntimeEligibility, f as hasBinary, i as parseFrontmatterBool, l as resolveOpenClawManifestRequires, n as getFrontmatterString, o as resolveOpenClawManifestBlock, p as isConfigPathTruthyWithDefaults, r as normalizeStringList, s as resolveOpenClawManifestInstall, t as applyOpenClawManifestInstallCommonFields, u as parseFrontmatterBlock } from "./frontmatter-Bl8CxKAq.js";
//#region src/hooks/frontmatter.ts
function parseFrontmatter(content) {
	return parseFrontmatterBlock(content);
}
function parseInstallSpec(input) {
	const parsed = parseOpenClawManifestInstallBase(input, [
		"bundled",
		"npm",
		"git"
	]);
	if (!parsed) return;
	const { raw } = parsed;
	const spec = applyOpenClawManifestInstallCommonFields({ kind: parsed.kind }, parsed);
	if (typeof raw.package === "string") spec.package = raw.package;
	if (typeof raw.repository === "string") spec.repository = raw.repository;
	return spec;
}
function resolveOpenClawMetadata(frontmatter) {
	const metadataObj = resolveOpenClawManifestBlock({ frontmatter });
	if (!metadataObj) return;
	const requires = resolveOpenClawManifestRequires(metadataObj);
	const install = resolveOpenClawManifestInstall(metadataObj, parseInstallSpec);
	const osRaw = resolveOpenClawManifestOs(metadataObj);
	const eventsRaw = normalizeStringList(metadataObj.events);
	return {
		always: typeof metadataObj.always === "boolean" ? metadataObj.always : void 0,
		emoji: typeof metadataObj.emoji === "string" ? metadataObj.emoji : void 0,
		homepage: typeof metadataObj.homepage === "string" ? metadataObj.homepage : void 0,
		hookKey: typeof metadataObj.hookKey === "string" ? metadataObj.hookKey : void 0,
		export: typeof metadataObj.export === "string" ? metadataObj.export : void 0,
		os: osRaw.length > 0 ? osRaw : void 0,
		events: eventsRaw.length > 0 ? eventsRaw : [],
		requires,
		install: install.length > 0 ? install : void 0
	};
}
function resolveHookInvocationPolicy(frontmatter) {
	return { enabled: parseFrontmatterBool(getFrontmatterString(frontmatter, "enabled"), true) };
}
function resolveHookKey(hookName, entry) {
	return entry?.metadata?.hookKey ?? hookName;
}
//#endregion
//#region src/hooks/config.ts
const DEFAULT_CONFIG_VALUES = {
	"browser.enabled": true,
	"browser.evaluateEnabled": true,
	"workspace.dir": true
};
function isConfigPathTruthy(config, pathStr) {
	return isConfigPathTruthyWithDefaults(config, pathStr, DEFAULT_CONFIG_VALUES);
}
function resolveHookConfig(config, hookKey) {
	const hooks = config?.hooks?.internal?.entries;
	if (!hooks || typeof hooks !== "object") return;
	const entry = hooks[hookKey];
	if (!entry || typeof entry !== "object") return;
	return entry;
}
function evaluateHookRuntimeEligibility(params) {
	const { entry, config, hookConfig, eligibility } = params;
	const remote = eligibility?.remote;
	return evaluateRuntimeEligibility({
		os: entry.metadata?.os,
		remotePlatforms: remote?.platforms,
		always: entry.metadata?.always,
		requires: entry.metadata?.requires,
		hasRemoteBin: remote?.hasBin,
		hasAnyRemoteBin: remote?.hasAnyBin,
		hasBin: hasBinary,
		hasEnv: (envName) => Boolean(process.env[envName] || hookConfig?.env?.[envName]),
		isConfigPathTruthy: (configPath) => isConfigPathTruthy(config, configPath)
	});
}
function shouldIncludeHook(params) {
	const { entry, config, eligibility } = params;
	const hookConfig = resolveHookConfig(config, resolveHookKey(entry.hook.name, entry));
	if (!(entry.hook.source === "openclaw-plugin") && hookConfig?.enabled === false) return false;
	return evaluateHookRuntimeEligibility({
		entry,
		config,
		hookConfig,
		eligibility
	});
}
//#endregion
export { resolveHookInvocationPolicy as a, parseFrontmatter as i, resolveHookConfig as n, resolveOpenClawMetadata as o, shouldIncludeHook as r, isConfigPathTruthy as t };
