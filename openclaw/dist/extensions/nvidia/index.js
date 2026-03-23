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
import { t as buildNvidiaProvider } from "../../provider-catalog-RdiC-BoB.js";
import { n as buildSingleProviderApiKeyCatalog } from "../../provider-catalog-BtTgxxUM.js";
//#region extensions/nvidia/index.ts
const PROVIDER_ID = "nvidia";
var nvidia_default = definePluginEntry({
	id: PROVIDER_ID,
	name: "NVIDIA Provider",
	description: "Bundled NVIDIA provider plugin",
	register(api) {
		api.registerProvider({
			id: PROVIDER_ID,
			label: "NVIDIA",
			docsPath: "/providers/nvidia",
			envVars: ["NVIDIA_API_KEY"],
			auth: [],
			catalog: {
				order: "simple",
				run: (ctx) => buildSingleProviderApiKeyCatalog({
					ctx,
					providerId: PROVIDER_ID,
					buildProvider: buildNvidiaProvider
				})
			}
		});
	}
});
//#endregion
export { nvidia_default as default };
