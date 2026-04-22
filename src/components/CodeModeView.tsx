import { useEffect, useState } from "react";
import { type HighlightChunk, highlightCode, resolveFenceLanguage } from "../lib/highlight";

interface CodeBlockInfo {
  startLine: number;
  endLine: number;
  lang: string;
  code: string;
}

interface LineSegment {
  text: string;
  fg?: HighlightChunk["fg"];
}

interface RenderState {
  lines: string[];
  segments: LineSegment[][];
}

interface CodeModeViewProps {
  content: string;
  showLineNumbers: boolean;
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function buildPlainRenderState(content: string): RenderState {
  const lines = content.split("\n");

  return {
    lines,
    segments: lines.map((line) => [{ text: line }]),
  };
}

function findCodeBlocks(content: string): CodeBlockInfo[] {
  const lines = content.split("\n");
  const blocks: CodeBlockInfo[] = [];
  let inBlock = false;
  let blockStart = 0;
  let blockLang = "text";
  const codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }

    const openMatch = line.match(/^```(.*)$/);

    if (openMatch && !inBlock) {
      inBlock = true;
      blockStart = i;
      blockLang = resolveFenceLanguage(openMatch[1]);
      codeLines.length = 0;
    } else if (line.trim() === "```" && inBlock) {
      inBlock = false;
      blocks.push({
        startLine: blockStart,
        endLine: i + 1,
        lang: blockLang,
        code: codeLines.join("\n"),
      });
    } else if (inBlock) {
      codeLines.push(line);
    }
  }

  return blocks;
}

function splitChunksIntoLines(code: string, chunks: HighlightChunk[]): LineSegment[][] {
  const codeLines = code.split("\n");
  const result: LineSegment[][] = codeLines.map(() => []);
  let lineIndex = 0;

  for (const chunk of chunks) {
    const parts = chunk.text.split("\n");
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      if (part === undefined) {
        continue;
      }

      if (p > 0 && lineIndex < codeLines.length - 1) {
        lineIndex++;
      }
      if (part.length > 0 && lineIndex < codeLines.length) {
        const lineSegments = result[lineIndex];
        if (!lineSegments) {
          continue;
        }

        lineSegments.push({ text: part, fg: chunk.fg });
      }
    }
  }

  return result;
}

export function CodeModeView({ content, showLineNumbers }: CodeModeViewProps) {
  const [renderState, setRenderState] = useState<RenderState>(() =>
    buildPlainRenderState(normalizeContent(content)),
  );

  useEffect(() => {
    let cancelled = false;

    async function buildRenderState() {
      const normalized = normalizeContent(content);
      const { lines, segments: allSegments } = buildPlainRenderState(normalized);
      const blocks = findCodeBlocks(normalized);

      if (!cancelled) {
        setRenderState({ lines, segments: allSegments.map((segments) => [...segments]) });
      }

      for (const block of blocks) {
        let highlightedLines: LineSegment[][];

        try {
          highlightedLines = splitChunksIntoLines(
            block.code,
            await highlightCode(block.code, block.lang),
          );
        } catch (_e) {
          highlightedLines = block.code.split("\n").map((line) => [{ text: line }]);
        }

        for (let i = 0; i < highlightedLines.length; i++) {
          const absLine = block.startLine + 1 + i;
          if (absLine < lines.length) {
            const highlightedLine = highlightedLines[i];
            if (highlightedLine) {
              allSegments[absLine] = highlightedLine;
            }
          }
        }
      }

      if (!cancelled) {
        setRenderState({ lines, segments: allSegments });
      }
    }

    buildRenderState();
    return () => {
      cancelled = true;
    };
  }, [content]);

  const nodes: React.ReactNode[] = [];
  const { lines, segments } = renderState;

  for (let i = 0; i < lines.length; i++) {
    if (showLineNumbers) {
      const num = (i + 1).toString().padStart(3);
      nodes.push(
        <span key={`n${i}`} fg="#565f89">
          {`${num} | `}
        </span>,
      );
    }

    const lineText = lines[i] ?? "";
    const lineSegments: LineSegment[] = segments[i] ?? [{ text: lineText }];
    for (let j = 0; j < lineSegments.length; j++) {
      const seg = lineSegments[j];
      if (!seg) {
        continue;
      }

      nodes.push(
        <span key={`s${i}-${j}`} fg={seg.fg}>
          {seg.text}
        </span>,
      );
    }

    if (i < lines.length - 1) {
      nodes.push("\n");
    }
  }

  return <text selectable>{nodes}</text>;
}
