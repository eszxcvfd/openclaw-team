import { m as normalizeE164 } from "./utils-DzdaH7JM.js";
import { Fd as resolveDefaultSignalAccountId, Id as resolveSignalAccount, Pd as listSignalAccountIds, Ux as SignalConfigSchema } from "./auth-profiles-CmO7TMIb.js";
import { r as getChatChannelMeta } from "./registry-COOqBSUM.js";
import { r as buildChannelConfigSchema } from "./config-schema-DjM6jQY2.js";
import { n as createChannelPluginBase } from "./core-Jk74VVNa.js";
import { i as createScopedChannelConfigAdapter, o as createScopedDmSecurityResolver } from "./channel-config-helpers-DEviHTY4.js";
import { p as createAllowlistProviderRestrictSendersWarningCollector } from "./group-policy-warnings-BOCcn5UQ.js";
import { n as createSignalSetupWizardProxy } from "./setup-core-DNycJ5Vf.js";
//#region extensions/signal/src/shared.ts
const SIGNAL_CHANNEL = "signal";
async function loadSignalChannelRuntime() {
	return await import("./channel.runtime-CpMI-ckm.js");
}
const signalSetupWizard = createSignalSetupWizardProxy(async () => (await loadSignalChannelRuntime()).signalSetupWizard);
const signalConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: SIGNAL_CHANNEL,
	listAccountIds: listSignalAccountIds,
	resolveAccount: (cfg, accountId) => resolveSignalAccount({
		cfg,
		accountId
	}),
	defaultAccountId: resolveDefaultSignalAccountId,
	clearBaseFields: [
		"account",
		"httpUrl",
		"httpHost",
		"httpPort",
		"cliPath",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean).map((entry) => entry === "*" ? "*" : normalizeE164(entry.replace(/^signal:/i, ""))).filter(Boolean),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const signalResolveDmPolicy = createScopedDmSecurityResolver({
	channelKey: SIGNAL_CHANNEL,
	resolvePolicy: (account) => account.config.dmPolicy,
	resolveAllowFrom: (account) => account.config.allowFrom,
	policyPathSuffix: "dmPolicy",
	normalizeEntry: (raw) => normalizeE164(raw.replace(/^signal:/i, "").trim())
});
const collectSignalSecurityWarnings = createAllowlistProviderRestrictSendersWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.signal !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "Signal groups",
	openScope: "any member",
	groupPolicyPath: "channels.signal.groupPolicy",
	groupAllowFromPath: "channels.signal.groupAllowFrom",
	mentionGated: false
});
function createSignalPluginBase(params) {
	return createChannelPluginBase({
		id: SIGNAL_CHANNEL,
		meta: { ...getChatChannelMeta(SIGNAL_CHANNEL) },
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true,
			reactions: true
		},
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.signal"] },
		configSchema: buildChannelConfigSchema(SignalConfigSchema),
		config: {
			...signalConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.configured,
				baseUrl: account.baseUrl
			})
		},
		security: {
			resolveDmPolicy: signalResolveDmPolicy,
			collectWarnings: collectSignalSecurityWarnings
		},
		setup: params.setup
	});
}
//#endregion
export { signalSetupWizard as a, signalResolveDmPolicy as i, createSignalPluginBase as n, signalConfigAdapter as r, collectSignalSecurityWarnings as t };
