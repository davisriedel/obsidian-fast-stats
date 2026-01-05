import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type FastStatsLib from "./lib";

export class FastStatsSettingsTab extends PluginSettingTab {
  lib: FastStatsLib;

  constructor(app: App, lib: FastStatsLib) {
    super(app, lib.plugin);
    this.lib = lib;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Status bar template").addText((cb) => {
      cb.setValue(this.lib.settings.statusBarTemplate);
      cb.onChange((v) => {
        this.lib.settings.statusBarTemplate = v;
        this.lib.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("Do not count comments")
      .addToggle((cb) => {
        cb.setValue(this.lib.settings.stripComments);
        cb.onChange((v) => {
          this.lib.settings.stripComments = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Do not count code blocks")
      .addToggle((cb) => {
        cb.setValue(this.lib.settings.stripCodeBlocks);
        cb.onChange((v) => {
          this.lib.settings.stripCodeBlocks = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Do not count metadata blocks")
      .addToggle((cb) => {
        cb.setValue(this.lib.settings.stripMetadataBlocks);
        cb.onChange((v) => {
          this.lib.settings.stripMetadataBlocks = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl).setName("Refresh rate").addText((cb) => {
      cb.setValue(this.lib.settings.debounceRate.toString());
      cb.onChange((v) => {
        this.lib.settings.debounceRate = Number.parseInt(v, 10);
        this.lib.saveSettings();
      });
    });
  }
}
