# Syntax Highlighting

## Overview

`src/lib/highlight.ts` owns fenced-code syntax highlighting.

It resolves fence aliases, loads Tree-sitter parsers and highlight queries,
maps capture names into the active syntax palette, and returns colored chunks
for OpenTUI to render.

## Why Vendored Assets Exist

`inktty` cannot rely on npm packages alone for every grammar it supports.

- Some upstream grammars do not ship a usable parser `.wasm` for the current
  `web-tree-sitter` loader.
- Some parsers are available on npm but the package does not include a usable
  `queries/highlights.scm`.
- Some query files need to be pinned or lightly adapted in-tree instead of being
  fetched from a moving branch.

The repo therefore commits a small set of vendored Tree-sitter assets under
`src/lib/tree-sitter-*`.

The rebuild flow exists so those committed parser and query files can be
regenerated from pinned upstream sources instead of being hand-edited or copied
manually.

That gives contributors three useful properties:

- normal installs do not need Docker, Emscripten, or local grammar clones
- vendored binaries are reproducible from source
- version bumps can be reviewed as manifest changes plus regenerated outputs

## What The Rebuild Covers

`bun run highlights-rebuild` runs `scripts/highlights-rebuild.ts`.

That script reads `scripts/highlights-vendored.json`, clones each upstream
grammar at its pinned revision, optionally runs `tree-sitter generate`, builds
the parser `.wasm`, and copies or fetches the configured highlight queries into
`src/lib/tree-sitter-*`.

The manifest currently covers grammars whose vendored outputs can be rebuilt
directly from upstream source:

- Rego
- Diff
- Dockerfile
- SQL

Important manifest fields:

- `revision`: the exact immutable source revision to rebuild from
- `checkoutRef`: optional branch/tag to check out before pinning a commit
- `generate`: run `tree-sitter generate` before `build --wasm`
- `parserPath`: where the built `.wasm` is committed in this repo
- `queries`: query source/target mappings copied into this repo

## Query Source Policy

Use immutable sources for vendored queries.

For `nvim-treesitter`, that means using the archived repo's final commit rather
than a moving branch or tag lookup during rebuilds.

- archived final commit: `4916d6592ede8c07973490d9322f187e07dfefac`

Diff and Dockerfile highlight queries are fetched from that exact commit.

HCL and Kotlin are different.

Their parser `.wasm` files come from npm packages, but their vendored query
files are maintained locally because they are adapted to the npm parser package
shapes and to `inktty`'s capture palette. They are attributed to
`nvim-treesitter`, but they are not rebuilt directly by
`bun run highlights-rebuild`.

## Current Pinned Sources

- Rego: latest usable upstream commit because the upstream repo does not publish
  release tags
- Diff: parser from `the-mikedavis/tree-sitter-diff` `v0.1.0`, query from the
  final archived `nvim-treesitter` commit
- Dockerfile: parser from `camdencheek/tree-sitter-dockerfile` `v0.2.0`, query
  from the final archived `nvim-treesitter` commit
- SQL: parser and query from `derekstride/tree-sitter-sql` `v0.3.11`; rebuilds
  run `tree-sitter generate` first because the release tag does not commit the
  generated parser sources needed for `build --wasm`

## Version Alignment

Keep the `tree-sitter-cli` version in `scripts/highlights-vendored.json`
aligned with the installed `web-tree-sitter` runtime.

When the runtime is upgraded:

1. update `web-tree-sitter` in `package.json`
2. update `treeSitterCliVersion` in `scripts/highlights-vendored.json`
3. run `bun run highlights-rebuild`
4. run validation commands

Recommended validation commands:

```bash
bun test
bun run typecheck
bun run lint
```

## When To Run The Rebuild

Run `bun run highlights-rebuild` when:

- changing `scripts/highlights-vendored.json`
- upgrading `web-tree-sitter`
- bumping a vendored parser/query source revision
- intentionally refreshing the committed `.wasm` or vendored query outputs

`tree-sitter build --wasm` requires the usual Tree-sitter wasm toolchain.
In practice that means Docker or a compatible Emscripten setup must be
available when you run the rebuild locally.
