import "obsidian";
import type FastStatsApi from "./api";

declare module "obsidian" {
	interface App {
		plugins: {
			enabledPlugins: Set<string>;
			plugins: {
				"obsidian-fast-stats"?: {
					api: FastStatsApi;
				};
			};
		};
	}
}
