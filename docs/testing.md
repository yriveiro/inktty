# Testing

## Overview

`inktty` uses Bun's test runner for CLI tests, library tests, renderer
integration tests, and behavior-style scenarios.

The test suite is organized by responsibility rather than by framework type.

## Common Commands

```bash
bun test
bun test tests/bin
bun test tests/lib
bun test tests/bdd
bun run highlights-rebuild
bun run typecheck
bun run lint
```

## Test Layout

- `tests/bin/ink.test.tsx`: CLI argument parsing, error handling, theme listing,
  and renderer bootstrapping
- `tests/lib/*.test.ts`: pure helpers such as markdown extraction, syntax
  highlighting, display helpers, and theme resolution
- `tests/app.test.tsx`: integration coverage for the real `App` component
- `tests/bdd/package.behavior.test.tsx`: user-facing workflows written as
  Given/When/Then scenarios
- `tests/fixtures/*`: sample markdown documents used by renderer tests
- `tests/__snapshots__/app.test.tsx.snap`: snapshot coverage for complex output

## Test Utilities

`tests/test-utils.tsx` wraps OpenTUI's test renderer and keeps interactions
inside React `act()`.

Useful helpers:

- `testRender()`: standardized renderer setup
- `destroyTestSetup()`: renderer teardown
- `renderFrame()`: render, wait briefly, render again, then capture the terminal
  frame
- `pressKey()`: emit terminal key events
- `emitSelection()`: simulate clipboard-selection events
- `getScrollbox()`: access the reader scrollbox directly
- `findSpanByText()`, `findSpanContainingText()`, `findSpanOnLine()`: inspect
  captured colored spans
- `rgb()`: convert a span color to RGB integers for assertions

There is also one test-only global tweak:

- `getDataPaths().setMaxListeners(0)` prevents EventEmitter warnings because
  OpenTUI recreates the shared Tree-sitter client between test renderers while
  its data-path manager persists globally

## Choosing The Right Test Layer

### CLI Tests

Use `tests/bin/ink.test.tsx` when changing:

- argument parsing
- usage text
- theme validation before render
- renderer bootstrapping
- injected dependencies in `runInkCli()`

These tests should stay cheap and avoid real filesystem or renderer work where
possible.

### Library Tests

Use `tests/lib/*.test.ts` for:

- pure transforms
- parser extraction helpers
- filetype alias resolution
- theme merge and validation logic
- terminal-width calculations

These should be the fastest tests in the suite.

### App Tests

Use `tests/app.test.tsx` when changing:

- keyboard interactions
- footer/help UI
- parsed view vs raw code mode behavior
- syntax highlighting colors
- mermaid focus and export behavior
- visible theme styling

These tests exercise the real component stack and provide the most valuable
regression coverage for user-visible changes.

### BDD Tests

Use `tests/bdd/package.behavior.test.tsx` for workflows that should read like
product behavior:

- toggling between parsed and raw views
- preserving reader position across mode changes
- enabling line numbers
- wrap vs horizontal scrolling behavior
- rich markdown affordances such as callouts, tasks, tables, and links

These tests are broader and should focus on user promises rather than internal
implementation details.

## Async Rendering Caveat

Syntax highlighting is asynchronous.

That is why many renderer tests use a pattern like this:

1. render once
2. wait briefly
3. render again
4. assert on the final frame or captured spans

`renderFrame()` in `tests/test-utils.tsx` bakes that pattern in.

If a renderer test starts failing intermittently, first check whether the
assertion runs before the highlight work has settled.

## Contributor Workflow

- CLI parsing change: run `bun test tests/bin`
- Theme resolution or validation change: run `bun test tests/lib/theme.test.ts`
- Markdown rendering or keybinding change: run `bun test tests/app.test.tsx`
- User-facing behavior change: run `bun test tests/bdd`
- Vendored grammar/query refresh: run `bun run highlights-rebuild`, then `bun test`
  and review [`highlighting.md`](highlighting.md) if the source pinning or
  rebuild policy changed

For broader refactors, run the full suite with `bun test`.
