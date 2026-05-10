import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderMermaidASCII } from "beautiful-mermaid";
import * as z from "zod";

type MermaidPngWorkerResponse =
  | { ok: true }
  | {
      error: string;
      ok: false;
    };

const mermaidPngWorkerResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), error: z.string().min(1) }),
]);

const mermaidPreviewOptions = {
  boxBorderPadding: 0,
  colorMode: "none",
  paddingX: 3,
  paddingY: 1,
  useAscii: false,
} as const;
const mermaidPngDir = join(tmpdir(), "inktty-mermaid-png");
const mermaidPngWorkerUrl = new URL("./mermaid-png-worker.ts", import.meta.url);
const mermaidPngExports = new Map<string, Promise<void>>();
const mermaidWorkerTimeoutMs = 15_000;
let cachedMermaidCliPath: string | null | undefined;
let cachedMermaidCliLookup: typeof Bun.which | undefined;

export function isMermaidFenceLanguage(filetype: string): boolean {
  return filetype === "mermaid";
}

export function renderMermaidDiagram(source: string): string {
  return renderMermaidASCII(source, mermaidPreviewOptions);
}

function getMermaidCliPath(): string | null {
  if (cachedMermaidCliLookup !== Bun.which || cachedMermaidCliPath === undefined) {
    cachedMermaidCliLookup = Bun.which;
    cachedMermaidCliPath = Bun.which("mmdc");
  }

  return cachedMermaidCliPath;
}

export function hasMermaidCli(): boolean {
  return getMermaidCliPath() !== null;
}

function getMermaidPngPath(source: string): string {
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 16);

  return join(mermaidPngDir, `diagram-${digest}.png`);
}

function getMermaidPngUrl(source: string): string {
  return pathToFileURL(getMermaidPngPath(source)).href;
}

async function renderMermaidPngInWorker(source: string, outputPath: string): Promise<void> {
  const cliPath = getMermaidCliPath();

  if (!cliPath) {
    throw new Error("mermaid-cli is required to export Mermaid PNGs");
  }

  const worker = new Worker(mermaidPngWorkerUrl.href);
  const timeoutSignal = AbortSignal.timeout(mermaidWorkerTimeoutMs);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        callback();
      };

      const abortHandler = () => {
        settle(() => {
          reject(new Error(`Mermaid PNG export timed out after ${mermaidWorkerTimeoutMs}ms`));
        });
      };

      timeoutSignal.addEventListener("abort", abortHandler, { once: true });

      worker.onmessage = (event: MessageEvent<unknown>) => {
        settle(() => {
          timeoutSignal.removeEventListener("abort", abortHandler);

          const parsedResponse = mermaidPngWorkerResponseSchema.safeParse(event.data);

          if (!parsedResponse.success) {
            reject(new Error("Failed to export Mermaid PNG"));
            return;
          }

          const response: MermaidPngWorkerResponse = parsedResponse.data;

          if (response.ok) {
            resolve();
            return;
          }

          reject(new Error(response.error));
        });
      };

      worker.onerror = (event) => {
        settle(() => {
          timeoutSignal.removeEventListener("abort", abortHandler);
          reject(event.error instanceof Error ? event.error : new Error(event.message));
        });
      };

      worker.onmessageerror = () => {
        settle(() => {
          timeoutSignal.removeEventListener("abort", abortHandler);
          reject(new Error("Failed to export Mermaid PNG"));
        });
      };

      worker.postMessage({ cliPath, outputPath, source });
    });
  } finally {
    worker.terminate();
  }
}

export async function exportMermaidPng(source: string): Promise<string> {
  const pngPath = getMermaidPngPath(source);
  const pngUrl = getMermaidPngUrl(source);
  const existingExport = mermaidPngExports.get(pngPath);

  if (existingExport) {
    await existingExport;

    if (!(await Bun.file(pngPath).exists())) {
      throw new Error("Failed to export Mermaid PNG");
    }

    return pngUrl;
  }

  if (await Bun.file(pngPath).exists()) {
    return pngUrl;
  }

  await mkdir(dirname(pngPath), { recursive: true });

  const exportJob = renderMermaidPngInWorker(source, pngPath).finally(() => {
    mermaidPngExports.delete(pngPath);
  });

  mermaidPngExports.set(pngPath, exportJob);

  await exportJob;

  if (!(await Bun.file(pngPath).exists())) {
    throw new Error("Failed to export Mermaid PNG");
  }

  return pngUrl;
}

export async function openMermaidPng(source: string): Promise<void> {
  const pngPath = getMermaidPngPath(source);

  if (!(await Bun.file(pngPath).exists())) {
    await exportMermaidPng(source);
  }

  Bun.spawn(["open", pngPath], {
    stderr: "ignore",
    stdout: "ignore",
  });
}
