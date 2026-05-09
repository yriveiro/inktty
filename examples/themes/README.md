# Theme Customization Examples

These examples show how to customize `inktty` themes with TOML overrides.

Copy the files you want to use into:

- `~/.config/inktty/themes/`
- or `$XDG_CONFIG_HOME/inktty/themes/`

Then run:

```bash
ink --list-themes
ink --theme <theme-name> <path-to-file.md>
```

## Files

- [`minimal-override.toml`](minimal-override.toml): small UI and syntax tweaks
  on top of `tokyo-night`
- [`emoji-notes.toml`](emoji-notes.toml): uses emoji for heading icons, link
  icons, callout badges, list bullets, and blockquote markers
- [`nerd-font-icons.toml`](nerd-font-icons.toml): uses Nerd Font glyphs for
  patched terminals
- [`paper-terminal.toml`](paper-terminal.toml): a lighter document-focused look
  with customized headings, links, callouts, and code blocks
- [`paper-terminal-contrast.toml`](paper-terminal-contrast.toml): a second user
  theme that extends another custom theme

## Notes

- `name` is optional. If omitted, the file name becomes the theme name.
- `extends` is optional. If omitted, a new user theme falls back to
  `tokyo-night`.
- colors must use the `#RRGGBB` format.
- override files are partial. You only need to set the values you want to
  change.
- string fields such as heading `icon`, link `icon`, callout `badge`, list
  `bullet`, and blockquote `marker` can use plain text, emoji, or patched-font
  glyphs
- patched-font examples need a Nerd Font-capable terminal to render correctly
