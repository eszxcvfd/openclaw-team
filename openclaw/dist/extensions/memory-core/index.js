import "../../logger-BG-0yWA-.js";
import "../../paths-GHJ97ebE.js";
import "../../theme-CWrxY1-_.js";
import "../../globals-Ca-8xJiD.js";
import "../../subsystem-YgTuVQVh.js";
import "../../ansi-cwY8Vrne.js";
import "../../utils-DzdaH7JM.js";
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
//#region extensions/memory-core/index.ts
var memory_core_default = definePluginEntry({
	id: "memory-core",
	name: "Memory (Core)",
	description: "File-backed memory search tools and CLI",
	kind: "memory",
	register(api) {
		api.registerTool((ctx) => {
			const memorySearchTool = api.runtime.tools.createMemorySearchTool({
				config: ctx.config,
				agentSessionKey: ctx.sessionKey
			});
			const memoryGetTool = api.runtime.tools.createMemoryGetTool({
				config: ctx.config,
				agentSessionKey: ctx.sessionKey
			});
			if (!memorySearchTool || !memoryGetTool) return null;
			return [memorySearchTool, memoryGetTool];
		}, { names: ["memory_search", "memory_get"] });
		api.registerCli(({ program }) => {
			api.runtime.tools.registerMemoryCli(program);
		}, { commands: ["memory"] });
	}
});
//#endregion
export { memory_core_default as default };
