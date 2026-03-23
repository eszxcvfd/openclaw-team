import { r as defineChannelPluginEntry } from "./core-Jk74VVNa.js";
import { n as setIrcRuntime, t as ircPlugin } from "./channel-N8e0ijTD.js";
//#region extensions/irc/index.ts
var irc_default = defineChannelPluginEntry({
	id: "irc",
	name: "IRC",
	description: "IRC channel plugin",
	plugin: ircPlugin,
	setRuntime: setIrcRuntime
});
//#endregion
export { irc_default as t };
