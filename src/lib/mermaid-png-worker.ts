declare var self: Worker;

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type MermaidPngWorkerRequest = {
  cliPath: string;
  outputPath: string;
  source: string;
};

type MermaidPngWorkerResponse =
  | { ok: true }
  | {
      error: string;
      ok: false;
    };

async function renderMermaidPng(request: MermaidPngWorkerRequest): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), "inktty-mermaid-worker-"));
  const inputPath = join(workspace, "diagram.mmd");
  const configPath = join(workspace, "mermaid.config.json");

  try {
    await writeFile(inputPath, request.source, "utf8");
    await writeFile(configPath, JSON.stringify({ theme: "default" }, null, 2), "utf8");

    const child = Bun.spawn(
      [request.cliPath, "-i", inputPath, "-o", request.outputPath, "-c", configPath],
      {
        stderr: "pipe",
        stdout: "ignore",
      },
    );
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

    if (exitCode !== 0) {
      throw new Error(stderr.trim() || "Failed to export Mermaid PNG");
    }
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}

self.onmessage = async (event: MessageEvent<MermaidPngWorkerRequest>) => {
  try {
    await renderMermaidPng(event.data);
    const response: MermaidPngWorkerResponse = { ok: true };

    postMessage(response);
  } catch (error) {
    const response: MermaidPngWorkerResponse = {
      error: error instanceof Error ? error.message : "Failed to export Mermaid PNG",
      ok: false,
    };

    postMessage(response);
  }
};
