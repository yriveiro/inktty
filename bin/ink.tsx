#!/usr/bin/env bun
import { basename } from "node:path";
import { type CliRenderer, createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "../src/App";

interface CliDependencies {
  argv?: string[];
  stderr?: Pick<typeof console, "error">;
  readTextFile?: (filePath: string) => Promise<string>;
  createRenderer?: typeof createCliRenderer;
  createReactRoot?: typeof createRoot;
}

interface ReactRootLike {
  render(node: React.ReactNode): void;
}

function defaultReadTextFile(filePath: string): Promise<string> {
  return Bun.file(filePath).text();
}

export async function runInkCli({
  argv = process.argv,
  stderr = console,
  readTextFile = defaultReadTextFile,
  createRenderer = createCliRenderer,
  createReactRoot = createRoot,
}: CliDependencies = {}): Promise<number> {
  const filePath = argv[2];

  if (!filePath) {
    stderr.error("Usage: ink <path-to-markdown-file>");
    return 1;
  }

  let content: string;

  try {
    content = await readTextFile(filePath);
  } catch (_error) {
    stderr.error(`Error reading file: ${filePath}`);
    return 1;
  }

  const renderer = await createRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  });

  (createReactRoot(renderer as CliRenderer) as unknown as ReactRootLike).render(
    <App fileName={basename(filePath)} content={content} />,
  );

  return 0;
}

if (import.meta.main) {
  const exitCode = await runInkCli();

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}
