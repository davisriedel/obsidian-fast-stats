import { TFile, normalizePath } from "obsidian";
import { StatCounter } from "../../pkg/obsidian_fast_stats";
import { StatCounterOptions } from "../../pkg/obsidian_fast_stats";
import parser from "../ExprParser";
import { calculateMetric } from "../StatReportFactory";
import type FastStatsLib from "../lib";

export type StatCounterOptionsFieldsType = {
	stripComments: boolean;
	stripCodeBlocks: boolean;
	stripMetadataBlocks: boolean;
};

export default class Api {
	private lib: FastStatsLib;

	constructor(lib: FastStatsLib) {
		this.lib = lib;
	}

	public getStat(
		text: string,
		expr: string,
		options: StatCounterOptionsFieldsType,
	): number {
		const c = new StatCounter(
			new StatCounterOptions(
				options.stripComments,
				options.stripCodeBlocks,
				options.stripMetadataBlocks,
			),
		);
		c.doc_changed(text);
		return calculateMetric(c, parser.parse(expr));
	}

	private async countPagePath(
		path: string,
		countFunc: (text: string) => number,
	): Promise<number | null> {
		const normalizedPath = normalizePath(path);
		const file =
			this.lib.plugin.app.vault.getAbstractFileByPath(normalizedPath);

		// Check if it exists and is of the correct type
		if (file instanceof TFile) {
			const text = await this.lib.plugin.app.vault.cachedRead(file);
			return countFunc(text);
		}

		return null;
	}

	public async getStatFromPageAtPath(
		path: string,
		expr: string,
		options: StatCounterOptionsFieldsType,
	): Promise<number | null> {
		return this.countPagePath(path, (text) =>
			this.getStat(text, expr, options),
		);
	}
}
