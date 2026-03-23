import "../../logger-BG-0yWA-.js";
import "../../paths-GHJ97ebE.js";
import "../../theme-CWrxY1-_.js";
import "../../globals-Ca-8xJiD.js";
import "../../subsystem-YgTuVQVh.js";
import "../../ansi-cwY8Vrne.js";
import "../../utils-DzdaH7JM.js";
import "../../model-selection-BXQGwwqy.js";
import "../../boundary-path-BVHzCDEE.js";
import "../../boundary-file-read-1knRHcS0.js";
import "../../logger-CSnzpOlU.js";
import "../../exec-vhyLuPtA.js";
import "../../workspace-OTiuBtkV.js";
import "../../agent-scope-VMfvxKRt.js";
import "../../registry-COOqBSUM.js";
import "../../base-session-key-C3_WT8uY.js";
import "../../delegate-CQC_bau0.js";
import "../../config-schema-DjM6jQY2.js";
import "../../typebox-DtQbaL9E.js";
import "../../secret-file-D3nATjkM.js";
import { i as definePluginEntry } from "../../core-Jk74VVNa.js";
import { et as resolveOllamaApiBase, tt as OLLAMA_DEFAULT_BASE_URL } from "../../provider-models-C0j4qkh4.js";
import "../../kilocode-shared-piT8G4er.js";
import "../../provider-model-allowlist-qqdE1eKD.js";
//#region extensions/ollama/index.ts
const PROVIDER_ID = "ollama";
const DEFAULT_API_KEY = "ollama-local";
async function loadProviderSetup() {
	return await import("../../plugin-sdk/ollama-setup.js");
}
var ollama_default = definePluginEntry({
	id: "ollama",
	name: "Ollama Provider",
	description: "Bundled Ollama provider plugin",
	register(api) {
		api.registerProvider({
			id: PROVIDER_ID,
			label: "Ollama",
			docsPath: "/providers/ollama",
			envVars: ["OLLAMA_API_KEY"],
			auth: [{
				id: "local",
				label: "Ollama",
				hint: "Cloud and local open models",
				kind: "custom",
				run: async (ctx) => {
					const result = await (await loadProviderSetup()).promptAndConfigureOllama({
						cfg: ctx.config,
						prompter: ctx.prompter
					});
					return {
						profiles: [{
							profileId: "ollama:default",
							credential: {
								type: "api_key",
								provider: PROVIDER_ID,
								key: DEFAULT_API_KEY
							}
						}],
						configPatch: result.config
					};
				},
				runNonInteractive: async (ctx) => {
					return await (await loadProviderSetup()).configureOllamaNonInteractive({
						nextConfig: ctx.config,
						opts: ctx.opts,
						runtime: ctx.runtime
					});
				}
			}],
			discovery: {
				order: "late",
				run: async (ctx) => {
					const explicit = ctx.config.models?.providers?.ollama;
					const hasExplicitModels = Array.isArray(explicit?.models) && explicit.models.length > 0;
					const ollamaKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
					if (hasExplicitModels && explicit) return { provider: {
						...explicit,
						baseUrl: typeof explicit.baseUrl === "string" && explicit.baseUrl.trim() ? resolveOllamaApiBase(explicit.baseUrl) : OLLAMA_DEFAULT_BASE_URL,
						api: explicit.api ?? "ollama",
						apiKey: ollamaKey ?? explicit.apiKey ?? DEFAULT_API_KEY
					} };
					const provider = await (await loadProviderSetup()).buildOllamaProvider(explicit?.baseUrl, { quiet: !ollamaKey && !explicit });
					if (provider.models.length === 0 && !ollamaKey && !explicit?.apiKey) return null;
					return { provider: {
						...provider,
						apiKey: ollamaKey ?? explicit?.apiKey ?? DEFAULT_API_KEY
					} };
				}
			},
			wizard: {
				setup: {
					choiceId: "ollama",
					choiceLabel: "Ollama",
					choiceHint: "Cloud and local open models",
					groupId: "ollama",
					groupLabel: "Ollama",
					groupHint: "Cloud and local open models",
					methodId: "local"
				},
				modelPicker: {
					label: "Ollama (custom)",
					hint: "Detect models from a local or remote Ollama instance",
					methodId: "local"
				}
			},
			onModelSelected: async ({ config, model, prompter }) => {
				if (!model.startsWith("ollama/")) return;
				await (await loadProviderSetup()).ensureOllamaModelPulled({
					config,
					model,
					prompter
				});
			}
		});
	}
});
//#endregion
export { ollama_default as default };
