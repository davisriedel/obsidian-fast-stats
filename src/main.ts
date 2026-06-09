import { type App, Plugin, type PluginManifest } from "obsidian";
import FastStatsApi from "./api/api";
import type { FastStatsSettings } from "./fast-stats-settings";
import { FastStatsSettingsTab } from "./fast-stats-settings-tab";
import FastStatsLib from "./lib";
import { UpdateModal } from "./update-modal";

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

    // Load update announcer
    this.app.workspace.onLayoutReady(() => {
      this.announceUpdate();
    });
  }

  private announceUpdate() {
    const currentVersion = this.manifest.version;
    const knownVersion = this.lib.settings.version;

    if (!knownVersion) {
      return; // do not announce on first install
    }
    if (currentVersion === knownVersion) {
      return;
    }

    this.lib.settings.version = currentVersion;
    this.lib.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });

    if (this.lib.settings.isAnnounceUpdatesEnabled === false) {
      return;
    }

    const updateModal = new UpdateModal(this.app, currentVersion, knownVersion);
    updateModal.open();
  }
}
