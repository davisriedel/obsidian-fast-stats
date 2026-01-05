import Handlebars from "handlebars";
import {
  debounce,
  type MarkdownView,
  Platform,
  type Plugin,
  type WorkspaceLeaf,
} from "obsidian";
import init, {
  StatCounter,
  StatCounterOptions,
} from "../pkg/obsidian_fast_stats";
import wasmBinary from "../pkg/obsidian_fast_stats_bg.wasm";
import parser from "./expr-parser";
import {
  DEFAULT_SETTINGS,
  type FastStatsSettings,
} from "./fast-stats-settings";
import type { StatReport } from "./stat-report";
import { getStatReport } from "./stat-report-factory";
import { pluginField, statusBarEditorPlugin } from "./status-bar-editor-plugin";

export default class FastStatsLib {
  readonly plugin: Plugin;
  private readonly loadData: () => Promise<FastStatsSettings>;
  private readonly saveData: (settings: FastStatsSettings) => Promise<void>;

  settings: FastStatsSettings = DEFAULT_SETTINGS;

  private statusBarItemEl?: HTMLElement;

  // biome-ignore  lint/suspicious/noExplicitAny: expr-eval does not provide typescript types
  private statusBarTemplate: any;

  private statCounter: StatCounter | null = null;
  private customStatTypeParsers: {
    id: string;
    // biome-ignore  lint/suspicious/noExplicitAny: expr-eval does not provide typescript types
    expr: any;
  }[] = [];
  private stats: StatReport = {};

  constructor(
    plugin: Plugin,
    loadData: () => Promise<FastStatsSettings>,
    saveData: (settings: FastStatsSettings) => Promise<void>
  ) {
    this.plugin = plugin;
    this.loadData = loadData;
    this.saveData = saveData;
  }

  private async initializeWasm() {
    await init(wasmBinary);
  }

  async load() {
    await this.initializeWasm();
    await this.loadSettings();
    await this.saveSettings(); // if default settings were loaded

    this.statCounter = new StatCounter(
      new StatCounterOptions(
        this.settings.stripComments,
        this.settings.stripCodeBlocks,
        this.settings.stripMetadataBlocks
      )
    );

    this.customStatTypeParsers = this.settings.customStatTypes.map(
      ({ id, expr }) => ({ id, expr: parser.parse(expr) })
    );

    // NOTE: We only provide the API on mobile, but not the live counting in the status bar
    if (!Platform.isDesktop) {
      return;
    }

    this.statusBarItemEl = this.plugin.addStatusBarItem();
    this.statusBarTemplate = Handlebars.compile(
      this.settings.statusBarTemplate
    );

    this.plugin.registerEditorExtension([
      pluginField.init(() => this),
      statusBarEditorPlugin,
    ]);

    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        "active-leaf-change",
        async (leaf: WorkspaceLeaf | null) => {
          if (leaf?.view.getViewType() !== "markdown") {
            this.updateAltStatusBar();
            return;
          }

          const file = (leaf.view as MarkdownView).file;
          if (file) {
            this.change(await this.plugin.app.vault.read(file));
          }

          this.updateTotals();
        }
      )
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", () => {
        this.updateTotals();
      })
    );
  }

  async loadSettings() {
    const settingsData = await this.loadData();
    this.settings = Object.assign(DEFAULT_SETTINGS, settingsData);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  change(text: string) {
    if (!this.statCounter) {
      return;
    }
    this.statCounter?.doc_changed(text);
    this.stats = getStatReport(this.customStatTypeParsers, this.statCounter);
    this.updateStatusBar();
  }

  updateStatusBar() {
    const statusBarText = this.statusBarTemplate(this.stats);
    if (!this.statusBarItemEl) {
      return;
    }
    this.statusBarItemEl.style.display = "inline-block";
    this.statusBarItemEl.setText(statusBarText);
  }

  updateAltStatusBar() {
    // TODO: Implement: Show vault totals
    if (!this.statusBarItemEl) {
      return;
    }
    this.statusBarItemEl.style.display = "none";
  }

  updateTotals() {
    // TODO: Implement: Calculate new totals
  }

  debounceChange(text: string) {
    debounce(
      (text: string) => this.change(text),
      this.settings.debounceRate,
      false
    )(text);
  }
}
