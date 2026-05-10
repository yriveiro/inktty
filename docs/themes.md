# Themes

## Overview

The theme system lives in `src/lib/theme.ts`.

It is responsible for:

- the `InkTheme` type
- embedded theme definitions
- user theme loading from disk
- strict validation of theme overrides
- inheritance via `extends`
- theme selection and listing helpers used by the CLI and app

## Theme Shape

`InkTheme` has four top-level parts:

- `name`
- `chrome`: colors for the app UI frame such as the footer, help drawer, and
  line numbers
- `markdown`: headings, lists, blockquotes, code blocks, links, callouts,
  tables, inline code, and horizontal rules
- `syntax`: the Tree-sitter color palette used for code highlighting

`markdown` is further split into these surfaces:

- `blockquote`
- `callout`
- `codeBlock`
- `heading`
- `horizontalRule`
- `inlineCode`
- `links`
- `list`
- `table`

The app expects every embedded theme to define the full shape.

User themes are partial overrides layered on top of a base theme.

Some string fields are intentionally display-oriented and can use custom labels
or symbols, including:

- heading `icon`
- link `icon`
- callout `badge`
- list `bullet`
- blockquote `marker`

Those values can be plain text, emoji, or patched-font glyphs.

## Embedded Themes

The project ships with three embedded themes:

- `tokyo-night` (default)
- `nord`
- `solarized-dark`

Helpers:

- `getEmbeddedThemes()` returns cloned theme objects
- `getEmbeddedTheme(name)` returns a cloned embedded theme by name
- `defaultThemeName` and `defaultTheme` expose the default selection

The code returns clones rather than the original theme constants so downstream
logic cannot mutate the shared definitions by accident.

## User Theme Discovery

`loadAvailableThemes()` loads user themes from:

- `$XDG_CONFIG_HOME/inktty/themes/*.toml`
- `~/.config/inktty/themes/*.toml` when `XDG_CONFIG_HOME` is not set

Each file is:

1. parsed with `Bun.TOML.parse()`
2. validated against a strict `zod` schema
3. converted into a named theme source

If the file does not contain `name`, the loader uses the file basename.

Example: `my-theme.toml` becomes `my-theme` by default.

## Validation Rules

Theme overrides are strict.

Important rules enforced by the schema:

- unknown keys are rejected
- colors must be `#RRGGBB`
- spacing fields such as `topSpacing` and `bottomSpacing` must be non-negative
  integers
- booleans such as `separator` and `borderVisible` must be explicit booleans

This keeps theme files predictable and makes mistakes fail early with a clear
error message.

## Inheritance Resolution

User themes support inheritance through `extends`.

Resolution happens in `loadAvailableThemes()`.

Rules:

1. embedded themes are loaded first
2. user theme sources are read from disk
3. each user theme resolves its base recursively
4. overrides are deep-merged with `applyThemeOverride()`
5. inheritance cycles throw an error

Important nuance:

- if a user theme has the same name as an embedded theme and omits `extends`, it
  extends the embedded theme with the same name
- any other user theme without `extends` falls back to `tokyo-night`

## Runtime Theme Selection

The CLI uses these helpers before rendering starts:

- `hasTheme(themes, name)`: validate `--theme`
- `listThemeNames(themes)`: print sorted theme names for `--list-themes`

The app uses:

- `resolveThemeByName(themes, themeName)`: choose the active theme or fall back
  to the default

Inside the reader, `useReaderTheme()` owns the current selection and cycles
forward/backward with `t` and `T`.

## Example Theme File

```toml
name = "my-night"
extends = "tokyo-night"

[chrome]
headerBackground = "#111827"
helpBackground = "#1f2937"
controls = "#94a3b8"

[markdown.inlineCode]
background = "#0f172a"
foreground = "#f59e0b"

[markdown.codeBlock]
borderVisible = true
separator = true

[syntax]
keyword = "#60a5fa"
string = "#86efac"
comment = "#64748b"
```

More complete examples live in [`../examples/themes/`](../examples/themes/README.md),
including emoji-based and Nerd Font-based variants.

## Adding A New Theme Surface

If a renderer needs a new theme value, update all of the following in the same
change:

1. extend `InkTheme`
2. extend the matching `zod` override schema
3. populate the new field in all embedded themes
4. consume the field in the renderer code
5. add tests in `tests/lib/theme.test.ts` and, if the change is visible,
   `tests/app.test.tsx`

If one of those steps is skipped, the theme system usually fails in one of two
ways:

- user overrides are rejected unexpectedly
- built-in themes diverge and render inconsistently
