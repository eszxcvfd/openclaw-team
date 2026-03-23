import "./src-CmXHIz5f.js";
import "./redact-BDinS1q9.js";
import "./errors-BxyFnvP3.js";
import "./unhandled-rejections-CDJ8dOVP.js";
import "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import "./globals-Ca-8xJiD.js";
import { t as createSubsystemLogger } from "./subsystem-YgTuVQVh.js";
import "./ansi-cwY8Vrne.js";
import "./boolean-B6zcAynR.js";
import "./env-CQLG1scp.js";
import "./warning-filter-hHA7Rorp.js";
import { D as isPlainObject } from "./utils-DzdaH7JM.js";
import "./links-g7g5mVf0.js";
import "./models-config.providers.discovery-CdeTbmVZ.js";
import { Bx as getDiagnosticSessionState, Mx as logToolLoopAction } from "./auth-profiles-CmO7TMIb.js";
import "./model-selection-BXQGwwqy.js";
import "./boundary-path-BVHzCDEE.js";
import "./boundary-file-read-1knRHcS0.js";
import "./logger-CSnzpOlU.js";
import "./exec-vhyLuPtA.js";
import "./workspace-OTiuBtkV.js";
import "./agent-scope-VMfvxKRt.js";
import "./env-overrides-Ck_KN5Yc.js";
import "./safe-text-BRtokf22.js";
import "./version-GCXYdDuZ.js";
import "./config-VwKeuZ6Q.js";
import "./config-state-1aMcm4RG.js";
import "./tool-policy-match-BxOSaweu.js";
import "./provider-web-search-65U3wtCD.js";
import "./search-manager-DN27lb4F.js";
import "./registry-COOqBSUM.js";
import "./base-session-key-C3_WT8uY.js";
import "./delegate-CQC_bau0.js";
import "./config-schema-DjM6jQY2.js";
import "./typebox-DtQbaL9E.js";
import "./secret-file-D3nATjkM.js";
import "./core-Jk74VVNa.js";
import "./mime-Dp6jja6u.js";
import "./common-G_FV6fHD.js";
import "./image-ops-BpL0uNn4.js";
import "./fetch-guard-ClSe9uaR.js";
import "./ip-f51uA2k-.js";
import "./ssrf-BZ_EPMmt.js";
import "./external-content-DDo3tc4z.js";
import "./brave-BQNYV3-u.js";
import "./identity-file-DzUzo86Z.js";
import "./channel-reply-pipeline-B4FY0T8m.js";
import "./provider-env-vars-BbRMzBBO.js";
import "./provider-models-C0j4qkh4.js";
import "./kilocode-shared-piT8G4er.js";
import "./provider-model-allowlist-qqdE1eKD.js";
import "./secret-input-Ua-MPZgk.js";
import "./routing-CDtOgmV-.js";
import "./message-channel-BJH5Ixzm.js";
import "./token-B-rUAWAb.js";
import "./group-keys-CvPi-x-K.js";
import "./zod-schema.agent-runtime-cWX_tx9u.js";
import "./shared-BAbGaRi2.js";
import "./status-helpers-D8YQ830F.js";
import "./allow-from-DjJFBgUq.js";
import "./runtime-B5E7_GSf.js";
import "./registry-dNL0jg8o.js";
import "./plugins-BRqYQTJ6.js";
import "./channel-policy-CG3Bx5_n.js";
import "./commands--uIhX2I_.js";
import "./query-expansion-l1du3GNx.js";
import "./method-scopes-CThAM_Qd.js";
import "./web-media-CyuJXNa4.js";
import "./fs-safe-D0QOk-pp.js";
import "./path-alias-guards-Bygz_LWl.js";
import "./device-metadata-normalization-BNoATvxd.js";
import "./command-secret-targets-DVV_Bjz5.js";
import "./frontmatter-Bl8CxKAq.js";
import "./skills-vNTLGRRF.js";
import "./manifest-registry-9MPsyNid.js";
import "./ports-CIWeVn27.js";
import "./ports-lsof-CUMUP6h0.js";
import "./ssh-tunnel-1sJ1f2bU.js";
import "./delivery-queue-yx65qtqu.js";
import "./hook-runtime-CscWHSHM.js";
import "./internal-hooks-Crp22V2F.js";
import "./http-registry-Cw2iLpjf.js";
import "./channel-config-helpers-DEviHTY4.js";
import "./file-lock-CEjqTp7W.js";
import "./directory-runtime-DjKjbEt4.js";
import "./ssrf-policy-pX12eKvq.js";
import "./logging-Bk1RvIn5.js";
import "./runtime-env-CiBDFZMy.js";
import "./reply-history-DDAjCWma.js";
import "./multimodal-B6_WqDjs.js";
import "./memory-search-ae40e-0o.js";
import "./setup-binary-BX-g_f5x.js";
import "./signal-cli-install-saUNAk6k.js";
import "./channel-actions-7p4LIN6Y.js";
import "./dm-policy-shared-DojYgkLF.js";
import "./json-store-DC4nEtgW.js";
import "./pairing-token-7Ekpfpzt.js";
import "./restart-stale-pids-BtAvlzxJ.js";
import "./read-only-account-inspect-CalC0cn1.js";
import "./provider-usage-2SFkzVkv.js";
import "./security-runtime-B4DF6L3-.js";
import "./state-paths-Cfku6SUD.js";
import "./accounts-BEzMOfVU.js";
import "./process-runtime-BiszL9pm.js";
import "./setup-wizard-proxy-B-HAVlzJ.js";
import "./setup-D3IwHaIE.js";
import "./audit-BcpHUrr9.js";
import "./cli-utils-W4tCzjyF.js";
import "./cli-runtime-C6fj72K1.js";
import "./setup-tools-DQ8qWjwb.js";
import "./provider-onboard-CyO0ejGY.js";
import "./perplexity-DEZOg8vp.js";
import { createHash } from "node:crypto";
//#region src/agents/tool-loop-detection.ts
const log = createSubsystemLogger("agents/loop-detection");
const DEFAULT_LOOP_DETECTION_CONFIG = {
	enabled: false,
	historySize: 30,
	warningThreshold: 10,
	criticalThreshold: 20,
	globalCircuitBreakerThreshold: 30,
	detectors: {
		genericRepeat: true,
		knownPollNoProgress: true,
		pingPong: true
	}
};
function asPositiveInt(value, fallback) {
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return fallback;
	return value;
}
function resolveLoopDetectionConfig(config) {
	let warningThreshold = asPositiveInt(config?.warningThreshold, DEFAULT_LOOP_DETECTION_CONFIG.warningThreshold);
	let criticalThreshold = asPositiveInt(config?.criticalThreshold, DEFAULT_LOOP_DETECTION_CONFIG.criticalThreshold);
	let globalCircuitBreakerThreshold = asPositiveInt(config?.globalCircuitBreakerThreshold, DEFAULT_LOOP_DETECTION_CONFIG.globalCircuitBreakerThreshold);
	if (criticalThreshold <= warningThreshold) criticalThreshold = warningThreshold + 1;
	if (globalCircuitBreakerThreshold <= criticalThreshold) globalCircuitBreakerThreshold = criticalThreshold + 1;
	return {
		enabled: config?.enabled ?? DEFAULT_LOOP_DETECTION_CONFIG.enabled,
		historySize: asPositiveInt(config?.historySize, DEFAULT_LOOP_DETECTION_CONFIG.historySize),
		warningThreshold,
		criticalThreshold,
		globalCircuitBreakerThreshold,
		detectors: {
			genericRepeat: config?.detectors?.genericRepeat ?? DEFAULT_LOOP_DETECTION_CONFIG.detectors.genericRepeat,
			knownPollNoProgress: config?.detectors?.knownPollNoProgress ?? DEFAULT_LOOP_DETECTION_CONFIG.detectors.knownPollNoProgress,
			pingPong: config?.detectors?.pingPong ?? DEFAULT_LOOP_DETECTION_CONFIG.detectors.pingPong
		}
	};
}
/**
* Hash a tool call for pattern matching.
* Uses tool name + deterministic JSON serialization digest of params.
*/
function hashToolCall(toolName, params) {
	return `${toolName}:${digestStable(params)}`;
}
function stableStringify(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const obj = value;
	return `{${Object.keys(obj).toSorted().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
function digestStable(value) {
	const serialized = stableStringifyFallback(value);
	return createHash("sha256").update(serialized).digest("hex");
}
function stableStringifyFallback(value) {
	try {
		return stableStringify(value);
	} catch {
		if (value === null || value === void 0) return `${value}`;
		if (typeof value === "string") return value;
		if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return `${value}`;
		if (value instanceof Error) return `${value.name}:${value.message}`;
		return Object.prototype.toString.call(value);
	}
}
function isKnownPollToolCall(toolName, params) {
	if (toolName === "command_status") return true;
	if (toolName !== "process" || !isPlainObject(params)) return false;
	const action = params.action;
	return action === "poll" || action === "log";
}
function extractTextContent(result) {
	if (!isPlainObject(result) || !Array.isArray(result.content)) return "";
	return result.content.filter((entry) => isPlainObject(entry) && typeof entry.type === "string" && typeof entry.text === "string").map((entry) => entry.text).join("\n").trim();
}
function formatErrorForHash(error) {
	if (error instanceof Error) return error.message || error.name;
	if (typeof error === "string") return error;
	if (typeof error === "number" || typeof error === "boolean" || typeof error === "bigint") return `${error}`;
	return stableStringify(error);
}
function hashToolOutcome(toolName, params, result, error) {
	if (error !== void 0) return `error:${digestStable(formatErrorForHash(error))}`;
	if (!isPlainObject(result)) return result === void 0 ? void 0 : digestStable(result);
	const details = isPlainObject(result.details) ? result.details : {};
	const text = extractTextContent(result);
	if (isKnownPollToolCall(toolName, params) && toolName === "process" && isPlainObject(params)) {
		const action = params.action;
		if (action === "poll") return digestStable({
			action,
			status: details.status,
			exitCode: details.exitCode ?? null,
			exitSignal: details.exitSignal ?? null,
			aggregated: details.aggregated ?? null,
			text
		});
		if (action === "log") return digestStable({
			action,
			status: details.status,
			totalLines: details.totalLines ?? null,
			totalChars: details.totalChars ?? null,
			truncated: details.truncated ?? null,
			exitCode: details.exitCode ?? null,
			exitSignal: details.exitSignal ?? null,
			text
		});
	}
	return digestStable({
		details,
		text
	});
}
function getNoProgressStreak(history, toolName, argsHash) {
	let streak = 0;
	let latestResultHash;
	for (let i = history.length - 1; i >= 0; i -= 1) {
		const record = history[i];
		if (!record || record.toolName !== toolName || record.argsHash !== argsHash) continue;
		if (typeof record.resultHash !== "string" || !record.resultHash) continue;
		if (!latestResultHash) {
			latestResultHash = record.resultHash;
			streak = 1;
			continue;
		}
		if (record.resultHash !== latestResultHash) break;
		streak += 1;
	}
	return {
		count: streak,
		latestResultHash
	};
}
function getPingPongStreak(history, currentSignature) {
	const last = history.at(-1);
	if (!last) return {
		count: 0,
		noProgressEvidence: false
	};
	let otherSignature;
	let otherToolName;
	for (let i = history.length - 2; i >= 0; i -= 1) {
		const call = history[i];
		if (!call) continue;
		if (call.argsHash !== last.argsHash) {
			otherSignature = call.argsHash;
			otherToolName = call.toolName;
			break;
		}
	}
	if (!otherSignature || !otherToolName) return {
		count: 0,
		noProgressEvidence: false
	};
	let alternatingTailCount = 0;
	for (let i = history.length - 1; i >= 0; i -= 1) {
		const call = history[i];
		if (!call) continue;
		const expected = alternatingTailCount % 2 === 0 ? last.argsHash : otherSignature;
		if (call.argsHash !== expected) break;
		alternatingTailCount += 1;
	}
	if (alternatingTailCount < 2) return {
		count: 0,
		noProgressEvidence: false
	};
	if (currentSignature !== otherSignature) return {
		count: 0,
		noProgressEvidence: false
	};
	const tailStart = Math.max(0, history.length - alternatingTailCount);
	let firstHashA;
	let firstHashB;
	let noProgressEvidence = true;
	for (let i = tailStart; i < history.length; i += 1) {
		const call = history[i];
		if (!call) continue;
		if (!call.resultHash) {
			noProgressEvidence = false;
			break;
		}
		if (call.argsHash === last.argsHash) {
			if (!firstHashA) firstHashA = call.resultHash;
			else if (firstHashA !== call.resultHash) {
				noProgressEvidence = false;
				break;
			}
			continue;
		}
		if (call.argsHash === otherSignature) {
			if (!firstHashB) firstHashB = call.resultHash;
			else if (firstHashB !== call.resultHash) {
				noProgressEvidence = false;
				break;
			}
			continue;
		}
		noProgressEvidence = false;
		break;
	}
	if (!firstHashA || !firstHashB) noProgressEvidence = false;
	return {
		count: alternatingTailCount + 1,
		pairedToolName: last.toolName,
		pairedSignature: last.argsHash,
		noProgressEvidence
	};
}
function canonicalPairKey(signatureA, signatureB) {
	return [signatureA, signatureB].toSorted().join("|");
}
/**
* Detect if an agent is stuck in a repetitive tool call loop.
* Checks if the same tool+params combination has been called excessively.
*/
function detectToolCallLoop(state, toolName, params, config) {
	const resolvedConfig = resolveLoopDetectionConfig(config);
	if (!resolvedConfig.enabled) return { stuck: false };
	const history = state.toolCallHistory ?? [];
	const currentHash = hashToolCall(toolName, params);
	const noProgress = getNoProgressStreak(history, toolName, currentHash);
	const noProgressStreak = noProgress.count;
	const knownPollTool = isKnownPollToolCall(toolName, params);
	const pingPong = getPingPongStreak(history, currentHash);
	if (noProgressStreak >= resolvedConfig.globalCircuitBreakerThreshold) {
		log.error(`Global circuit breaker triggered: ${toolName} repeated ${noProgressStreak} times with no progress`);
		return {
			stuck: true,
			level: "critical",
			detector: "global_circuit_breaker",
			count: noProgressStreak,
			message: `CRITICAL: ${toolName} has repeated identical no-progress outcomes ${noProgressStreak} times. Session execution blocked by global circuit breaker to prevent runaway loops.`,
			warningKey: `global:${toolName}:${currentHash}:${noProgress.latestResultHash ?? "none"}`
		};
	}
	if (knownPollTool && resolvedConfig.detectors.knownPollNoProgress && noProgressStreak >= resolvedConfig.criticalThreshold) {
		log.error(`Critical polling loop detected: ${toolName} repeated ${noProgressStreak} times`);
		return {
			stuck: true,
			level: "critical",
			detector: "known_poll_no_progress",
			count: noProgressStreak,
			message: `CRITICAL: Called ${toolName} with identical arguments and no progress ${noProgressStreak} times. This appears to be a stuck polling loop. Session execution blocked to prevent resource waste.`,
			warningKey: `poll:${toolName}:${currentHash}:${noProgress.latestResultHash ?? "none"}`
		};
	}
	if (knownPollTool && resolvedConfig.detectors.knownPollNoProgress && noProgressStreak >= resolvedConfig.warningThreshold) {
		log.warn(`Polling loop warning: ${toolName} repeated ${noProgressStreak} times`);
		return {
			stuck: true,
			level: "warning",
			detector: "known_poll_no_progress",
			count: noProgressStreak,
			message: `WARNING: You have called ${toolName} ${noProgressStreak} times with identical arguments and no progress. Stop polling and either (1) increase wait time between checks, or (2) report the task as failed if the process is stuck.`,
			warningKey: `poll:${toolName}:${currentHash}:${noProgress.latestResultHash ?? "none"}`
		};
	}
	const pingPongWarningKey = pingPong.pairedSignature ? `pingpong:${canonicalPairKey(currentHash, pingPong.pairedSignature)}` : `pingpong:${toolName}:${currentHash}`;
	if (resolvedConfig.detectors.pingPong && pingPong.count >= resolvedConfig.criticalThreshold && pingPong.noProgressEvidence) {
		log.error(`Critical ping-pong loop detected: alternating calls count=${pingPong.count} currentTool=${toolName}`);
		return {
			stuck: true,
			level: "critical",
			detector: "ping_pong",
			count: pingPong.count,
			message: `CRITICAL: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls) with no progress. This appears to be a stuck ping-pong loop. Session execution blocked to prevent resource waste.`,
			pairedToolName: pingPong.pairedToolName,
			warningKey: pingPongWarningKey
		};
	}
	if (resolvedConfig.detectors.pingPong && pingPong.count >= resolvedConfig.warningThreshold) {
		log.warn(`Ping-pong loop warning: alternating calls count=${pingPong.count} currentTool=${toolName}`);
		return {
			stuck: true,
			level: "warning",
			detector: "ping_pong",
			count: pingPong.count,
			message: `WARNING: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls). This looks like a ping-pong loop; stop retrying and report the task as failed.`,
			pairedToolName: pingPong.pairedToolName,
			warningKey: pingPongWarningKey
		};
	}
	const recentCount = history.filter((h) => h.toolName === toolName && h.argsHash === currentHash).length;
	if (!knownPollTool && resolvedConfig.detectors.genericRepeat && recentCount >= resolvedConfig.warningThreshold) {
		log.warn(`Loop warning: ${toolName} called ${recentCount} times with identical arguments`);
		return {
			stuck: true,
			level: "warning",
			detector: "generic_repeat",
			count: recentCount,
			message: `WARNING: You have called ${toolName} ${recentCount} times with identical arguments. If this is not making progress, stop retrying and report the task as failed.`,
			warningKey: `generic:${toolName}:${currentHash}`
		};
	}
	return { stuck: false };
}
/**
* Record a tool call in the session's history for loop detection.
* Maintains sliding window of last N calls.
*/
function recordToolCall(state, toolName, params, toolCallId, config) {
	const resolvedConfig = resolveLoopDetectionConfig(config);
	if (!state.toolCallHistory) state.toolCallHistory = [];
	state.toolCallHistory.push({
		toolName,
		argsHash: hashToolCall(toolName, params),
		toolCallId,
		timestamp: Date.now()
	});
	if (state.toolCallHistory.length > resolvedConfig.historySize) state.toolCallHistory.shift();
}
/**
* Record a completed tool call outcome so loop detection can identify no-progress repeats.
*/
function recordToolCallOutcome(state, params) {
	const resolvedConfig = resolveLoopDetectionConfig(params.config);
	const resultHash = hashToolOutcome(params.toolName, params.toolParams, params.result, params.error);
	if (!resultHash) return;
	if (!state.toolCallHistory) state.toolCallHistory = [];
	const argsHash = hashToolCall(params.toolName, params.toolParams);
	let matched = false;
	for (let i = state.toolCallHistory.length - 1; i >= 0; i -= 1) {
		const call = state.toolCallHistory[i];
		if (!call) continue;
		if (params.toolCallId && call.toolCallId !== params.toolCallId) continue;
		if (call.toolName !== params.toolName || call.argsHash !== argsHash) continue;
		if (call.resultHash !== void 0) continue;
		call.resultHash = resultHash;
		matched = true;
		break;
	}
	if (!matched) state.toolCallHistory.push({
		toolName: params.toolName,
		argsHash,
		toolCallId: params.toolCallId,
		resultHash,
		timestamp: Date.now()
	});
	if (state.toolCallHistory.length > resolvedConfig.historySize) state.toolCallHistory.splice(0, state.toolCallHistory.length - resolvedConfig.historySize);
}
//#endregion
//#region src/agents/pi-tools.before-tool-call.runtime.ts
const beforeToolCallRuntime = {
	getDiagnosticSessionState,
	logToolLoopAction,
	detectToolCallLoop,
	recordToolCall,
	recordToolCallOutcome
};
//#endregion
export { beforeToolCallRuntime };
