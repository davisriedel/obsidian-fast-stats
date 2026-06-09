default:
  just --list

rs-lint:
  cargo fmt
  cargo clippy

ts-lint:
  bun biome check --write ./src ./scripts

lint:
  just rs-lint
  just ts-lint

stylelint:
  bun stylelint --fix "src/**/*.scss"

markdownlint:
  bun markdownlint --disable MD013 --fix "**/*.md"

typecheck:
  bun tsgo --noEmit

test:
  cargo test

check: typecheck test lint stylelint markdownlint

build:
  bun ./scripts/build.ts

dev:
  bun ./scripts/dev.ts

debug:
  bun ./scripts/dev.ts --debug

build-lib:
  bun ./scripts/build.ts --lib


release: check
  bun ./scripts/release.ts

ci: build
  bun ./scripts/generate-ci-artefacts.ts

