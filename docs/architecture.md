# Architecture

## Overview

`inktty` is a Bun CLI that reads a markdown file and renders it in a terminal
UI built on OpenTUI.

The implementation is split into five layers:

1. CLI bootstrap in `bin/`
2. App shell in `src/App.tsx`
3. Reader controllers in `src/controllers/`
4. Rendering components in `src/components/`
5. Parsing, highlighting, mermaid, display, and theme utilities in `src/lib/`

## Runtime Flow

1. `bin/ink.tsx` parses the CLI arguments.
2. The CLI loads themes through `loadAvailableThemes()`.
3. The CLI reads the markdown file with `Bun.file(...).text()`.
4. The CLI creates an OpenTUI renderer with `createCliRenderer()`.
5. The renderer mounts `<App />` through `createRoot()`.
6. `App` delegates reader behavior to `useReaderController()`.
7. `MarkdownReader` renders either parsed markdown view mode or raw code mode.

## CLI Layer

`bin/ink.tsx` is intentionally thin.

Key responsibilities:

- parse `--theme`, `--list-themes`, and a single markdown file path
- fail fast on invalid arguments or unknown themes
- print theme names without booting the renderer for `--list-themes`
- create the renderer only after theme loading and file reads succeed
- pass `fileName`, raw `content`, available `themes`, and `initialThemeName`
  into `<App />`

`runInkCli()` accepts injectable dependencies such as `readTextFile`,
`loadThemes`, `createRenderer`, and `createReactRoot`.

That keeps the CLI easy to test without real filesystem or terminal I/O.

## App Shell

`src/App.tsx` is the top-level screen shell.

It does three things:

- reads the current terminal width with `useTerminalDimensions()`
- gets all reader state and actions from `useReaderController()`
- renders the footer and help drawer around `MarkdownReader`

The footer is width-aware.

Instead of truncating one long status string blindly, the app chooses from a
set of progressively smaller footer variants based on terminal width.

The help panel is also responsive:

- two columns on wider terminals
- one column on narrower terminals

## Reader Controller

`src/controllers/useReaderController.ts` is the central interaction layer.

It owns keyboard handling and composes four focused hooks:

- `useScrollController()`: vertical scroll state, file percentage, top line,
  scroll restoration, and maximum horizontal offset
- `useMermaidController()`: mermaid block discovery, focus, navigation, and
  PNG opening
- `useReaderTheme()`: active theme resolution and `t`/`T` cycling
- `useCopiedFeedback()`: OSC52 clipboard copy and temporary `copied!` footer
  feedback

Local controller state keeps the reader mode toggles:

- `mode`: `"view"` or `"code"`
- `showHelp`
- `showLineNumbers`
- `softWrap`
- `horizontalOffset`

This keeps rendering components mostly declarative.

## Shared Scroll Model

`src/components/MarkdownReader.tsx` owns the shared scrollbox.

Both modes render inside the same OpenTUI `<scrollbox>`, which allows the
reader to preserve the current vertical position across mode changes.

The restoration flow is:

1. `useScrollController()` captures the current `scrollTop` with
   `queueScrollRestore()`.
2. The controller toggles mode or layout state.
3. `MarkdownReader` restores the saved `scrollTop` in `useLayoutEffect()`.

This is the reason view mode, code mode, wrap toggles, and line-number toggles
can keep the visible region stable.

## View Mode Pipeline

View mode is rendered by `src/components/CustomMarkdown.tsx`.

Pipeline:

1. `lexMarkdown()` in `src/lib/markdown.ts` normalizes CRLF to LF and tokenizes
   the source with `marked`.
2. `renderBlocks()` walks the token list and renders custom OpenTUI nodes for
   the token types `inktty` wants to control explicitly.
3. Unknown token types fall back to OpenTUI's built-in `<markdown>` renderable.

Custom renderers exist for:

- headings
- paragraphs and inline formatting
- lists and task lists
- blockquotes and callouts
- tables
- fenced code blocks
- horizontal rules
- links, inline code, and images

Notable implementation details:

- callouts are parsed from blockquotes whose first line matches
  `[!TYPE] Optional title`
- tables are rendered through a custom `text-table` renderable registered with
  `extend()`
- code block headers use `getCodeBlockMeta()` to show Nerd Font icons per
  resolved filetype

## Code Blocks In View Mode

Code blocks are rendered by the `CodeBlock` component inside
`CustomMarkdown.tsx`.

There are two branches:

- non-mermaid fences: highlight asynchronously with Tree-sitter and fall back to
  raw text if highlighting fails
- mermaid fences: render an inline ASCII preview with `beautiful-mermaid`

If `mmdc` is available, mermaid blocks also expose a `view` action that exports
and opens a PNG.

## Code Mode Pipeline

Code mode is rendered by `src/components/CodeModeView.tsx`.

The goal is different from view mode: it shows the raw markdown source rather
than the parsed document.

Pipeline:

1. `normalizeMarkdownSource()` creates a stable LF-only source.
2. The component builds a plain-text line array for the whole document.
3. `extractFencedCodeBlocks()` finds fenced code blocks and their starting line
   numbers.
