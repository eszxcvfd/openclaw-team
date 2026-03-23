import { n as normalizeAccountId, t as DEFAULT_ACCOUNT_ID } from "./account-id-BBUVs4qN.js";
import { c as normalizeResolvedSecretInputString, l as normalizeSecretInputString } from "./types.secrets-CV05Fs_3.js";
import { i as tryReadSecretFileSync } from "./secret-file-D3nATjkM.js";
import { t as createAccountListHelpers } from "./account-helpers-DYctDRoJ.js";
//#region extensions/zalo/src/token.ts
function readTokenFromFile(tokenFile) {
	return tryReadSecretFileSync(tokenFile, "Zalo token file", { rejectSymlink: true }) ?? "";
}
function resolveZaloToken(config, accountId, options) {
	const resolvedAccountId = accountId ?? "default";
	const isDefaultAccount = resolvedAccountId === DEFAULT_ACCOUNT_ID;
	const baseConfig = config;
	const resolveAccountConfig = (id) => {
		const accounts = baseConfig?.accounts;
		if (!accounts || typeof accounts !== "object") return;
		const direct = accounts[id];
		if (direct) return direct;
		const normalized = normalizeAccountId(id);
		const matchKey = Object.keys(accounts).find((key) => normalizeAccountId(key) === normalized);
		return matchKey ? accounts[matchKey] ?? void 0 : void 0;
	};
	const accountConfig = resolveAccountConfig(resolvedAccountId);
	const accountHasBotToken = Boolean(accountConfig && Object.prototype.hasOwnProperty.call(accountConfig, "botToken"));
	if (accountConfig && accountHasBotToken) {
		const token = options?.allowUnresolvedSecretRef ? normalizeSecretInputString(accountConfig.botToken) : normalizeResolvedSecretInputString({
			value: accountConfig.botToken,
			path: `channels.zalo.accounts.${resolvedAccountId}.botToken`
		});
		if (token) return {
			token,
			source: "config"
		};
		const fileToken = readTokenFromFile(accountConfig.tokenFile);
		if (fileToken) return {
			token: fileToken,
			source: "configFile"
		};
	}
	if (!accountHasBotToken) {
		const fileToken = readTokenFromFile(accountConfig?.tokenFile);
		if (fileToken) return {
			token: fileToken,
			source: "configFile"
		};
	}
	if (!accountHasBotToken) {
		const token = options?.allowUnresolvedSecretRef ? normalizeSecretInputString(baseConfig?.botToken) : normalizeResolvedSecretInputString({
			value: baseConfig?.botToken,
			path: "channels.zalo.botToken"
		});
		if (token) return {
			token,
			source: "config"
		};
		const fileToken = readTokenFromFile(baseConfig?.tokenFile);
		if (fileToken) return {
			token: fileToken,
			source: "configFile"
		};
	}
	if (isDefaultAccount) {
		const envToken = process.env.ZALO_BOT_TOKEN?.trim();
		if (envToken) return {
			token: envToken,
			source: "env"
		};
	}
	return {
		token: "",
		source: "none"
	};
}
//#endregion
//#region extensions/zalo/src/accounts.ts
const { listAccountIds: listZaloAccountIds, resolveDefaultAccountId: resolveDefaultZaloAccountId } = createAccountListHelpers("zalo");
function resolveAccountConfig(cfg, accountId) {
	const accounts = (cfg.channels?.zalo)?.accounts;
	if (!accounts || typeof accounts !== "object") return;
	return accounts[accountId];
}
function mergeZaloAccountConfig(cfg, accountId) {
	const { accounts: _ignored, defaultAccount: _ignored2, ...base } = cfg.channels?.zalo ?? {};
	const account = resolveAccountConfig(cfg, accountId) ?? {};
	return {
		...base,
		...account
	};
}
function resolveZaloAccount(params) {
	const accountId = normalizeAccountId(params.accountId);
	const baseEnabled = (params.cfg.channels?.zalo)?.enabled !== false;
	const merged = mergeZaloAccountConfig(params.cfg, accountId);
	const accountEnabled = merged.enabled !== false;
	const enabled = baseEnabled && accountEnabled;
	const tokenResolution = resolveZaloToken(params.cfg.channels?.zalo, accountId, { allowUnresolvedSecretRef: params.allowUnresolvedSecretRef });
	return {
		accountId,
		name: merged.name?.trim() || void 0,
		enabled,
		token: tokenResolution.token,
		tokenSource: tokenResolution.source,
		config: merged
	};
}
function listEnabledZaloAccounts(cfg) {
	return listZaloAccountIds(cfg).map((accountId) => resolveZaloAccount({
		cfg,
		accountId
	})).filter((account) => account.enabled);
}
//#endregion
export { resolveZaloToken as a, resolveZaloAccount as i, listZaloAccountIds as n, resolveDefaultZaloAccountId as r, listEnabledZaloAccounts as t };
