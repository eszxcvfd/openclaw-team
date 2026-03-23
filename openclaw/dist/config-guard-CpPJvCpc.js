import "./src-CmXHIz5f.js";
import "./redact-BDinS1q9.js";
import "./errors-BxyFnvP3.js";
import "./unhandled-rejections-CDJ8dOVP.js";
import { F as shouldMigrateStateFromPath } from "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import "./globals-Ca-8xJiD.js";
import "./subsystem-YgTuVQVh.js";
import "./ansi-cwY8Vrne.js";
import "./boolean-B6zcAynR.js";
import "./env-CQLG1scp.js";
import "./warning-filter-hHA7Rorp.js";
import "./utils-DzdaH7JM.js";
import "./links-g7g5mVf0.js";
import "./models-config.providers.discovery-CdeTbmVZ.js";
import { j as readConfigFileSnapshot } from "./auth-profiles-CmO7TMIb.js";
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
//#region src/cli/program/config-guard.ts
const ALLOWED_INVALID_COMMANDS = new Set([
	"doctor",
	"logs",
	"health",
	"help",
	"status"
]);
const ALLOWED_INVALID_GATEWAY_SUBCOMMANDS = new Set([
	"status",
	"probe",
	"health",
	"discover",
	"call",
	"install",
	"uninstall",
	"start",
	"stop",
	"restart"
]);
let didRunDoctorConfigFlow = false;
let configSnapshotPromise = null;
function resetConfigGuardStateForTests() {
	didRunDoctorConfigFlow = false;
	configSnapshotPromise = null;
}
async function getConfigSnapshot() {
	if (process.env.VITEST === "true") return readConfigFileSnapshot();
	configSnapshotPromise ??= readConfigFileSnapshot();
	return configSnapshotPromise;
}
async function ensureConfigReady(params) {
	const commandPath = params.commandPath ?? [];
	let preflightSnapshot = null;
	if (!didRunDoctorConfigFlow && shouldMigrateStateFromPath(commandPath)) {
		didRunDoctorConfigFlow = true;
		const runDoctorConfigPreflight = async () => (await import("./doctor-config-preflight-Bi5UBWyp.js")).runDoctorConfigPreflight({
			migrateState: false,
			migrateLegacyConfig: false,
			invalidConfigNote: false
		});
		if (!params.suppressDoctorStdout) preflightSnapshot = (await runDoctorConfigPreflight()).snapshot;
		else {
			const originalStdoutWrite = process.stdout.write.bind(process.stdout);
			const originalSuppressNotes = process.env.OPENCLAW_SUPPRESS_NOTES;
			process.stdout.write = (() => true);
			process.env.OPENCLAW_SUPPRESS_NOTES = "1";
			try {
				preflightSnapshot = (await runDoctorConfigPreflight()).snapshot;
			} finally {
				process.stdout.write = originalStdoutWrite;
				if (originalSuppressNotes === void 0) delete process.env.OPENCLAW_SUPPRESS_NOTES;
				else process.env.OPENCLAW_SUPPRESS_NOTES = originalSuppressNotes;
			}
		}
	}
	const snapshot = preflightSnapshot ?? await getConfigSnapshot();
	const commandName = commandPath[0];
	const subcommandName = commandPath[1];
	const allowInvalid = commandName ? ALLOWED_INVALID_COMMANDS.has(commandName) || commandName === "gateway" && subcommandName && ALLOWED_INVALID_GATEWAY_SUBCOMMANDS.has(subcommandName) : false;
	const { formatConfigIssueLines } = await import("./issue-format-a4DZ0fxr.js");
	const issues = snapshot.exists && !snapshot.valid ? formatConfigIssueLines(snapshot.issues, "-", { normalizeRoot: true }) : [];
	const legacyIssues = snapshot.legacyIssues.length > 0 ? formatConfigIssueLines(snapshot.legacyIssues, "-") : [];
	if (!(snapshot.exists && !snapshot.valid)) return;
	const [{ colorize, isRich, theme }, { shortenHomePath }, { formatCliCommand }] = await Promise.all([
		import("./theme-BAi-ug0-.js"),
		import("./utils-tg6rgx6A.js"),
		import("./command-format-C5JevNlu.js")
	]);
	const rich = isRich();
	const muted = (value) => colorize(rich, theme.muted, value);
	const error = (value) => colorize(rich, theme.error, value);
	const heading = (value) => colorize(rich, theme.heading, value);
	const commandText = (value) => colorize(rich, theme.command, value);
	params.runtime.error(heading("Config invalid"));
	params.runtime.error(`${muted("File:")} ${muted(shortenHomePath(snapshot.path))}`);
	if (issues.length > 0) {
		params.runtime.error(muted("Problem:"));
		params.runtime.error(issues.map((issue) => `  ${error(issue)}`).join("\n"));
	}
	if (legacyIssues.length > 0) {
		params.runtime.error(muted("Legacy config keys detected:"));
		params.runtime.error(legacyIssues.map((issue) => `  ${error(issue)}`).join("\n"));
	}
	params.runtime.error("");
	params.runtime.error(`${muted("Run:")} ${commandText(formatCliCommand("openclaw doctor --fix"))}`);
	if (!allowInvalid) params.runtime.exit(1);
}
const __test__ = { resetConfigGuardStateForTests };
//#endregion
export { __test__, ensureConfigReady };
