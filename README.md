# inktty

A simple terminal markdown reader built with OpenTUI.

## Runtime Requirement

`ink` requires Bun to run.

`ink` runs on the Bun runtime, so Bun is required even when you invoke `ink` directly.

Use Bun `>=1.0.0`.

## Usage

One-time setup from this repository:

```bash
bun install
bun link
```

Then use `ink` normally:

```bash
ink <path-to-file.md>
```

Use a specific theme:

```bash
ink --theme nord <path-to-file.md>
```

List embedded and user themes:

```bash
ink --list-themes
```

If you prefer not to link the CLI, you can still run it directly with Bun:

```bash
bun run start -- <path-to-file.md>
```

## Example

```bash
ink example.md
```

## Technical Documentation

Implementation notes live in [`docs/`](docs/README.md):

- [Architecture](docs/architecture.md)
- [Themes](docs/themes.md)
- [Testing](docs/testing.md)

Theme override examples live in [`examples/themes/`](examples/themes/README.md).

## Attribution

inktty vendors adapted Tree-sitter highlight queries from
[`nvim-treesitter`](https://github.com/nvim-treesitter/nvim-treesitter) for:

- `src/lib/tree-sitter-hcl/highlights.scm`
- `src/lib/tree-sitter-kotlin/highlights.scm`
- `src/lib/tree-sitter-diff/highlights.scm`
- `src/lib/tree-sitter-dockerfile/highlights.scm`

Those vendored query files are used under the upstream Apache-2.0 license and
remain attributed in the source headers.

For Diff and Dockerfile, the rebuild uses the final archived
`nvim-treesitter` commit instead of a moving branch so the query source stays
immutable.

HCL and Kotlin are also attributed to `nvim-treesitter`, but those query files
are maintained locally because they are adapted to the npm parser packages used
by `inktty`.

inktty also vendors parser and query assets from upstream grammar repositories
when npm packages do not ship a usable parser `.wasm` for the current loader:

- `src/lib/tree-sitter-diff/tree-sitter-diff.wasm` from `the-mikedavis/tree-sitter-diff`
- `src/lib/tree-sitter-dockerfile/tree-sitter-dockerfile.wasm` from `camdencheek/tree-sitter-dockerfile`
- `src/lib/tree-sitter-sql/tree-sitter-sql.wasm` and `src/lib/tree-sitter-sql/highlights.scm` from `derekstride/tree-sitter-sql`

The committed parser/query outputs exist so normal installs do not need local
Tree-sitter grammar builds, Docker, or Emscripten just to run the app.

The vendored assets are reproducible from pinned upstream revisions with:

```bash
bun run highlights-rebuild
```

The pinned sources and rebuild configuration live in
`scripts/highlights-vendored.json`.

Contributor notes for the highlighting subsystem and rebuild workflow live in
[`docs/highlighting.md`](docs/highlighting.md).

## Font Requirement

inktty assumes a patched Nerd Font in your terminal.

Code block headers use Nerd Font language icons, so terminals without a patched font will render missing-glyph boxes or incorrect symbols.

## Themes

inktty ships with `tokyo-night`, `nord`, and `solarized-dark`.

User theme overrides are loaded from `~/.config/inktty/themes/*.toml` or `$XDG_CONFIG_HOME/inktty/themes/*.toml`.

Use `t` and `T` in the app to cycle forward and backward through available themes.

Press **q** to quit.
