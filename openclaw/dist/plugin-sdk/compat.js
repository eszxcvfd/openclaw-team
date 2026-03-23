import "../logger-BG-0yWA-.js";
import "../paths-GHJ97ebE.js";
import "../theme-CWrxY1-_.js";
import "../globals-Ca-8xJiD.js";
import "../subsystem-YgTuVQVh.js";
import "../ansi-cwY8Vrne.js";
import "../utils-DzdaH7JM.js";
import "../boundary-path-BVHzCDEE.js";
import "../boundary-file-read-1knRHcS0.js";
import "../logger-CSnzpOlU.js";
import "../exec-vhyLuPtA.js";
import "../workspace-OTiuBtkV.js";
import "../agent-scope-VMfvxKRt.js";
import "../registry-COOqBSUM.js";
import { t as emptyPluginConfigSchema } from "../config-schema-CBb6FHTF.js";
import { t as delegateCompactionToRuntime } from "../delegate-CQC_bau0.js";
import { f as GroupPolicySchema, i as buildNestedDmConfigSchema, l as DmPolicySchema, n as buildCatchallMultiAccountChannelSchema, r as buildChannelConfigSchema, t as AllowFromListSchema, v as MarkdownConfigSchema } from "../config-schema-DjM6jQY2.js";
import { t as buildAccountScopedDmSecurityPolicy } from "../helpers-BMDcpmwL.js";
import "../message-channel-BJH5Ixzm.js";
import { o as ToolPolicySchema } from "../zod-schema.agent-runtime-cWX_tx9u.js";
import "../shared-BAbGaRi2.js";
import { r as onDiagnosticEvent } from "../diagnostic-events-C6Dqngbv.js";
import { a as mapAllowlistResolutionInputs, n as formatNormalizedAllowFromEntries, t as formatAllowFromLowercase } from "../allow-from-DjJFBgUq.js";
import "../runtime-B5E7_GSf.js";
import "../registry-dNL0jg8o.js";
import "../plugins-BRqYQTJ6.js";
import { i as resolveToolsBySender, n as resolveChannelGroupRequireMention, r as resolveChannelGroupToolsPolicy } from "../channel-policy-CG3Bx5_n.js";
import { t as KeyedAsyncQueue } from "../keyed-async-queue-DbHCqXjF.js";
import { a as createScopedChannelConfigBase, c as createTopLevelChannelConfigBase, d as mapAllowFromEntries, i as createScopedChannelConfigAdapter, n as createHybridChannelConfigBase, o as createScopedDmSecurityResolver, r as createScopedAccountConfigAccessors, s as createTopLevelChannelConfigAdapter, t as createHybridChannelConfigAdapter } from "../channel-config-helpers-DEviHTY4.js";
import { _ as createOpenProviderConfiguredRouteWarningCollector, a as collectAllowlistProviderRestrictSendersWarnings, c as collectOpenGroupPolicyRouteAllowlistWarnings, d as createAllowlistProviderGroupPolicyWarningCollector, f as createAllowlistProviderOpenWarningCollector, g as createOpenGroupPolicyRestrictSendersWarningCollector, h as createConditionalWarningCollector, i as collectAllowlistProviderGroupPolicyWarnings, l as collectOpenProviderGroupPolicyWarnings, m as createAllowlistProviderRouteAllowlistWarningCollector, n as buildOpenGroupPolicyRestrictSendersWarning, p as createAllowlistProviderRestrictSendersWarningCollector, r as buildOpenGroupPolicyWarning, s as collectOpenGroupPolicyRestrictSendersWarnings, t as buildOpenGroupPolicyConfigureRouteAllowlistWarning, u as composeWarningCollectors, v as createOpenProviderGroupPolicyWarningCollector, y as projectWarningCollector } from "../group-policy-warnings-BOCcn5UQ.js";
import "../file-lock-CEjqTp7W.js";
import { _ as createRuntimeDirectoryLiveAdapter, a as listDirectoryGroupEntriesFromMapKeysAndAllowFrom, c as listInspectedDirectoryEntriesFromSources, d as listResolvedDirectoryUserEntriesFromAllowFrom, f as toDirectoryEntries, g as nullChannelDirectorySelf, h as emptyChannelDirectoryList, i as listDirectoryGroupEntriesFromMapKeys, l as listResolvedDirectoryEntriesFromSources, m as createEmptyChannelDirectoryAdapter, n as collectNormalizedDirectoryIds, o as listDirectoryUserEntriesFromAllowFrom, p as createChannelDirectoryAdapter, r as listDirectoryEntriesFromSources, s as listDirectoryUserEntriesFromAllowFromAndMapKeys, t as applyDirectoryQueryAndLimit, u as listResolvedDirectoryGroupEntriesFromMapKeys } from "../directory-runtime-DjKjbEt4.js";
import { a as buildPendingHistoryContextFromMap, c as evictOldHistoryKeys, i as buildHistoryContextFromMap, l as recordPendingHistoryEntry, n as buildHistoryContext, o as clearHistoryEntries, r as buildHistoryContextFromEntries, s as clearHistoryEntriesIfEnabled, t as DEFAULT_GROUP_HISTORY_LIMIT, u as recordPendingHistoryEntryIfEnabled } from "../reply-history-DDAjCWma.js";
import { n as readStoreAllowFromForDmPolicy, o as resolveDmGroupAccessWithLists, s as resolveEffectiveAllowFromLists, t as DM_GROUP_ACCESS_REASON, w as resolveControlCommandGate } from "../dm-policy-shared-DojYgkLF.js";
import "../json-store-DC4nEtgW.js";
import { t as inspectReadOnlyChannelAccount } from "../read-only-account-inspect-CalC0cn1.js";
import { t as createAccountStatusSink } from "../channel-lifecycle-eVCvz69a.js";
import { t as createPluginRuntimeStore } from "../runtime-store-CfVg5W_s.js";
import "../channel-config-schema-rluN2Uet.js";
import { n as resolveBlueBubblesGroupRequireMention, r as resolveBlueBubblesGroupToolPolicy, t as collectBlueBubblesStatusIssues } from "../bluebubbles-BfsKcEro.js";
//#region src/plugin-sdk/compat.ts
if (process.env.VITEST !== "true" && process.env.OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING !== "1") process.emitWarning("openclaw/plugin-sdk/compat is deprecated for new plugins. Migrate to focused openclaw/plugin-sdk/<subpath> imports. See https://docs.openclaw.ai/plugins/sdk-migration", {
	code: "OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED",
	detail: "Bundled plugins must use scoped plugin-sdk subpaths. External plugins may keep compat temporarily while migrating. Migration guide: https://docs.openclaw.ai/plugins/sdk-migration"
});
//#endregion
export { AllowFromListSchema, DEFAULT_GROUP_HISTORY_LIMIT, DM_GROUP_ACCESS_REASON, DmPolicySchema, GroupPolicySchema, KeyedAsyncQueue, MarkdownConfigSchema, ToolPolicySchema, applyDirectoryQueryAndLimit, buildAccountScopedDmSecurityPolicy, buildCatchallMultiAccountChannelSchema, buildChannelConfigSchema, buildHistoryContext, buildHistoryContextFromEntries, buildHistoryContextFromMap, buildNestedDmConfigSchema, buildOpenGroupPolicyConfigureRouteAllowlistWarning, buildOpenGroupPolicyRestrictSendersWarning, buildOpenGroupPolicyWarning, buildPendingHistoryContextFromMap, clearHistoryEntries, clearHistoryEntriesIfEnabled, collectAllowlistProviderGroupPolicyWarnings, collectAllowlistProviderRestrictSendersWarnings, collectBlueBubblesStatusIssues, collectNormalizedDirectoryIds, collectOpenGroupPolicyRestrictSendersWarnings, collectOpenGroupPolicyRouteAllowlistWarnings, collectOpenProviderGroupPolicyWarnings, composeWarningCollectors, createAccountStatusSink, createAllowlistProviderGroupPolicyWarningCollector, createAllowlistProviderOpenWarningCollector, createAllowlistProviderRestrictSendersWarningCollector, createAllowlistProviderRouteAllowlistWarningCollector, createChannelDirectoryAdapter, createConditionalWarningCollector, createEmptyChannelDirectoryAdapter, createHybridChannelConfigAdapter, createHybridChannelConfigBase, createOpenGroupPolicyRestrictSendersWarningCollector, createOpenProviderConfiguredRouteWarningCollector, createOpenProviderGroupPolicyWarningCollector, createPluginRuntimeStore, createRuntimeDirectoryLiveAdapter, createScopedAccountConfigAccessors, createScopedChannelConfigAdapter, createScopedChannelConfigBase, createScopedDmSecurityResolver, createTopLevelChannelConfigAdapter, createTopLevelChannelConfigBase, delegateCompactionToRuntime, emptyChannelDirectoryList, emptyPluginConfigSchema, evictOldHistoryKeys, formatAllowFromLowercase, formatNormalizedAllowFromEntries, inspectReadOnlyChannelAccount, listDirectoryEntriesFromSources, listDirectoryGroupEntriesFromMapKeys, listDirectoryGroupEntriesFromMapKeysAndAllowFrom, listDirectoryUserEntriesFromAllowFrom, listDirectoryUserEntriesFromAllowFromAndMapKeys, listInspectedDirectoryEntriesFromSources, listResolvedDirectoryEntriesFromSources, listResolvedDirectoryGroupEntriesFromMapKeys, listResolvedDirectoryUserEntriesFromAllowFrom, mapAllowFromEntries, mapAllowlistResolutionInputs, nullChannelDirectorySelf, onDiagnosticEvent, projectWarningCollector, readStoreAllowFromForDmPolicy, recordPendingHistoryEntry, recordPendingHistoryEntryIfEnabled, resolveBlueBubblesGroupRequireMention, resolveBlueBubblesGroupToolPolicy, resolveChannelGroupRequireMention, resolveChannelGroupToolsPolicy, resolveControlCommandGate, resolveDmGroupAccessWithLists, resolveEffectiveAllowFromLists, resolveToolsBySender, toDirectoryEntries };
