import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as z from "zod";

const webTreeSitterPackageJsonSchema = z.object({
  exports: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
});

type WebTreeSitterPackageJson = z.infer<typeof webTreeSitterPackageJsonSchema>;

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("web-tree-sitter"));
const packageJsonPath = join(packageRoot, "package.json");

async function main(): Promise<void> {
  const packageJson: WebTreeSitterPackageJson = webTreeSitterPackageJsonSchema.parse(
    JSON.parse(await readFile(packageJsonPath, "utf8")),
  );

  const exports = packageJson.exports ?? {};
  let changed = false;

  if (exports["./tree-sitter.wasm"] !== "./web-tree-sitter.wasm") {
    exports["./tree-sitter.wasm"] = "./web-tree-sitter.wasm";
    changed = true;
  }

  if (exports["./debug/tree-sitter.wasm"] !== "./debug/web-tree-sitter.wasm") {
    exports["./debug/tree-sitter.wasm"] = "./debug/web-tree-sitter.wasm";
    changed = true;
  }

  if (!changed) {
    return;
  }

  packageJson.exports = exports;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

await main();
