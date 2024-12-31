/// <reference types="bun-types" />

import { $ } from "bun";
import { buildPlugin } from "./utils/build";

await $`mkdir -p dist`;

console.log("Building plugin");
await buildPlugin("./dist");
