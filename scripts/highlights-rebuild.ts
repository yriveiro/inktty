import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface VendoredQuery {
  source: string;
  target: string;
}

interface VendoredGrammar {
  name: string;
  repository: string;
  revision: string;
  checkoutRef?: string;
  generate?: boolean;
  parserPath: string;
  queries: VendoredQuery[];
  notes?: string[];
}

interface VendoredManifest {
  treeSitterCliVersion: string;
  grammars: VendoredGrammar[];
}

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = join(repoRoot, "scripts", "highlights-vendored.json");

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

async function run(command: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${command.join(" ")}`);
  }
}

async function readTextFromSource(source: string, cwd: string): Promise<string> {
  if (isUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  const file = Bun.file(join(cwd, source));
  if (!(await file.exists())) {
    throw new Error(`Missing source file: ${source}`);
  }
  return file.text();
}

async function copyQuery(source: string, target: string, cwd: string): Promise<void> {
  const destination = join(repoRoot, target);
  await mkdir(dirname(destination), { recursive: true });
  const content = await readTextFromSource(source, cwd);
  await writeFile(destination, content);
}

async function buildGrammar(grammar: VendoredGrammar, cliVersion: string, workspaceRoot: string): Promise<void> {
  const cloneDir = join(workspaceRoot, grammar.name);

  await run(["git", "clone", grammar.repository, cloneDir], repoRoot);
  await run(["git", "checkout", grammar.checkoutRef ?? grammar.revision], cloneDir);

  if (grammar.checkoutRef) {
    await run(["git", "checkout", grammar.revision], cloneDir);
  }

  const parserOutputPath = join(repoRoot, grammar.parserPath);
  await mkdir(dirname(parserOutputPath), { recursive: true });

  if (grammar.generate) {
    await run(["bunx", `tree-sitter-cli@${cliVersion}`, "generate"], cloneDir);
  }

  await run(
    [
      "bunx",
      `tree-sitter-cli@${cliVersion}`,
      "build",
      "--wasm",
      "-o",
      parserOutputPath,
      cloneDir,
    ],
    repoRoot,
  );

  for (const query of grammar.queries) {
    await copyQuery(query.source, query.target, cloneDir);
  }
}

async function main(): Promise<void> {
  const manifest = (await Bun.file(manifestPath).json()) as VendoredManifest;
  const workspaceRoot = await mkdtemp(join(tmpdir(), "inktty-highlights-"));

  try {
    for (const grammar of manifest.grammars) {
      await buildGrammar(grammar, manifest.treeSitterCliVersion, workspaceRoot);
    }
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

await main();