4. Each fenced block is highlighted asynchronously.
5. Only the lines inside those fences are replaced with colored segments.

This design keeps code mode faithful to the original file while still making
embedded code easier to inspect.

Behavioral details:

- line numbers are optional
- soft wrap can be toggled on and off
- when wrap is off, `h` and `l` control horizontal scrolling
- horizontal slicing is based on terminal cell width, not JavaScript string
  length

That last point matters for wide characters and Nerd Font icons.

## Markdown Utilities

`src/lib/markdown.ts` provides the shared parsing primitives.

- `normalizeMarkdownSource()`: converts CRLF to LF
- `lexMarkdown()`: returns `marked` tokens
- `extractFencedCodeBlocks()`: returns fenced code, info string, and start line
- `extractMermaidBlocks()`: filters fenced code blocks to mermaid-only blocks

These utilities are used by both view mode and code mode so the app has one
consistent understanding of the source file.

## Highlighting Subsystem

`src/lib/highlight.ts` integrates Tree-sitter with OpenTUI.

Responsibilities:

- resolve fence aliases such as `ts` -> `typescript`, `yml` -> `yaml`, and
  `shell` -> `bash`
- register extra parsers once per shared Tree-sitter client using a `WeakSet`
- load both package-managed grammars and vendored parser/query assets for the
  supported fenced languages
- convert Tree-sitter highlight ranges into OpenTUI chunks using the current
  syntax palette

Some grammars are vendored instead of package-managed.

That happens when an npm package does not ship a usable parser `.wasm`, when it
does not include the query files `inktty` needs, or when the project must pin a
specific upstream query source instead of relying on a moving branch.

Those vendored assets are rebuilt from pinned upstream revisions by
`scripts/highlights-rebuild.ts`, configured through
`scripts/highlights-vendored.json`, and exposed as the contributor command:

- `bun run highlights-rebuild`

See [`highlighting.md`](highlighting.md) for the source policy, current pinned
grammars, and rebuild rationale.

There is one important Bash-specific normalization step.

Markdown docs often contain placeholders such as `<path-to-file.md>`. Bash would
parse those as redirects during highlighting, which can cause later commands to
highlight incorrectly.

To avoid that, `highlightCode()` temporarily rewrites those placeholders before
asking Tree-sitter to parse the code, then renders the original source text back
to the screen.

## Mermaid Subsystem

`src/lib/mermaid.ts` handles both terminal previews and PNG export.

Inline preview:

- `renderMermaidDiagram()` renders ASCII output with `beautiful-mermaid`

PNG export:

- `hasMermaidCli()` checks whether `mmdc` is available on `PATH`
- `exportMermaidPng()` hashes the diagram source and writes a stable PNG in the
  system temp directory
- concurrent exports for the same diagram are deduplicated with
  `mermaidPngExports`
- `openMermaidPng()` exports on demand and opens the file with `open` on macOS

The actual `mmdc` invocation runs in `src/lib/mermaid-png-worker.ts`.

The worker writes temporary input/config files, spawns the Mermaid CLI, and then
cleans up its temporary workspace.

## Theme Subsystem

`src/lib/theme.ts` owns:

- the `InkTheme` contract
- embedded theme definitions
- user theme loading from the XDG config directory
- strict validation with `zod`
- inheritance with `extends`
- cycle detection and default-theme fallback

See [`themes.md`](themes.md) for the full theme model.

## Display Utilities

`src/lib/display.ts` contains helpers that work in terminal cell widths instead
of plain string lengths.

Those helpers are used by:

- footer sizing in `App.tsx`
- table alignment in `CustomMarkdown.tsx`
- horizontal scrolling in `CodeModeView.tsx`

Using terminal width instead of string length avoids broken alignment when the
text contains wide Unicode characters or Nerd Font glyphs.

## File Map

- `bin/ink.tsx`: CLI entrypoint and test seam
- `src/App.tsx`: top-level shell, footer, and help drawer
- `src/components/MarkdownReader.tsx`: shared scroll container and mode switch
- `src/components/CustomMarkdown.tsx`: parsed markdown renderer
- `src/components/CodeModeView.tsx`: raw source renderer
- `src/controllers/useReaderController.ts`: keyboard orchestration and state
  composition
- `src/controllers/reader/*.ts`: focused controller hooks
- `src/lib/markdown.ts`: tokenization and fence extraction
- `src/lib/highlight.ts`: Tree-sitter integration
- `src/lib/mermaid.ts`: Mermaid preview and export
- `src/lib/theme.ts`: theme model, validation, loading, and inheritance
- `src/lib/display.ts`: terminal-width helpers

## Extension Guide

When adding a feature, start in the layer that owns the behavior.

- New CLI flag: `bin/ink.tsx` and `tests/bin/ink.test.tsx`
- New keybinding or reader state: `useReaderController.ts`
- New parsed markdown behavior: `CustomMarkdown.tsx`
- New raw-source mode behavior: `CodeModeView.tsx`
- New theme surface: `theme.ts` plus the renderer that consumes it
- New fence alias or grammar: `highlight.ts`
- New user-visible interaction contract: `tests/app.test.tsx` or
  `tests/bdd/package.behavior.test.tsx`
