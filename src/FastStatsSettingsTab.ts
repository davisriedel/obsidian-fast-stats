import { type App, PluginSettingTab } from "obsidian";
import type FastStatsLib from "./lib";

// TODO: Not implemented
export class FastStatsSettingsTab extends PluginSettingTab {
	lib: FastStatsLib;

	constructor(app: App, lib: FastStatsLib) {
		super(app, lib.plugin);
		this.lib = lib;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
	}
}
