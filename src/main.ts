import { type App, Plugin, type PluginManifest } from "obsidian";
import type { FastStatsSettings } from "./FastStatsSettings";
import { FastStatsSettingsTab } from "./FastStatsSettingsTab";
import FastStatsApi from "./api/api";
import FastStatsLib from "./lib";

export default class FastStatsPlugin extends Plugin {
	private lib: FastStatsLib;
	public api: FastStatsApi;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.lib = new FastStatsLib(
			this,
			async () => await this.loadData(),
			async (settings: FastStatsSettings) => await this.saveData(settings),
		);
		this.api = new FastStatsApi(this.lib);
	}

	override async onload() {
		await this.lib.load();
		this.addSettingTab(new FastStatsSettingsTab(this.app, this.lib));
	}
}
