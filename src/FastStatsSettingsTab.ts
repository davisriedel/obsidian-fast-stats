import type { App } from "obsidian";
import {
	// Component,
	// MarkdownRenderer,
	PluginSettingTab,
	Setting,
} from "obsidian";
import type FastStatsLib from "./lib";

export class FastStatsSettingsTab extends PluginSettingTab {
	lib: FastStatsLib;

	constructor(app: App, lib: FastStatsLib) {
		super(app, lib.plugin);
		this.lib = lib;
	}

	// private addHeading(text: string) {
	// 	return new Setting(this.containerEl).setName(text).setHeading();
	// }
	//
	// private addText(text: string) {
	// 	return new Setting(this.containerEl).setName(text);
	// }

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

    // TODO: make custom stat types editable

    new Setting(containerEl)
      .setName("Status bar template")
      .addText(cb => {
        cb.setValue(this.lib.settings.statusBarTemplate);
        cb.onChange(v => {
          this.lib.settings.statusBarTemplate = v;
          this.lib.saveSettings();
        })
      })

    new Setting(containerEl)
      .setName("Do not count comments")
      .addToggle(cb => {
        cb.setValue(this.lib.settings.stripComments);
        cb.onChange(v => {
          this.lib.settings.stripComments = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Do not count code blocks")
      .addToggle(cb => {
        cb.setValue(this.lib.settings.stripCodeBlocks);
        cb.onChange(v => {
          this.lib.settings.stripCodeBlocks = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Do not count metadata blocks")
      .addToggle(cb => {
        cb.setValue(this.lib.settings.stripMetadataBlocks);
        cb.onChange(v => {
          this.lib.settings.stripMetadataBlocks = v;
          this.lib.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Refresh rate")
      .addText(cb => {
        cb.setValue(this.lib.settings.debounceRate.toString());
        cb.onChange(v => {
          this.lib.settings.debounceRate = parseInt(v);
          this.lib.saveSettings();
        })
      })
	}
}
