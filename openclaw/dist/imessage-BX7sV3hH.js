import { Cc as inferIMessageTargetChatType, Ec as parseIMessageTarget, Fc as resolveIMessageAccount, Mc as resolveIMessageGroupToolPolicy, Or as normalizeIMessageMessagingTarget, Tc as normalizeIMessageHandle, jc as resolveIMessageGroupRequireMention, wc as looksLikeIMessageExplicitTargetId } from "./auth-profiles-CmO7TMIb.js";
import { t as DEFAULT_ACCOUNT_ID } from "./account-id-BBUVs4qN.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-C3_WT8uY.js";
import { r as defineChannelPluginEntry } from "./core-Jk74VVNa.js";
import { s as collectStatusIssuesFromLastError } from "./status-helpers-D8YQ830F.js";
import { l as formatTrimmedAllowFromEntries } from "./channel-config-helpers-DEviHTY4.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-CKdxDBg0.js";
import { i as createAttachedChannelResultAdapter } from "./channel-send-result-CmXuF1IV.js";
import { n as buildDmGroupAccountAllowlistAdapter } from "./allowlist-config-edit-DpFqWF3E.js";
import { n as buildPassiveProbedChannelStatusSummary } from "./extension-shared-CJEjBziQ.js";
import { n as setIMessageRuntime, t as getIMessageRuntime } from "./runtime-CC7-RbsG.js";
import { a as imessageSetupAdapter } from "./setup-core-CwbHXkbT.js";
import { i as imessageSetupWizard, n as createIMessagePluginBase, r as imessageResolveDmPolicy, t as collectIMessageSecurityWarnings } from "./shared-DcPECqa6.js";
//#region extensions/imessage/src/channel.ts
const loadIMessageChannelRuntime = createLazyRuntimeModule(() => import("./channel.runtime-BEuN6X43.js"));
function buildIMessageBaseSessionKey(params) {
	return buildOutboundBaseSessionKey({
		...params,
		channel: "imessage"
	});
}
function resolveIMessageOutboundSessionRoute(params) {
	const parsed = parseIMessageTarget(params.target);
	if (parsed.kind === "handle") {
		const handle = normalizeIMessageHandle(parsed.to);
		if (!handle) return null;
		const peer = {
			kind: "direct",
			id: handle
		};
		const baseSessionKey = buildIMessageBaseSessionKey({
			cfg: params.cfg,
			agentId: params.agentId,
			accountId: params.accountId,
			peer
		});
		return {
			sessionKey: baseSessionKey,
			baseSessionKey,
			peer,
			chatType: "direct",
			from: `imessage:${handle}`,
			to: `imessage:${handle}`
		};
	}
	const peerId = parsed.kind === "chat_id" ? String(parsed.chatId) : parsed.kind === "chat_guid" ? parsed.chatGuid : parsed.chatIdentifier;
	if (!peerId) return null;
	const peer = {
		kind: "group",
		id: peerId
	};
	const baseSessionKey = buildIMessageBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: params.accountId,
		peer
	});
	const toPrefix = parsed.kind === "chat_id" ? "chat_id" : parsed.kind === "chat_guid" ? "chat_guid" : "chat_identifier";
	return {
		sessionKey: baseSessionKey,
		baseSessionKey,
		peer,
		chatType: "group",
		from: `imessage:group:${peerId}`,
		to: `${toPrefix}:${peerId}`
	};
}
const imessagePlugin = {
	...createIMessagePluginBase({
		setupWizard: imessageSetupWizard,
		setup: imessageSetupAdapter
	}),
	pairing: {
		idLabel: "imessageSenderId",
		notifyApproval: async ({ id }) => await (await loadIMessageChannelRuntime()).notifyIMessageApproval(id)
	},
	allowlist: buildDmGroupAccountAllowlistAdapter({
		channelId: "imessage",
		resolveAccount: ({ cfg, accountId }) => resolveIMessageAccount({
			cfg,
			accountId
		}),
		normalize: ({ values }) => formatTrimmedAllowFromEntries(values),
		resolveDmAllowFrom: (account) => account.config.allowFrom,
		resolveGroupAllowFrom: (account) => account.config.groupAllowFrom,
		resolveDmPolicy: (account) => account.config.dmPolicy,
		resolveGroupPolicy: (account) => account.config.groupPolicy
	}),
	security: {
		resolveDmPolicy: imessageResolveDmPolicy,
		collectWarnings: collectIMessageSecurityWarnings
	},
	groups: {
		resolveRequireMention: resolveIMessageGroupRequireMention,
		resolveToolPolicy: resolveIMessageGroupToolPolicy
	},
	messaging: {
		normalizeTarget: normalizeIMessageMessagingTarget,
		inferTargetChatType: ({ to }) => inferIMessageTargetChatType(to),
		resolveOutboundSessionRoute: (params) => resolveIMessageOutboundSessionRoute(params),
		targetResolver: {
			looksLikeId: looksLikeIMessageExplicitTargetId,
			hint: "<handle|chat_id:ID>",
			resolveTarget: async ({ normalized }) => {
				const to = normalized?.trim();
				if (!to) return null;
				const chatType = inferIMessageTargetChatType(to);
				if (!chatType) return null;
				return {
					to,
					kind: chatType === "direct" ? "user" : "group",
					source: "normalized"
				};
			}
		}
	},
	outbound: {
		deliveryMode: "direct",
		chunker: (text, limit) => getIMessageRuntime().channel.text.chunkText(text, limit),
		chunkerMode: "text",
		textChunkLimit: 4e3,
		...createAttachedChannelResultAdapter({
			channel: "imessage",
			sendText: async ({ cfg, to, text, accountId, deps, replyToId }) => await (await loadIMessageChannelRuntime()).sendIMessageOutbound({
				cfg,
				to,
				text,
				accountId: accountId ?? void 0,
				deps,
				replyToId: replyToId ?? void 0
			}),
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, replyToId }) => await (await loadIMessageChannelRuntime()).sendIMessageOutbound({
				cfg,
				to,
				text,
				mediaUrl,
				mediaLocalRoots,
				accountId: accountId ?? void 0,
				deps,
				replyToId: replyToId ?? void 0
			})
		})
	},
	status: {
		defaultRuntime: {
			accountId: DEFAULT_ACCOUNT_ID,
			running: false,
			lastStartAt: null,
			lastStopAt: null,
			lastError: null,
			cliPath: null,
			dbPath: null
		},
		collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("imessage", accounts),
		buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot, {
			cliPath: snapshot.cliPath ?? null,
			dbPath: snapshot.dbPath ?? null
		}),
		probeAccount: async ({ timeoutMs }) => await (await loadIMessageChannelRuntime()).probeIMessageAccount(timeoutMs),
		buildAccountSnapshot: ({ account, runtime, probe }) => ({
			accountId: account.accountId,
			name: account.name,
			enabled: account.enabled,
			configured: account.configured,
			running: runtime?.running ?? false,
			lastStartAt: runtime?.lastStartAt ?? null,
			lastStopAt: runtime?.lastStopAt ?? null,
			lastError: runtime?.lastError ?? null,
			cliPath: runtime?.cliPath ?? account.config.cliPath ?? null,
			dbPath: runtime?.dbPath ?? account.config.dbPath ?? null,
			probe,
			lastInboundAt: runtime?.lastInboundAt ?? null,
			lastOutboundAt: runtime?.lastOutboundAt ?? null
		}),
		resolveAccountState: ({ enabled }) => enabled ? "enabled" : "disabled"
	},
	gateway: { startAccount: async (ctx) => await (await loadIMessageChannelRuntime()).startIMessageGatewayAccount(ctx) }
};
//#endregion
//#region extensions/imessage/index.ts
var imessage_default = defineChannelPluginEntry({
	id: "imessage",
	name: "iMessage",
	description: "iMessage channel plugin",
	plugin: imessagePlugin,
	setRuntime: setIMessageRuntime
});
//#endregion
export { imessagePlugin as n, imessage_default as t };
