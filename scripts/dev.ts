/// <reference types="bun-types" />

import { parseArgs } from "node:util";
import { build } from "./common/scripts/build";
import { setupTestVault } from './common/scripts/setupTestVault';

const { values: args } = parseArgs({
	args: Bun.argv,
	options: {
		debug: {
			type: "boolean",
		},
	},
	strict: true,
	allowPositionals: true,
});

await build("src", { main: "main.ts", styles: "styles/index.scss" }, "dist", "cjs", args.debug, false, { build: false });

await setupTestVault("obsidian-fast-stats", "./test-vault");
