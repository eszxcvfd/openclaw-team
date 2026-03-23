import { a as defineSetupPluginEntry } from "./core-Jk74VVNa.js";
import { r as discordSetupAdapter } from "./setup-core-B3EaVXb-.js";
import { t as createDiscordPluginBase } from "./shared-Cd-30EzH.js";
//#region extensions/discord/src/channel.setup.ts
const discordSetupPlugin = { ...createDiscordPluginBase({ setup: discordSetupAdapter }) };
//#endregion
//#region extensions/discord/setup-entry.ts
var setup_entry_default = defineSetupPluginEntry(discordSetupPlugin);
//#endregion
export { discordSetupPlugin as n, setup_entry_default as t };
