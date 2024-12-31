/// <reference types="bun-types" />

import { $ } from "bun";
import { buildLib } from "./utils/build";

await $`mkdir -p lib-dist`;

console.log("Building lib");
await buildLib("./lib-dist");
