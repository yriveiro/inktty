import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";

const vendoredQuerySchema = z.strictObject({
  source: z.string().min(1),
  target: z.string().min(1),
});

const vendoredGrammarSchema = z.strictObject({
  name: z.string().min(1),
  repository: z.string().min(1),
  revision: z.string().min(1),
  checkoutRef: z.string().min(1).optional(),
  generate: z.boolean().optional(),
  parserPath: z.string().min(1),
  queries: z.array(vendoredQuerySchema),
  notes: z.array(z.string()).optional(),
});

const vendoredManifestSchema = z.strictObject({
  treeSitterCliVersion: z.string().min(1),
  grammars: z.array(vendoredGrammarSchema),
});

type VendoredGrammar = z.infer<typeof vendoredGrammarSchema>;

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
  const manifest = vendoredManifestSchema.parse(await Bun.file(manifestPath).json());
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
