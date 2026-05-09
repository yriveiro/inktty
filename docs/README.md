# Technical Documentation

These notes describe how `inktty` is implemented internally.

They are aimed at contributors working on the CLI, reader state, rendering,
themes, and tests.

## Document Map

- [`architecture.md`](architecture.md): runtime flow, component boundaries,
  rendering pipeline, and subsystem responsibilities.
- [`themes.md`](themes.md): the `InkTheme` model, theme loading, validation,
  inheritance, and contributor rules.
- [`testing.md`](testing.md): test layout, helper utilities, and which test
  layer to update for a given change.

## Codebase Map

- `bin/ink.tsx`: CLI bootstrap, argument parsing, theme loading, file reads,
  and renderer startup.
- `src/App.tsx`: top-level shell, footer/help UI, and controller wiring.
- `src/components/MarkdownReader.tsx`: shared scrollbox and mode switch.
- `src/components/CustomMarkdown.tsx`: parsed markdown renderer for view mode.
- `src/components/CodeModeView.tsx`: raw source renderer for code mode.
- `src/controllers/`: reader state, keyboard handling, scroll behavior,
  mermaid behavior, copy feedback, and theme cycling.
- `src/lib/`: markdown parsing, syntax highlighting, mermaid export,
  display helpers, and theme resolution.
- `tests/`: CLI, library, integration, snapshot, and behavior coverage.

## Runtime And Tooling

- Runtime: Bun
- UI renderer: `@opentui/core` and `@opentui/react`
- Markdown lexer: `marked`
- Syntax highlighting: Tree-sitter through `@opentui/core` and
  `web-tree-sitter`
- Mermaid preview: `beautiful-mermaid`
- Mermaid PNG export: `mmdc` when available
- Theme validation: `zod`

## Common Commands

```bash
bun test
bun test tests/bdd
bun run typecheck
bun run lint
```
