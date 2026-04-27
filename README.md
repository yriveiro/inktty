# inktty

A simple terminal markdown reader built with OpenTUI.

## Usage

```bash
# Read a markdown file
bun run bin/ink.tsx <path-to-file.md>

# Use a specific theme
bun run bin/ink.tsx --theme nord <path-to-file.md>

# List embedded and user themes
bun run bin/ink.tsx --list-themes

# Development (watch mode)
bun run dev

# Run tests
bun test
bun run test:bdd

# Lint and format
bun run lint
bun run lint:fix
```

## Example

```bash
bun run bin/ink.tsx example.md
```

## Font Requirement

inktty assumes a patched Nerd Font in your terminal.

Code block headers use Nerd Font language icons, so terminals without a patched font will render missing-glyph boxes or incorrect symbols.

## Themes

inktty ships with `tokyo-night`, `nord`, and `solarized-dark`.

User theme overrides are loaded from `~/.config/inktty/themes/*.toml` or `$XDG_CONFIG_HOME/inktty/themes/*.toml`.

Use `t` and `T` in the app to cycle forward and backward through available themes.

Press **q** to quit.
