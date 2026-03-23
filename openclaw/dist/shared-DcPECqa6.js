import { Fc as resolveIMessageAccount, Hx as IMessageConfigSchema, Nc as listIMessageAccountIds, Pc as resolveDefaultIMessageAccountId } from "./auth-profiles-CmO7TMIb.js";
import { r as getChatChannelMeta } from "./registry-COOqBSUM.js";
import { r as buildChannelConfigSchema } from "./config-schema-DjM6jQY2.js";
import { n as createChannelPluginBase } from "./core-Jk74VVNa.js";
import { i as createScopedChannelConfigAdapter, l as formatTrimmedAllowFromEntries, o as createScopedDmSecurityResolver } from "./channel-config-helpers-DEviHTY4.js";
import { p as createAllowlistProviderRestrictSendersWarningCollector } from "./group-policy-warnings-BOCcn5UQ.js";
import { n as createIMessageSetupWizardProxy } from "./setup-core-CwbHXkbT.js";
//#region extensions/imessage/src/shared.ts
const IMESSAGE_CHANNEL = "imessage";
async function loadIMessageChannelRuntime() {
	return await import("./channel.runtime-BEuN6X43.js");
}
const imessageSetupWizard = createIMessageSetupWizardProxy(async () => (await loadIMessageChannelRuntime()).imessageSetupWizard);
const imessageConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: IMESSAGE_CHANNEL,
	listAccountIds: listIMessageAccountIds,
	resolveAccount: (cfg, accountId) => resolveIMessageAccount({
		cfg,
		accountId
	}),
	defaultAccountId: resolveDefaultIMessageAccountId,
	clearBaseFields: [
		"cliPath",
		"dbPath",
		"service",
		"region",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatTrimmedAllowFromEntries(allowFrom),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const imessageResolveDmPolicy = createScopedDmSecurityResolver({
	channelKey: IMESSAGE_CHANNEL,
	resolvePolicy: (account) => account.config.dmPolicy,
	resolveAllowFrom: (account) => account.config.allowFrom,
	policyPathSuffix: "dmPolicy"
});
const collectIMessageSecurityWarnings = createAllowlistProviderRestrictSendersWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.imessage !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "iMessage groups",
	openScope: "any member",
	groupPolicyPath: "channels.imessage.groupPolicy",
	groupAllowFromPath: "channels.imessage.groupAllowFrom",
	mentionGated: false
});
function createIMessagePluginBase(params) {
	return createChannelPluginBase({
		id: IMESSAGE_CHANNEL,
		meta: {
			...getChatChannelMeta(IMESSAGE_CHANNEL),
			aliases: ["imsg"],
			showConfigured: false
		},
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true
		},
		reload: { configPrefixes: ["channels.imessage"] },
		configSchema: buildChannelConfigSchema(IMessageConfigSchema),
		config: {
			...imessageConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.configured
			})
		},
		security: {
			resolveDmPolicy: imessageResolveDmPolicy,
			collectWarnings: collectIMessageSecurityWarnings
		},
		setup: params.setup
	});
}
//#endregion
export { imessageSetupWizard as i, createIMessagePluginBase as n, imessageResolveDmPolicy as r, collectIMessageSecurityWarnings as t };
