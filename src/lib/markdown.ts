import { marked, type Token } from "marked";
import { resolveFenceLanguage } from "./highlight";
import { isMermaidFenceLanguage } from "./mermaid";

const frontmatterOpeningDelimiter = "---";
const frontmatterClosingDelimiters = new Set(["---", "..."]);

interface FencedCodeBlock {
  code: string;
  infoString?: string;
  startLine: number;
}

interface MermaidBlock {
  code: string;
  index: number;
}

interface LeadingFrontmatter {
  content: string;
  frontmatter: string | null;
}

function countNewlines(value: string): number {
  return value.match(/\n/g)?.length ?? 0;
}

export function normalizeMarkdownSource(source: string): string {
  return source.replace(/\r\n/g, "\n");
}

export function extractLeadingFrontmatter(source: string): LeadingFrontmatter {
  const normalized = normalizeMarkdownSource(source);
  const lines = normalized.split("\n");

  if (lines[0] !== frontmatterOpeningDelimiter) {
    return {
      content: normalized,
      frontmatter: null,
    };
  }

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];

    if (line && frontmatterClosingDelimiters.has(line)) {
      return {
        content: lines.slice(index + 1).join("\n"),
        frontmatter: lines.slice(1, index).join("\n"),
      };
    }
  }

  return {
    content: normalized,
    frontmatter: null,
  };
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
