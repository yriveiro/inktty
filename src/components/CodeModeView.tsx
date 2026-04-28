import { type ReactNode, useEffect, useState } from "react";
import { sliceTextByWidth, stringWidth } from "../lib/display";
import {
  createSyntaxStyle,
  type HighlightChunk,
  highlightCode,
  resolveFenceLanguage,
} from "../lib/highlight";
import { extractFencedCodeBlocks, normalizeMarkdownSource } from "../lib/markdown";
import type { InkTheme } from "../lib/theme";

interface CodeBlockInfo {
  startLine: number;
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
  softWrap: boolean;
  horizontalOffset: number;
  theme: InkTheme;
}

function sliceLineSegments(
  lineSegments: LineSegment[],
  fallbackText: string,
  offset: number,
): LineSegment[] {
  const displaySegments = lineSegments.length > 0 ? lineSegments : [{ text: fallbackText }];

  if (offset <= 0) {
    return displaySegments;
  }

  const slicedSegments: LineSegment[] = [];
  let remainingOffset = offset;

  for (const segment of displaySegments) {
    const segmentWidth = stringWidth(segment.text);

    if (remainingOffset >= segmentWidth) {
      remainingOffset -= segmentWidth;
      continue;
    }

    const slicedText = sliceTextByWidth(segment.text, remainingOffset);

    if (slicedText.length === 0) {
      remainingOffset = 0;
      continue;
    }

    slicedSegments.push({
      text: slicedText,
      fg: segment.fg,
    });
    remainingOffset = 0;
  }

  return slicedSegments;
}

function renderLineSegments(
  lineSegments: LineSegment[],
  fallbackText: string,
  keyPrefix: string,
): ReactNode[] {
  const displaySegments =
    lineSegments.length > 0
      ? lineSegments
      : [{ text: fallbackText.length > 0 ? fallbackText : " " }];
  let offset = 0;

  return displaySegments.map((segment) => {
    const key = `${keyPrefix}-${offset}-${segment.text}`;
    offset += segment.text.length || 1;

    return (
      <span key={key} fg={segment.fg}>
        {segment.text.length > 0 ? segment.text : " "}
      </span>
    );
  });
}

function buildPlainRenderState(content: string): RenderState {
  const lines = content.split("\n");

  return {
    lines,
    segments: lines.map((line) => [{ text: line }]),
  };
}

function findCodeBlocks(content: string): CodeBlockInfo[] {
  return extractFencedCodeBlocks(content).map((block) => ({
    startLine: block.startLine,
    lang: resolveFenceLanguage(block.infoString),
    code: block.code,
  }));
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

export function CodeModeView({
  content,
  showLineNumbers,
  softWrap,
  horizontalOffset,
  theme,
}: CodeModeViewProps) {
  const [renderState, setRenderState] = useState<RenderState>(() =>
    buildPlainRenderState(normalizeMarkdownSource(content)),
  );

  useEffect(() => {
    let cancelled = false;

    async function buildRenderState() {
      const normalized = normalizeMarkdownSource(content);
      const { lines, segments: allSegments } = buildPlainRenderState(normalized);
      const blocks = findCodeBlocks(normalized);
      const syntaxStyle = createSyntaxStyle(theme);

      if (!cancelled) {
        setRenderState({ lines, segments: allSegments.map((segments) => [...segments]) });
      }

      for (const block of blocks) {
        let highlightedLines: LineSegment[][];

        try {
          highlightedLines = splitChunksIntoLines(
            block.code,
            await highlightCode(block.code, block.lang, syntaxStyle),
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
  }, [content, theme]);

  const { lines, segments } = renderState;
  const lineNumberDigits = String(lines.length).length;

  if (showLineNumbers || !softWrap) {
    const gutterWidth = lineNumberDigits + 3;

    return (
      <box width="100%" flexDirection="column">
        {lines.map((lineText, index) => {
          const lineSegments = sliceLineSegments(
            segments[index] ?? [{ text: lineText }],
            lineText,
            softWrap ? 0 : horizontalOffset,
          );
          const lineNumber = `${String(index + 1).padStart(lineNumberDigits)} | `;
          const key = `line-${index}-${lineText}`;

          return (
            <box
              key={key}
              width="100%"
              flexDirection="row"
              alignItems="flex-start"
              shouldFill={false}
            >
              {showLineNumbers && (
                <box width={gutterWidth} flexShrink={0} shouldFill={false}>
                  <text>
                    <span fg={theme.chrome.lineNumber}>{lineNumber}</span>
                  </text>
                </box>
              )}
              <box flexGrow={1} shouldFill={false}>
                <text selectable wrapMode={softWrap ? "word" : "none"}>
                  {renderLineSegments(lineSegments, lineText, `line-${index}`)}
                </text>
              </box>
            </box>
          );
        })}
      </box>
    );
  }

  const nodes: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? "";
    const lineSegments: LineSegment[] = segments[i] ?? [{ text: lineText }];
    const renderedSegments = renderLineSegments(lineSegments, lineText, `plain-${i}`);
    for (const segment of renderedSegments) {
      nodes.push(segment);
    }

    if (i < lines.length - 1) {
      nodes.push("\n");
    }
  }

  return (
    <text selectable wrapMode={softWrap ? "word" : "none"}>
      {nodes}
    </text>
  );
}
