import { r as defineChannelPluginEntry } from "./core-Jk74VVNa.js";
import { t as zaloPlugin } from "./channel-CvniMpr3.js";
import { n as setZaloRuntime } from "./runtime-DZ2wm1uu.js";
//#region extensions/zalo/index.ts
var zalo_default = defineChannelPluginEntry({
	id: "zalo",
	name: "Zalo",
	description: "Zalo channel plugin",
	plugin: zaloPlugin,
	setRuntime: setZaloRuntime
});
//#endregion
export { zalo_default as t };
