import type { CustomStatType } from "./CustomStatType";

export interface FastStatsSettings {
	customStatTypes: CustomStatType[];
	statusBarTemplate: string;
	stripComments: boolean;
	stripCodeBlocks: boolean;
	stripMetadataBlocks: boolean;
	debounceRate: number;
}

export const DEFAULT_SETTINGS: FastStatsSettings = {
	customStatTypes: [
		{
			id: "words",
			expr: "Words",
		},
		{
			id: "chars",
			expr: "Chars",
		},
		{
			id: "pages",
			expr: "roundTo(Chars / 1800, 2)",
		},
		{
			id: "read",
			expr: "minsToTime(Words / 183, 'mm:ss')",
		},
	],
	statusBarTemplate: "{{chars}}c {{words}}w {{pages}}p {{read}}r",
	stripComments: true,
	stripCodeBlocks: false,
	stripMetadataBlocks: true,
	debounceRate: 50,
};
