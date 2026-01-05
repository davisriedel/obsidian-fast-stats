import type { CustomStatType } from "./custom-stat-type";

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
      expr: "words",
    },
    {
      id: "chars",
      expr: "chars",
    },
    {
      id: "pages",
      expr: "roundTo(chars / 1800, 2)",
    },
    {
      id: "read",
      expr: "minsToTime(words / 183, 'mm:ss')",
    },
  ],
  statusBarTemplate: "{{chars}}c {{words}}w {{pages}}p {{read}}r",
  stripComments: true,
  stripCodeBlocks: false,
  stripMetadataBlocks: true,
  debounceRate: 50,
};
