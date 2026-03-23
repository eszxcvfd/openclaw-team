import { r as defineChannelPluginEntry } from "./core-Jk74VVNa.js";
import { n as setNextcloudTalkRuntime, t as nextcloudTalkPlugin } from "./channel-DXrw8LAi.js";
//#region extensions/nextcloud-talk/index.ts
var nextcloud_talk_default = defineChannelPluginEntry({
	id: "nextcloud-talk",
	name: "Nextcloud Talk",
	description: "Nextcloud Talk channel plugin",
	plugin: nextcloudTalkPlugin,
	setRuntime: setNextcloudTalkRuntime
});
//#endregion
export { nextcloud_talk_default as t };
