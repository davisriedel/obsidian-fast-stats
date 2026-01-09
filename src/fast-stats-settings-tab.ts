import type { App } from "obsidian";
import { Notice, PluginSettingTab, type Setting, SettingGroup } from "obsidian";
import type { CustomStatType } from "./custom-stat-type";
import type FastStatsLib from "./lib";

const CUSTOM_STAT_TYPE_ID_REGEX = /^[a-z0-9_]+$/;

const BUILT_IN_STATS = new Set([
  "chars",
  "charsWithoutWhitespace",
  "words",
  "sentences",
  "paragraphs",
]);

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
    this.displayCustomFunctionsDocumentation(containerEl);
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
    setting.infoEl.style.display = "none";

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

    // Only warn if the stat is used in the template AND is not a built-in stat
    // (built-in stats will continue to work after deletion)
    const templateRegex = new RegExp(`{{\\s*${statType.id}\\s*}}`, "g");
    if (
      !BUILT_IN_STATS.has(statType.id) &&
      templateRegex.test(this.lib.settings.statusBarTemplate)
    ) {
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

  private displayCustomFunctionsDocumentation(containerEl: HTMLElement): void {
    new SettingGroup(containerEl).setHeading("Available Custom Functions");

    const docContainer = containerEl.createDiv({ cls: "fast-stats-docs" });

    docContainer.createEl("h3", { text: "Built-in Variables" });
    docContainer.createEl("p", {
      text: "Available in all custom stat expressions:",
    });
    const varsUl = docContainer.createEl("ul");
    varsUl.createEl("li").innerHTML =
      "<code>chars</code> - Total character count";
    varsUl.createEl("li").innerHTML =
      "<code>charsWithoutWhitespace</code> - Characters excluding whitespace";
    varsUl.createEl("li").innerHTML = "<code>words</code> - Word count";
    varsUl.createEl("li").innerHTML = "<code>sentences</code> - Sentence count";
    varsUl.createEl("li").innerHTML =
      "<code>paragraphs</code> - Paragraph count";

    docContainer.createEl("h3", { text: "Custom Functions" });

    const functions = [
      {
        name: "roundTo(value, decimals)",
        desc: "Round a number to specified decimal places",
        examples: [
          "roundTo(3.14159, 2) → 3.14",
          "roundTo(chars / 1800, 2) → page count",
        ],
      },
      {
        name: "formatPercent(value, total, decimals)",
        desc: "Calculate and format percentage with % sign",
        examples: [
          'formatPercent(words, 50000, 1) → "42.5%"',
          'formatPercent(0, 100, 2) → "0.00%"',
        ],
      },
      {
        name: "pluralize(count, singular, plural)",
        desc: "Return singular or plural form based on count",
        examples: [
          'pluralize(words, "word", "words")',
          'pluralize(1, "page", "pages") → "page"',
        ],
      },
      {
        name: "clamp(value, min, max)",
        desc: "Constrain a value to be within a range",
        examples: [
          "clamp(pages, 0, 500) → limit to 500",
          "clamp(-5, 0, 10) → 0",
        ],
      },
      {
        name: "abbreviateNum(value, decimals)",
        desc: "Format large numbers with K, M, B suffixes",
        examples: [
          'abbreviateNum(1500, 1) → "1.5K"',
          'abbreviateNum(1000000, 0) → "1M"',
        ],
      },
      {
        name: "formatDuration(minutes)",
        desc: "Format minutes as human-readable duration",
        examples: ['formatDuration(5) → "5m"', 'formatDuration(125) → "2h 5m"'],
      },
      {
        name: "minsToTime(minutes, format)",
        desc: "Format minutes as time string with custom format",
        examples: [
          'minsToTime(5.5, "%M:%S") → "05:30"',
          'minsToTime(65, "%H:%M") → "01:05"',
        ],
      },
      {
        name: "hoursToTime(hours, format)",
        desc: "Format hours as time string with custom format",
        examples: [
          'hoursToTime(1.5, "%H:%M") → "01:30"',
          'hoursToTime(2, "%H:%M:%S") → "02:00:00"',
        ],
      },
      {
        name: "secondsToTime(seconds, format)",
        desc: "Format seconds as time string with custom format",
        examples: [
          'secondsToTime(90, "%M:%S") → "01:30"',
          'secondsToTime(3661, "%H:%M:%S") → "01:01:01"',
        ],
      },
    ];

    for (const func of functions) {
      const funcDiv = docContainer.createDiv({ cls: "fast-stats-function" });
      funcDiv.createEl("strong", { text: func.name });
      funcDiv.createEl("p", { text: func.desc });
      if (func.examples.length > 0) {
        const examplesUl = funcDiv.createEl("ul");
        for (const example of func.examples) {
          examplesUl.createEl("li").innerHTML = `<code>${example}</code>`;
        }
      }
    }

    docContainer.createEl("h3", { text: "Time Format Specifiers" });
    docContainer.createEl("p", {
      text: "Use these format codes with minsToTime, hoursToTime, and secondsToTime:",
    });
    const formatsUl = docContainer.createEl("ul");
    formatsUl.createEl("li").innerHTML = "<code>%H</code> - Hour (00-23)";
    formatsUl.createEl("li").innerHTML = "<code>%M</code> - Minute (00-59)";
    formatsUl.createEl("li").innerHTML = "<code>%S</code> - Second (00-59)";

    const note = docContainer.createEl("p", {
      cls: "fast-stats-note",
    });
    note.innerHTML =
      '<strong>Note:</strong> See <a href="https://docs.rs/chrono/latest/chrono/format/strftime/index.html" target="_blank">Chrono format documentation</a> for complete list of time format specifiers.';

    docContainer.createEl("h3", { text: "Example Custom Stats" });
    const examplesUl2 = docContainer.createEl("ul");
    examplesUl2.createEl("li").innerHTML =
      "<code>pages = roundTo(chars / 1800, 2)</code> - Standard page count";
    examplesUl2.createEl("li").innerHTML =
      "<code>readingTime = formatDuration(words / 250)</code> - Reading time estimate";
    examplesUl2.createEl("li").innerHTML =
      "<code>progress = formatPercent(words, 50000, 1)</code> - Novel progress";
    examplesUl2.createEl("li").innerHTML =
      '<code>wordLabel = pluralize(words, "word", "words")</code> - Pluralized word label';
  }
}
