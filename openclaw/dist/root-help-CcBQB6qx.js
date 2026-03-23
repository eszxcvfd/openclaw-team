import "./logger-BG-0yWA-.js";
import "./paths-GHJ97ebE.js";
import "./theme-CWrxY1-_.js";
import "./globals-Ca-8xJiD.js";
import "./ansi-cwY8Vrne.js";
import "./utils-DzdaH7JM.js";
import "./links-g7g5mVf0.js";
import { n as VERSION } from "./version-GCXYdDuZ.js";
import { t as getCoreCliCommandDescriptors } from "./core-command-descriptors-bnzfMprk.js";
import { n as getSubCliEntries } from "./subcli-descriptors-DbC3-N0T.js";
import "./banner-uc49j4x_.js";
import { t as configureProgramHelp } from "./help-CvKEUNoD.js";
import { Command } from "commander";
//#region src/cli/program/root-help.ts
function buildRootHelpProgram() {
	const program = new Command();
	configureProgramHelp(program, {
		programVersion: VERSION,
		channelOptions: [],
		messageChannelOptions: "",
		agentChannelOptions: ""
	});
	for (const command of getCoreCliCommandDescriptors()) program.command(command.name).description(command.description);
	for (const command of getSubCliEntries()) program.command(command.name).description(command.description);
	return program;
}
function outputRootHelp() {
	buildRootHelpProgram().outputHelp();
}
//#endregion
export { outputRootHelp };
