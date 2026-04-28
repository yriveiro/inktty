#!/usr/bin/env bun
import { basename } from "node:path";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "../src/App";
import { hasTheme, type InkTheme, listThemeNames, loadAvailableThemes } from "../src/lib/theme";

interface CliDependencies {
  argv?: string[];
  stderr?: Pick<typeof console, "error">;
  stdout?: Pick<typeof console, "log">;
  readTextFile?: (filePath: string) => Promise<string>;
  loadThemes?: typeof loadAvailableThemes;
  createRenderer?: typeof createCliRenderer;
  createReactRoot?: typeof createRoot;
}

function defaultReadTextFile(filePath: string): Promise<string> {
  return Bun.file(filePath).text();
}

function usage(): string {
  return "Usage: ink [--theme <name>] [--list-themes] <path-to-markdown-file>";
}

interface ParsedCliArgs {
  filePath?: string;
  themeName?: string;
  listThemes: boolean;
}

function parseCliArgs(argv: string[]): ParsedCliArgs | { error: string } {
  const args = argv.slice(2);
  let filePath: string | undefined;
  let themeName: string | undefined;
  let listThemes = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg === "--list-themes") {
      listThemes = true;
      continue;
    }

    if (arg === "--theme") {
      const nextArg = args[index + 1];

      if (!nextArg) {
        return { error: "Missing value for --theme" };
      }

      themeName = nextArg;
      index++;
      continue;
    }

    if (arg.startsWith("--")) {
      return { error: `Unknown option: ${arg}` };
    }

    if (filePath) {
      return { error: "Only one markdown file path may be provided" };
    }

    filePath = arg;
  }

  return { filePath, themeName, listThemes };
}

export async function runInkCli({
  argv = process.argv,
  stderr = console,
  stdout = console,
  readTextFile = defaultReadTextFile,
  loadThemes = loadAvailableThemes,
  createRenderer = createCliRenderer,
  createReactRoot = createRoot,
}: CliDependencies = {}): Promise<number> {
  const parsedArgs = parseCliArgs(argv);

  if ("error" in parsedArgs) {
    stderr.error(parsedArgs.error);
    stderr.error(usage());
    return 1;
  }

  let themes: InkTheme[];

  try {
    themes = await loadThemes();
  } catch (error) {
    stderr.error(`Error loading themes: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  if (parsedArgs.listThemes) {
    stdout.log(listThemeNames(themes).join("\n"));
    return 0;
  }

  if (parsedArgs.themeName && !hasTheme(themes, parsedArgs.themeName)) {
    stderr.error(`Unknown theme: ${parsedArgs.themeName}`);
    stderr.error(`Available themes: ${listThemeNames(themes).join(", ")}`);
    return 1;
  }

  const filePath = parsedArgs.filePath;

  if (!filePath) {
    stderr.error(usage());
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

  createReactRoot(renderer).render(
    <App
      fileName={basename(filePath)}
      content={content}
      themes={themes}
      initialThemeName={parsedArgs.themeName}
    />,
  );

  return 0;
}

if (import.meta.main) {
  const exitCode = await runInkCli();

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}
