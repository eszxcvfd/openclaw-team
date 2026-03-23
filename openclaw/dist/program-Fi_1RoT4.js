import { A as hasFlag, j as hasHelpOrVersion, k as getVerboseFlag, w as getCommandPathWithRootOptions } from "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import { s as setVerbose } from "./globals-Ca-8xJiD.js";
import { m as defaultRuntime } from "./subsystem-YgTuVQVh.js";
import "./ansi-cwY8Vrne.js";
import "./boolean-B6zcAynR.js";
import { t as isTruthyEnvValue } from "./env-CQLG1scp.js";
import "./utils-DzdaH7JM.js";
import "./links-g7g5mVf0.js";
import { n as VERSION } from "./version-GCXYdDuZ.js";
import "./registry-COOqBSUM.js";
import { n as resolveCliName } from "./cli-name-BRhM-_2l.js";
import "./ports-lsof-CUMUP6h0.js";
import { n as resolveCliChannelOptions } from "./channel-options-CMtaUHhr.js";
import "./register.subclis-CglUEqJa.js";
import { i as registerProgramCommands } from "./command-registry-CburOBKW.js";
import { n as setProgramContext } from "./program-context-BJ16dyAC.js";
import "./ports-DPNbyyxS.js";
import { t as emitCliBanner } from "./banner-uc49j4x_.js";
import { t as configureProgramHelp } from "./help-CvKEUNoD.js";
import { Command } from "commander";
//#region src/cli/program/context.ts
function createProgramContext() {
	let cachedChannelOptions;
	const getChannelOptions = () => {
		if (cachedChannelOptions === void 0) cachedChannelOptions = resolveCliChannelOptions();
		return cachedChannelOptions;
	};
	return {
		programVersion: VERSION,
		get channelOptions() {
			return getChannelOptions();
		},
		get messageChannelOptions() {
			return getChannelOptions().join("|");
		},
		get agentChannelOptions() {
			return ["last", ...getChannelOptions()].join("|");
		}
	};
}
//#endregion
//#region src/cli/program/preaction.ts
function setProcessTitleForCommand(actionCommand) {
	let current = actionCommand;
	while (current.parent && current.parent.parent) current = current.parent;
	const name = current.name();
	const cliName = resolveCliName();
	if (!name || name === cliName) return;
	process.title = `${cliName}-${name}`;
}
const PLUGIN_REQUIRED_COMMANDS = new Set([
	"message",
	"channels",
	"directory",
	"agents",
	"configure",
	"status",
	"health"
]);
const CONFIG_GUARD_BYPASS_COMMANDS = new Set([
	"backup",
	"doctor",
	"completion",
	"secrets"
]);
const JSON_PARSE_ONLY_COMMANDS = new Set(["config set"]);
let configGuardModulePromise;
let pluginRegistryModulePromise;
function shouldBypassConfigGuard(commandPath) {
	const [primary, secondary] = commandPath;
	if (!primary) return false;
	if (CONFIG_GUARD_BYPASS_COMMANDS.has(primary)) return true;
	if (primary === "config" && secondary === "validate") return true;
	return false;
}
function loadConfigGuardModule() {
	configGuardModulePromise ??= import("./config-guard-CpPJvCpc.js");
	return configGuardModulePromise;
}
function loadPluginRegistryModule() {
	pluginRegistryModulePromise ??= import("./plugin-registry-CCsPPB0z.js");
	return pluginRegistryModulePromise;
}
function resolvePluginRegistryScope(commandPath) {
	return commandPath[0] === "status" || commandPath[0] === "health" ? "channels" : "all";
}
function shouldLoadPluginsForCommand(commandPath, argv) {
	const [primary, secondary] = commandPath;
	if (!primary || !PLUGIN_REQUIRED_COMMANDS.has(primary)) return false;
	if ((primary === "status" || primary === "health") && hasFlag(argv, "--json")) return false;
	if (primary === "onboard" || primary === "channels" && secondary === "add") return false;
	return true;
}
function getRootCommand(command) {
	let current = command;
	while (current.parent) current = current.parent;
	return current;
}
function getCliLogLevel(actionCommand) {
	const root = getRootCommand(actionCommand);
	if (typeof root.getOptionValueSource !== "function") return;
	if (root.getOptionValueSource("logLevel") !== "cli") return;
	const logLevel = root.opts().logLevel;
	return typeof logLevel === "string" ? logLevel : void 0;
}
function isJsonOutputMode(commandPath, argv) {
	if (!hasFlag(argv, "--json")) return false;
	const key = `${commandPath[0] ?? ""} ${commandPath[1] ?? ""}`.trim();
	if (JSON_PARSE_ONLY_COMMANDS.has(key)) return false;
	return true;
}
function registerPreActionHooks(program, programVersion) {
	program.hook("preAction", async (_thisCommand, actionCommand) => {
		setProcessTitleForCommand(actionCommand);
		const argv = process.argv;
		if (hasHelpOrVersion(argv)) return;
		const commandPath = getCommandPathWithRootOptions(argv, 2);
		if (!(isTruthyEnvValue(process.env.OPENCLAW_HIDE_BANNER) || commandPath[0] === "update" || commandPath[0] === "completion" || commandPath[0] === "plugins" && commandPath[1] === "update")) emitCliBanner(programVersion);
		const verbose = getVerboseFlag(argv, { includeDebug: true });
		setVerbose(verbose);
		const cliLogLevel = getCliLogLevel(actionCommand);
		if (cliLogLevel) process.env.OPENCLAW_LOG_LEVEL = cliLogLevel;
		if (!verbose) process.env.NODE_NO_WARNINGS ??= "1";
		if (shouldBypassConfigGuard(commandPath)) return;
		const suppressDoctorStdout = isJsonOutputMode(commandPath, argv);
		const { ensureConfigReady } = await loadConfigGuardModule();
		await ensureConfigReady({
			runtime: defaultRuntime,
			commandPath,
			...suppressDoctorStdout ? { suppressDoctorStdout: true } : {}
		});
		if (shouldLoadPluginsForCommand(commandPath, argv)) {
			const { ensurePluginRegistryLoaded } = await loadPluginRegistryModule();
			ensurePluginRegistryLoaded({ scope: resolvePluginRegistryScope(commandPath) });
		}
	});
}
//#endregion
//#region src/cli/program/build-program.ts
function buildProgram() {
	const program = new Command();
	const ctx = createProgramContext();
	const argv = process.argv;
	setProgramContext(program, ctx);
	configureProgramHelp(program, ctx);
	registerPreActionHooks(program, ctx.programVersion);
	registerProgramCommands(program, ctx, argv);
	return program;
}
//#endregion
export { buildProgram };
