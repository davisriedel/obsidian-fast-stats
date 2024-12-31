default:
  just --list


[private]
rustfmt:
  cargo fmt

[private]
biome:
  bun biome check --write ./src ./scripts

[private]
stylelint:
  bun stylelint --fix "src/**/*.scss"

[private]
markdownlint:
  bun markdownlint --disable MD013 --fix "**/*.md"

tsc:
  bun tsc --noEmit

check: tsc biome rustfmt stylelint markdownlint


[private]
build-wasm:
  bun ./scripts/build-wasm.ts

[private]
build: build-wasm
  bun ./scripts/build.ts

dev: build-wasm
  bun ./scripts/dev.ts

debug: build-wasm
  bun ./scripts/dev.ts --debug

build-lib: build-wasm
  bun ./scripts/build-lib.ts


release: check
  bun ./scripts/release.ts

ci: build
  bun ./scripts/create-ci-artefacts.ts

