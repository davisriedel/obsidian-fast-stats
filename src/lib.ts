import {
	type MarkdownView,
	type Plugin,
	type WorkspaceLeaf,
	debounce,
} from "obsidian";

import Handlebars from "handlebars";
import init, {
	StatCounter,
	StatCounterOptions,
} from "../pkg/obsidian_fast_stats";
import wasmBinary from "../pkg/obsidian_fast_stats_bg.wasm";
import parser from "./ExprParser";
import { DEFAULT_SETTINGS, type FastStatsSettings } from "./FastStatsSettings";
import type { StatReport } from "./StatReport";
import { getStatReport } from "./StatReportFactory";
import { pluginField, statusBarEditorPlugin } from "./StatusBarEditorPlugin";

export default class FastStatsLib {
	public readonly plugin: Plugin;
	private readonly loadData: () => Promise<FastStatsSettings>;
	private readonly saveData: (settings: FastStatsSettings) => Promise<void>;

	private settings: FastStatsSettings = DEFAULT_SETTINGS;

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
		saveData: (settings: FastStatsSettings) => Promise<void>,
	) {
		this.plugin = plugin;
		this.loadData = loadData;
		this.saveData = saveData;
	}

	private async initializeWasm() {
		// @ts-ignore
		await init(wasmBinary);
	}

	public async load() {
		await this.initializeWasm();
		await this.loadSettings();
		await this.saveSettings(); // if default settings were loaded

		this.statCounter = new StatCounter(
			new StatCounterOptions(
				this.settings.stripComments,
				this.settings.stripCodeBlocks,
				this.settings.stripMetadataBlocks,
			),
		);

		this.customStatTypeParsers = this.settings.customStatTypes.map(
			({ id, expr }) => ({ id, expr: parser.parse(expr) }),
		);

		this.statusBarItemEl = this.plugin.addStatusBarItem();
		this.statusBarTemplate = Handlebars.compile(
			this.settings.statusBarTemplate,
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
					if (file) this.change(await this.plugin.app.vault.read(file));

					this.updateTotals();
				},
			),
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on("delete", async () => {
				this.updateTotals();
			}),
		);
	}

	public async loadSettings() {
		const settingsData = await this.loadData();
		this.settings = Object.assign(DEFAULT_SETTINGS, settingsData);
	}

	public async saveSettings() {
		await this.saveData(this.settings);
	}

	change(text: string) {
		if (!this.statCounter) return;
		this.statCounter?.doc_changed(text);
		this.stats = getStatReport(this.customStatTypeParsers, this.statCounter);
		this.updateStatusBar();
	}

	updateStatusBar() {
		const statusBarText = this.statusBarTemplate(this.stats);
		if (!this.statusBarItemEl) return;
		this.statusBarItemEl.style.display = "inline-block";
		this.statusBarItemEl.setText(statusBarText);
	}

	updateAltStatusBar() {
		// TODO: Implement: Show vault totals
		if (!this.statusBarItemEl) return;
		this.statusBarItemEl.style.display = "none";
	}

	updateTotals() {
		// TODO: Implement: Calculate new totals
	}

	debounceChange(text: string) {
		debounce(
			(text: string) => this.change(text),
			this.settings.debounceRate,
			false,
		)(text);
	}
}
