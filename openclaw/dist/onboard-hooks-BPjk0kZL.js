import "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import "./globals-Ca-8xJiD.js";
import "./subsystem-YgTuVQVh.js";
import "./ansi-cwY8Vrne.js";
import "./boolean-B6zcAynR.js";
import "./utils-DzdaH7JM.js";
import "./boundary-path-BVHzCDEE.js";
import "./boundary-file-read-1knRHcS0.js";
import "./logger-CSnzpOlU.js";
import "./exec-vhyLuPtA.js";
import "./workspace-OTiuBtkV.js";
import { m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir } from "./agent-scope-VMfvxKRt.js";
import "./config-state-1aMcm4RG.js";
import "./registry-COOqBSUM.js";
import { t as formatCliCommand } from "./command-format-CCj3DEbG.js";
import "./frontmatter-Bl8CxKAq.js";
import "./manifest-registry-9MPsyNid.js";
import "./config-xoVkugid.js";
import "./workspace-GYv0Zk0Y.js";
import { t as buildWorkspaceHookStatus } from "./hooks-status-BHqZCyaE.js";
//#region src/commands/onboard-hooks.ts
async function setupInternalHooks(cfg, runtime, prompter) {
	await prompter.note([
		"Hooks let you automate actions when agent commands are issued.",
		"Example: Save session context to memory when you issue /new or /reset.",
		"",
		"Learn more: https://docs.openclaw.ai/automation/hooks"
	].join("\n"), "Hooks");
	const eligibleHooks = buildWorkspaceHookStatus(resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg)), { config: cfg }).hooks.filter((h) => h.eligible);
	if (eligibleHooks.length === 0) {
		await prompter.note("No eligible hooks found. You can configure hooks later in your config.", "No Hooks Available");
		return cfg;
	}
	const selected = (await prompter.multiselect({
		message: "Enable hooks?",
		options: [{
			value: "__skip__",
			label: "Skip for now"
		}, ...eligibleHooks.map((hook) => ({
			value: hook.name,
			label: `${hook.emoji ?? "🔗"} ${hook.name}`,
			hint: hook.description
		}))]
	})).filter((name) => name !== "__skip__");
	if (selected.length === 0) return cfg;
	const entries = { ...cfg.hooks?.internal?.entries };
	for (const name of selected) entries[name] = { enabled: true };
	const next = {
		...cfg,
		hooks: {
			...cfg.hooks,
			internal: {
				enabled: true,
				entries
			}
		}
	};
	await prompter.note([
		`Enabled ${selected.length} hook${selected.length > 1 ? "s" : ""}: ${selected.join(", ")}`,
		"",
		"You can manage hooks later with:",
		`  ${formatCliCommand("openclaw hooks list")}`,
		`  ${formatCliCommand("openclaw hooks enable <name>")}`,
		`  ${formatCliCommand("openclaw hooks disable <name>")}`
	].join("\n"), "Hooks Configured");
	return next;
}
//#endregion
export { setupInternalHooks };
