import { n as normalizeAccountId } from "./account-id-BBUVs4qN.js";
import { t as formatCliCommand } from "./command-format-CCj3DEbG.js";
//#region src/pairing/pairing-messages.ts
function buildPairingReply(params) {
	const { channel, idLine, code } = params;
	return [
		"OpenClaw: access not configured.",
		"",
		idLine,
		"",
		`Pairing code: ${code}`,
		"",
		"Ask the bot owner to approve with:",
		formatCliCommand(`openclaw pairing approve ${channel} ${code}`)
	].join("\n");
}
//#endregion
//#region src/pairing/pairing-challenge.ts
/**
* Shared pairing challenge issuance for DM pairing policy pathways.
* Ensures every channel follows the same create-if-missing + reply flow.
*/
async function issuePairingChallenge(params) {
	const { code, created } = await params.upsertPairingRequest({
		id: params.senderId,
		meta: params.meta
	});
	if (!created) return { created: false };
	params.onCreated?.({ code });
	const replyText = params.buildReplyText?.({
		code,
		senderIdLine: params.senderIdLine
	}) ?? buildPairingReply({
		channel: params.channel,
		idLine: params.senderIdLine,
		code
	});
	try {
		await params.sendPairingReply(replyText);
	} catch (err) {
		params.onReplyError?.(err);
	}
	return {
		created: true,
		code
	};
}
//#endregion
//#region src/channels/plugins/pairing-adapters.ts
function createPairingPrefixStripper(prefixRe, map = (entry) => entry) {
	return (entry) => map(entry.replace(prefixRe, ""));
}
function createLoggedPairingApprovalNotifier(format, log = console.log) {
	return async (params) => {
		log(typeof format === "function" ? format(params) : format);
	};
}
function createTextPairingAdapter(params) {
	return {
		idLabel: params.idLabel,
		normalizeAllowEntry: params.normalizeAllowEntry,
		notifyApproval: async (ctx) => {
			await params.notify({
				...ctx,
				message: params.message
			});
		}
	};
}
//#endregion
//#region src/plugin-sdk/pairing-access.ts
/** Scope pairing store operations to one channel/account pair for plugin-facing helpers. */
function createScopedPairingAccess(params) {
	const resolvedAccountId = normalizeAccountId(params.accountId);
	return {
		accountId: resolvedAccountId,
		readAllowFromStore: () => params.core.channel.pairing.readAllowFromStore({
			channel: params.channel,
			accountId: resolvedAccountId
		}),
		readStoreForDmPolicy: (provider, accountId) => params.core.channel.pairing.readAllowFromStore({
			channel: provider,
			accountId: normalizeAccountId(accountId)
		}),
		upsertPairingRequest: (input) => params.core.channel.pairing.upsertPairingRequest({
			channel: params.channel,
			accountId: resolvedAccountId,
			...input
		})
	};
}
//#endregion
//#region src/plugin-sdk/channel-pairing.ts
function createChannelPairingChallengeIssuer(params) {
	return (challenge) => issuePairingChallenge({
		channel: params.channel,
		upsertPairingRequest: params.upsertPairingRequest,
		...challenge
	});
}
function createChannelPairingController(params) {
	const access = createScopedPairingAccess(params);
	return {
		...access,
		issueChallenge: createChannelPairingChallengeIssuer({
			channel: params.channel,
			upsertPairingRequest: access.upsertPairingRequest
		})
	};
}
//#endregion
export { createTextPairingAdapter as a, createPairingPrefixStripper as i, createChannelPairingController as n, issuePairingChallenge as o, createLoggedPairingApprovalNotifier as r, buildPairingReply as s, createChannelPairingChallengeIssuer as t };
