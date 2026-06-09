import {
  debounce,
  type MarkdownView,
  Platform,
  type Plugin,
  type WorkspaceLeaf,
} from "obsidian";
import wasmInit, { ExpressionEngine, init } from "../pkg/obsidian_fast_stats";
import wasmBinary from "../pkg/obsidian_fast_stats_bg.wasm";
import {
  DEFAULT_SETTINGS,
  type FastStatsSettings,
} from "./fast-stats-settings";
import { pluginField, statusBarEditorPlugin } from "./status-bar-editor-plugin";

export default class FastStatsLib {
  readonly plugin: Plugin;
  private readonly loadData: () => Promise<FastStatsSettings>;
  private readonly saveData: (settings: FastStatsSettings) => Promise<void>;

  settings: FastStatsSettings = DEFAULT_SETTINGS;

  private statusBarItemEl?: HTMLElement;
  private expressionEngine: ExpressionEngine | null = null;
  private currentText = "";

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
    await wasmInit(wasmBinary);
    init();
  }

  async load() {
    await this.initializeWasm();
    await this.loadSettings();
    await this.saveSettings(); // if default settings were loaded

    this.expressionEngine = new ExpressionEngine({
      strip_comments: this.settings.stripComments,
      strip_code_blocks: this.settings.stripCodeBlocks,
      strip_metadata_blocks: this.settings.stripMetadataBlocks,
    });

    // NOTE: We only provide the API on mobile, but not the live counting in the status bar
    if (!Platform.isDesktop) {
      return;
    }

    this.statusBarItemEl = this.plugin.addStatusBarItem();

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

  updateCustomStatTypes(): void {
    // Custom stat types are now handled by the Rust expression engine
    // Just trigger a status bar update if we have data
    if (Platform.isDesktop && this.expressionEngine) {
      this.updateStatusBar();
    }
  }

  change(text: string) {
    this.currentText = text;
    this.updateStatusBar();
  }

  updateStatusBar() {
    if (!(this.statusBarItemEl && this.expressionEngine)) {
      return;
    }

    try {
      // Render status bar using Rust expression engine
      // CustomStat objects can be passed directly as plain JS objects
      const statusBarText = this.expressionEngine.render_status_bar(
        this.currentText,
        this.settings.customStatTypes,
        this.settings.statusBarTemplate
      );

      this.statusBarItemEl.style.display = "inline-block";
      this.statusBarItemEl.setText(statusBarText);
    } catch (error) {
      console.error("Error rendering status bar:", error);
      this.statusBarItemEl.setText("Error");
    }
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
