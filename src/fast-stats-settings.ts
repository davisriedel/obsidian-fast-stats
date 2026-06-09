import type { CustomStatType } from "./custom-stat-type";

export interface FastStatsSettings {
  customStatTypes: CustomStatType[];
  statusBarTemplate: string;
  stripComments: boolean;
  stripCodeBlocks: boolean;
  stripMetadataBlocks: boolean;
  debounceRate: number;

  version: string | null;
  isAnnounceUpdatesEnabled: boolean;
}

export const DEFAULT_SETTINGS: FastStatsSettings = {
  customStatTypes: [
    {
      id: "pages",
      expr: "roundTo(chars / 1800, 2)",
    },
    {
      id: "read",
      expr: "formatDuration(words / 183)",
    },
  ],
  statusBarTemplate: "{{chars}}c {{words}}w {{pages}}p {{read}}",
  stripComments: true,
  stripCodeBlocks: true,
  stripMetadataBlocks: true,
  debounceRate: 500,
  version: null,
  isAnnounceUpdatesEnabled: true,
};
