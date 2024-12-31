/// <reference types="bun-types" />

import { $ } from "bun";

// Build rust wasm
console.log("Building rust wasm");
await $`wasm-pack build --target web`;

console.log("Applying patches");
// import.meta.url is not supported and not needed, beacuse we inline the wasm.
// Thus remove all import.meta.url occurrences from the wasm-pack output.
const file = await Bun.file("./pkg/obsidian_fast_stats.js").text();
const updatedContent = file.replace(/import\.meta\.url/g, "");
await Bun.write("./pkg/obsidian_fast_stats.js", updatedContent);
