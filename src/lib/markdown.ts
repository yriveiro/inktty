import { marked, type Token } from "marked";
import { resolveFenceLanguage } from "./highlight";
import { isMermaidFenceLanguage } from "./mermaid";

export interface FencedCodeBlock {
  code: string;
  codeLines: string[];
  infoString?: string;
  startLine: number;
}

export interface MermaidBlock {
  code: string;
  index: number;
  startLine: number;
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
      const codeLines = code.length === 0 ? [] : code.split("\n");

      blocks.push({
        code,
        codeLines,
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
      startLine: block.startLine,
    }));
}

/**
 * Strip common markdown syntax for a parsed view.
 */
export function stripMarkdown(source: string): string {
  return normalizeMarkdownSource(source)
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/^-\s+/gm, ""); // list items
}

/**
 * Prepend line numbers for a code view.
 */
export function withLineNumbers(source: string): string {
  const lines = normalizeMarkdownSource(source).split("\n");
  const width = String(lines.length).length;
  return lines.map((line, i) => `${String(i + 1).padStart(width, " ")} | ${line}`).join("\n");
}
