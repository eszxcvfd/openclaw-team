import "./src-CmXHIz5f.js";
import "./redact-BDinS1q9.js";
import "./errors-BxyFnvP3.js";
import "./unhandled-rejections-CDJ8dOVP.js";
import "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import "./globals-Ca-8xJiD.js";
import { m as defaultRuntime } from "./subsystem-YgTuVQVh.js";
import "./ansi-cwY8Vrne.js";
import "./boolean-B6zcAynR.js";
import "./env-CQLG1scp.js";
import "./warning-filter-hHA7Rorp.js";
import "./utils-DzdaH7JM.js";
import "./links-g7g5mVf0.js";
import "./models-config.providers.discovery-CdeTbmVZ.js";
import { ba as unsetConfiguredMcpServer, ui as parseConfigValue, va as listConfiguredMcpServers, ya as setConfiguredMcpServer } from "./auth-profiles-CmO7TMIb.js";
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
//#region src/cli/mcp-cli.ts
function fail(message) {
	defaultRuntime.error(message);
	defaultRuntime.exit(1);
	throw new Error(message);
}
function printJson(value) {
	defaultRuntime.log(JSON.stringify(value, null, 2));
}
function registerMcpCli(program) {
	const mcp = program.command("mcp").description("Manage OpenClaw MCP server config");
	mcp.command("list").description("List configured MCP servers").option("--json", "Print JSON").action(async (opts) => {
		const loaded = await listConfiguredMcpServers();
		if (!loaded.ok) fail(loaded.error);
		if (opts.json) {
			printJson(loaded.mcpServers);
			return;
		}
		const names = Object.keys(loaded.mcpServers).toSorted();
		if (names.length === 0) {
			defaultRuntime.log(`No MCP servers configured in ${loaded.path}.`);
			return;
		}
		defaultRuntime.log(`MCP servers (${loaded.path}):`);
		for (const name of names) defaultRuntime.log(`- ${name}`);
	});
	mcp.command("show").description("Show one configured MCP server or the full MCP config").argument("[name]", "MCP server name").option("--json", "Print JSON").action(async (name, opts) => {
		const loaded = await listConfiguredMcpServers();
		if (!loaded.ok) fail(loaded.error);
		const value = name ? loaded.mcpServers[name] : loaded.mcpServers;
		if (name && !value) fail(`No MCP server named "${name}" in ${loaded.path}.`);
		if (opts.json) {
			printJson(value ?? {});
			return;
		}
		if (name) defaultRuntime.log(`MCP server "${name}" (${loaded.path}):`);
		else defaultRuntime.log(`MCP servers (${loaded.path}):`);
		printJson(value ?? {});
	});
	mcp.command("set").description("Set one configured MCP server from a JSON object").argument("<name>", "MCP server name").argument("<value>", "JSON object, for example {\"command\":\"uvx\",\"args\":[\"context7-mcp\"]}").action(async (name, rawValue) => {
		const parsed = parseConfigValue(rawValue);
		if (parsed.error) fail(parsed.error);
		const result = await setConfiguredMcpServer({
			name,
			server: parsed.value
		});
		if (!result.ok) fail(result.error);
		defaultRuntime.log(`Saved MCP server "${name}" to ${result.path}.`);
	});
	mcp.command("unset").description("Remove one configured MCP server").argument("<name>", "MCP server name").action(async (name) => {
		const result = await unsetConfiguredMcpServer({ name });
		if (!result.ok) fail(result.error);
		if (!result.removed) fail(`No MCP server named "${name}" in ${result.path}.`);
		defaultRuntime.log(`Removed MCP server "${name}" from ${result.path}.`);
	});
}
//#endregion
export { registerMcpCli };
