# inktty

A simple terminal markdown reader built with OpenTUI.

## Usage

```bash
# Install and run
bun install
ink <path-to-file.md>

# Or run directly with bun
bun run start -- <path-to-file.md>

# Use a specific theme
ink --theme nord <path-to-file.md>

# List embedded and user themes
ink --list-themes

## Example

```bash
ink example.md
```

## Font Requirement

inktty assumes a patched Nerd Font in your terminal.

Code block headers use Nerd Font language icons, so terminals without a patched font will render missing-glyph boxes or incorrect symbols.

## Themes

inktty ships with `tokyo-night`, `nord`, and `solarized-dark`.

User theme overrides are loaded from `~/.config/inktty/themes/*.toml` or `$XDG_CONFIG_HOME/inktty/themes/*.toml`.

Use `t` and `T` in the app to cycle forward and backward through available themes.

Press **q** to quit.
