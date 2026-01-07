import { normalizePath, TFile } from "obsidian";
import {
  ExpressionEngine,
  type ParserOptions,
} from "../../pkg/obsidian_fast_stats";
import type FastStatsLib from "../lib";

export default class Api {
  private lib: FastStatsLib;

  constructor(lib: FastStatsLib) {
    this.lib = lib;
  }

  getStat(text: string, expr: string, options: ParserOptions): number {
    const engine = new ExpressionEngine(options);
    return engine.evaluate_expression(text, expr);
  }

  private async countPagePath(
    path: string,
    countFunc: (text: string) => number
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

  async getStatFromPageAtPath(
    path: string,
    expr: string,
    options: ParserOptions
  ): Promise<number | null> {
    return await this.countPagePath(path, (text) =>
      this.getStat(text, expr, options)
    );
  }
}
