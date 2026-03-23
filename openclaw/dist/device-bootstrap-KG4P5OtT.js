import { n as readJsonFile, r as writeJsonAtomic, t as createAsyncLock } from "./json-files-CW7rEs_Q.js";
import { a as resolvePairingPaths, i as pruneExpiredPending, n as verifyPairingToken, t as generatePairingToken } from "./pairing-token-7Ekpfpzt.js";
import path from "node:path";
//#region src/infra/device-bootstrap.ts
const DEVICE_BOOTSTRAP_TOKEN_TTL_MS = 600 * 1e3;
const withLock = createAsyncLock();
function resolveBootstrapPath(baseDir) {
	return path.join(resolvePairingPaths(baseDir, "devices").dir, "bootstrap.json");
}
async function loadState(baseDir) {
	const rawState = await readJsonFile(resolveBootstrapPath(baseDir)) ?? {};
	const state = {};
	if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) return state;
	for (const [tokenKey, entry] of Object.entries(rawState)) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
		const record = entry;
		const token = typeof record.token === "string" && record.token.trim().length > 0 ? record.token : tokenKey;
		const issuedAtMs = typeof record.issuedAtMs === "number" ? record.issuedAtMs : 0;
		state[tokenKey] = {
			...record,
			token,
			issuedAtMs,
			ts: typeof record.ts === "number" ? record.ts : issuedAtMs
		};
	}
	pruneExpiredPending(state, Date.now(), DEVICE_BOOTSTRAP_TOKEN_TTL_MS);
	return state;
}
async function persistState(state, baseDir) {
	await writeJsonAtomic(resolveBootstrapPath(baseDir), state);
}
async function issueDeviceBootstrapToken(params = {}) {
	return await withLock(async () => {
		const state = await loadState(params.baseDir);
		const token = generatePairingToken();
		const issuedAtMs = Date.now();
		state[token] = {
			token,
			ts: issuedAtMs,
			issuedAtMs
		};
		await persistState(state, params.baseDir);
		return {
			token,
			expiresAtMs: issuedAtMs + DEVICE_BOOTSTRAP_TOKEN_TTL_MS
		};
	});
}
async function clearDeviceBootstrapTokens(params = {}) {
	return await withLock(async () => {
		const state = await loadState(params.baseDir);
		const removed = Object.keys(state).length;
		await persistState({}, params.baseDir);
		return { removed };
	});
}
async function revokeDeviceBootstrapToken(params) {
	return await withLock(async () => {
		const providedToken = params.token.trim();
		if (!providedToken) return { removed: false };
		const state = await loadState(params.baseDir);
		const found = Object.entries(state).find(([, candidate]) => verifyPairingToken(providedToken, candidate.token));
		if (!found) return { removed: false };
		delete state[found[0]];
		await persistState(state, params.baseDir);
		return { removed: true };
	});
}
async function verifyDeviceBootstrapToken(params) {
	return await withLock(async () => {
		const state = await loadState(params.baseDir);
		const providedToken = params.token.trim();
		if (!providedToken) return {
			ok: false,
			reason: "bootstrap_token_invalid"
		};
		const found = Object.entries(state).find(([, candidate]) => verifyPairingToken(providedToken, candidate.token));
		if (!found) return {
			ok: false,
			reason: "bootstrap_token_invalid"
		};
		const [tokenKey] = found;
		const deviceId = params.deviceId.trim();
		const publicKey = params.publicKey.trim();
		const role = params.role.trim();
		if (!deviceId || !publicKey || !role) return {
			ok: false,
			reason: "bootstrap_token_invalid"
		};
		delete state[tokenKey];
		await persistState(state, params.baseDir);
		return { ok: true };
	});
}
//#endregion
export { verifyDeviceBootstrapToken as i, issueDeviceBootstrapToken as n, revokeDeviceBootstrapToken as r, clearDeviceBootstrapTokens as t };
