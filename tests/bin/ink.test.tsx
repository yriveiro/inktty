import { describe, expect, mock, test } from "bun:test";
import type { CliRenderer } from "@opentui/core";
import { runInkCli } from "../../bin/ink";

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
    });

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("Usage: ink <path-to-markdown-file>");
  });

  test("returns an error code when the file cannot be read", async () => {
    const error = mock(() => {});

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "missing.md"],
      stderr: { error },
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

    const exitCode = await runInkCli({
      argv: ["bun", "bin/ink.tsx", "/tmp/docs/readme.md"],
      readTextFile: async () => "# Hello",
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
});
