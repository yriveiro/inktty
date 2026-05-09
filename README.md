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

## Font Requirement

inktty assumes a patched Nerd Font in your terminal.

Code block headers use Nerd Font language icons, so terminals without a patched font will render missing-glyph boxes or incorrect symbols.

## Themes

inktty ships with `tokyo-night`, `nord`, and `solarized-dark`.

User theme overrides are loaded from `~/.config/inktty/themes/*.toml` or `$XDG_CONFIG_HOME/inktty/themes/*.toml`.

Use `t` and `T` in the app to cycle forward and backward through available themes.

Press **q** to quit.
