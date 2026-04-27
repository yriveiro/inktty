import { describe, expect, mock, test } from "bun:test";
import type { CliRenderer } from "@opentui/core";
import { runInkCli } from "../../bin/ink";
import { getEmbeddedThemes } from "../../src/lib/theme";

interface RootStub {
  render: ReturnType<typeof mock<() => void>>;
  unmount: ReturnType<typeof mock<() => void>>;
}

function createRendererStub() {
  return {
    destroy: mock(() => Promise.resolve()),
  } as unknown as CliRenderer;
}

function createRootStub(): RootStub {
  return {
    render: mock(() => {}),
    unmount: mock(() => {}),
  };
}

describe("ink CLI", () => {
  test("returns an error code and usage message when no file path is provided", async () => {
    const error = mock(() => {});

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx"],
      stderr: { error },
      loadThemes: async () => getEmbeddedThemes(),
    });

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith(
      "Usage: ink [--theme <name>] [--list-themes] <path-to-markdown-file>",
    );
  });

  test("returns an error code when the file cannot be read", async () => {
    const error = mock(() => {});

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "missing.md"],
      stderr: { error },
      loadThemes: async () => getEmbeddedThemes(),
      readTextFile: async () => {
        throw new Error("missing");
      },
    });

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("Error reading file: missing.md");
  });

  test("creates the renderer and renders the app when a file is provided", async () => {
    const renderer = createRendererStub();
    const createRenderer = mock(async () => renderer);
    const root = createRootStub();
    const createReactRoot = mock(() => root);
    const themes = getEmbeddedThemes();

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "/tmp/docs/readme.md"],
      readTextFile: async () => "# Hello",
      loadThemes: async () => themes,
      createRenderer,
      createReactRoot: createReactRoot as typeof import("@opentui/react").createRoot,
    });

    expect(exitCode).toBe(0);
    expect(createRenderer).toHaveBeenCalledWith({
      exitOnCtrlC: true,
      targetFps: 30,
    });
    expect(createReactRoot).toHaveBeenCalledWith(renderer);
    expect(root.render).toHaveBeenCalledTimes(1);
  });

  test("lists themes without creating the renderer", async () => {
    const log = mock(() => {});
    const createRenderer = mock(async () => createRendererStub());
    const themes = getEmbeddedThemes();

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "--list-themes"],
      stdout: { log },
      stderr: { error: mock(() => {}) },
      loadThemes: async () => themes,
      createRenderer,
    });

    expect(exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith("nord\nsolarized-dark\ntokyo-night");
    expect(createRenderer).not.toHaveBeenCalled();
  });

  test("returns an error for an unknown theme", async () => {
    const error = mock(() => {});

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "--theme", "missing", "doc.md"],
      stderr: { error },
      loadThemes: async () => getEmbeddedThemes(),
    });

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("Unknown theme: missing");
    expect(error).toHaveBeenCalledWith("Available themes: nord, solarized-dark, tokyo-night");
  });

  test("returns an error when --theme is missing its value", async () => {
    const error = mock(() => {});

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "--theme"],
      stderr: { error },
      loadThemes: async () => getEmbeddedThemes(),
    });

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("Missing value for --theme");
  });
});
