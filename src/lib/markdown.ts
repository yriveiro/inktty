import { marked, type Token } from "marked";
import { resolveFenceLanguage } from "./highlight";
import { isMermaidFenceLanguage } from "./mermaid";

interface FencedCodeBlock {
  code: string;
  infoString?: string;
  startLine: number;
}

interface MermaidBlock {
  code: string;
  index: number;
}

function countNewlines(value: string): number {
  return value.match(/\n/g)?.length ?? 0;
}

export function normalizeMarkdownSource(source: string): string {
  return source.replace(/\r\n/g, "\n");
}

export function lexMarkdown(source: string): Token[] {
  return marked.lexer(normalizeMarkdownSource(source));
}

export function extractFencedCodeBlocks(source: string): FencedCodeBlock[] {
  const blocks: FencedCodeBlock[] = [];
  let currentLine = 0;

  for (const token of lexMarkdown(source)) {
    const tokenStartLine = currentLine;
    const raw = token.raw ?? "";

    if (token.type === "code" && token.codeBlockStyle !== "indented") {
      const code = token.text;

      blocks.push({
        code,
        infoString: token.lang,
        startLine: tokenStartLine,
      });
    }

    currentLine += countNewlines(raw);
  }

  return blocks;
}

export function extractMermaidBlocks(source: string): MermaidBlock[] {
  return extractFencedCodeBlocks(source)
    .filter((block) => isMermaidFenceLanguage(resolveFenceLanguage(block.infoString)))
    .map((block, index) => ({
      code: block.code,
      index,
    }));
}
