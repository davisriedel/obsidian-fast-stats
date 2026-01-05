import { type App, Plugin, type PluginManifest } from "obsidian";
import FastStatsApi from "./api/api";
import type { FastStatsSettings } from "./fast-stats-settings";
import { FastStatsSettingsTab } from "./fast-stats-settings-tab";
import FastStatsLib from "./lib";

export default class FastStatsPlugin extends Plugin {
  private lib: FastStatsLib;
  api: FastStatsApi;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.lib = new FastStatsLib(
      this,
      async () => await this.loadData(),
      async (settings: FastStatsSettings) => await this.saveData(settings)
    );
    this.api = new FastStatsApi(this.lib);
  }

  override async onload() {
    await this.lib.load();
    this.addSettingTab(new FastStatsSettingsTab(this.app, this.lib));
  }
}
