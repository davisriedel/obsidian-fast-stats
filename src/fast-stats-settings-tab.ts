import type { App } from "obsidian";
import { Notice, PluginSettingTab, type Setting, SettingGroup } from "obsidian";
import type { CustomStatType } from "./custom-stat-type";
import type FastStatsLib from "./lib";

const CUSTOM_STAT_TYPE_ID_REGEX = /^[a-z0-9_]+$/;

export class FastStatsSettingsTab extends PluginSettingTab {
  lib: FastStatsLib;

  constructor(app: App, lib: FastStatsLib) {
    super(app, lib.plugin);
    this.lib = lib;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new SettingGroup(containerEl)
      .setHeading("General")
      .addSetting((setting) =>
        setting.setName("Status bar template").addText((cb) => {
          cb.setValue(this.lib.settings.statusBarTemplate);
          cb.onChange((v) => {
            this.lib.settings.statusBarTemplate = v;
            this.lib.saveSettings();
          });
        })
      )
      .addSetting((setting) =>
        setting.setName("Refresh rate").addText((cb) => {
          cb.setValue(this.lib.settings.debounceRate.toString());
          cb.onChange((v) => {
            this.lib.settings.debounceRate = Number.parseInt(v, 10);
            this.lib.saveSettings();
          });
        })
      );

    new SettingGroup(containerEl)
      .setHeading("Content Filtering")
      .addSetting((setting) =>
        setting.setName("Do not count comments").addToggle((cb) => {
          cb.setValue(this.lib.settings.stripComments);
          cb.onChange((v) => {
            this.lib.settings.stripComments = v;
            this.lib.saveSettings();
          });
        })
      )
      .addSetting((setting) =>
        setting.setName("Do not count code blocks").addToggle((cb) => {
          cb.setValue(this.lib.settings.stripCodeBlocks);
          cb.onChange((v) => {
            this.lib.settings.stripCodeBlocks = v;
            this.lib.saveSettings();
          });
        })
      )
      .addSetting((setting) =>
        setting.setName("Do not count metadata blocks").addToggle((cb) => {
          cb.setValue(this.lib.settings.stripMetadataBlocks);
          cb.onChange((v) => {
            this.lib.settings.stripMetadataBlocks = v;
            this.lib.saveSettings();
          });
        })
      );

    this.displayCustomStatTypes(containerEl);
  }

  private displayCustomStatTypes(containerEl: HTMLElement): void {
    const customStatGroup = new SettingGroup(containerEl).setHeading(
      "Custom Stat Types"
    );

    this.lib.settings.customStatTypes.forEach((statType, index) => {
      customStatGroup.addSetting((setting) => {
        this.createCustomStatTypeSetting(setting, statType, index);
      });
    });

    customStatGroup.addSetting((setting) =>
      setting.addButton((button) => {
        button
          .setButtonText("+ Add New Custom Stat Type")
          .setCta()
          .onClick(() => {
            this.addNewCustomStatType();
          });
      })
    );
  }

  private createCustomStatTypeSetting(
    setting: Setting,
    statType: CustomStatType,
    index: number
  ): void {
    setting.settingEl.style.display = "flex";

    let pendingId = statType.id;
    let pendingExpr = statType.expr;
    let hasChanges = false;

    setting.addText((text) => {
      text
        .setPlaceholder("ID (e.g., words, pages)")
        .setValue(statType.id)
        .onChange((value) => {
          pendingId = value.trim().toLowerCase();
          hasChanges = true;

          if (this.validateCustomStatTypeId(pendingId, index)) {
            text.inputEl.removeClass("is-invalid");
          } else {
            text.inputEl.addClass("is-invalid");
          }
        });
    });

    setting.addText((text) => {
      text
        .setPlaceholder("Expression (e.g., Words, Chars / 1800)")
        .setValue(statType.expr)
        .onChange((value) => {
          pendingExpr = value;
          hasChanges = true;
        });
      text.inputEl.style.flexGrow = "1";
    });

    setting.addButton((button) => {
      button
        .setIcon("checkmark")
        .setTooltip("Save changes")
        .onClick(() => {
          if (!hasChanges) {
            return;
          }

          if (!this.validateCustomStatTypeId(pendingId, index)) {
            new Notice(
              "Invalid ID: must be lowercase alphanumeric with underscores and unique"
            );
            return;
          }

          this.lib.settings.customStatTypes[index].id = pendingId;
          this.lib.settings.customStatTypes[index].expr = pendingExpr;
          this.lib.saveSettings();
          this.lib.updateCustomStatTypes();
          this.display();
        });
    });

    setting.addButton((button) => {
      button
        .setIcon("up-chevron-glyph")
        .setTooltip("Move up")
        .onClick(() => {
          this.moveCustomStatType(index, "up");
        });

      if (index === 0) {
        button.buttonEl.style.visibility = "hidden";
      }
    });

    setting.addButton((button) => {
      button
        .setIcon("down-chevron-glyph")
        .setTooltip("Move down")
        .onClick(() => {
          this.moveCustomStatType(index, "down");
        });

      if (index === this.lib.settings.customStatTypes.length - 1) {
        button.buttonEl.style.visibility = "hidden";
      }
    });

    setting.addButton((button) => {
      button
        .setIcon("trash")
        .setTooltip("Delete")
        .onClick(() => {
          this.deleteCustomStatType(index);
        });
    });
  }

  private addNewCustomStatType(): void {
    let counter = 1;
    let newId = `custom${counter}`;

    while (this.lib.settings.customStatTypes.some((st) => st.id === newId)) {
      counter++;
      newId = `custom${counter}`;
    }

    this.lib.settings.customStatTypes.push({
      id: newId,
      expr: "0",
    });

    this.lib.saveSettings();
    this.lib.updateCustomStatTypes();
    this.display();
  }

  private moveCustomStatType(index: number, direction: "up" | "down"): void {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= this.lib.settings.customStatTypes.length) {
      return;
    }

    const temp = this.lib.settings.customStatTypes[index];
    this.lib.settings.customStatTypes[index] =
      this.lib.settings.customStatTypes[newIndex];
    this.lib.settings.customStatTypes[newIndex] = temp;

    this.lib.saveSettings();
    this.lib.updateCustomStatTypes();
    this.display();
  }

  private deleteCustomStatType(index: number): void {
    const statType = this.lib.settings.customStatTypes[index];

    const templateRegex = new RegExp(`{{\\s*${statType.id}\\s*}}`, "g");
    if (templateRegex.test(this.lib.settings.statusBarTemplate)) {
      new Notice(
        `Warning: "${statType.id}" is used in your status bar template. Remove it from the template first or update it after deletion.`,
        5000
      );
    }

    this.lib.settings.customStatTypes.splice(index, 1);
    this.lib.saveSettings();
    this.lib.updateCustomStatTypes();
    this.display();
  }

  private validateCustomStatTypeId(id: string, currentIndex: number): boolean {
    if (!id || id.length === 0) {
      return false;
    }

    if (!CUSTOM_STAT_TYPE_ID_REGEX.test(id)) {
      return false;
    }

    const isDuplicate = this.lib.settings.customStatTypes.some(
      (st, idx) => idx !== currentIndex && st.id === id
    );

    return !isDuplicate;
  }
}
