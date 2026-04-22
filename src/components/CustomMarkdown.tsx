import { marked, type Token } from "marked";
import { type ReactNode, useEffect, useState } from "react";
import {
  type HighlightChunk,
  highlightCode,
  resolveFenceLanguage,
  syntaxStyle,
} from "../lib/highlight";

interface CustomMarkdownProps {
  content: string;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [chunks, setChunks] = useState<HighlightChunk[]>([{ text: code, attributes: 0 }]);

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      const filetype = resolveFenceLanguage(language);

      try {
        const highlighted = await highlightCode(code, filetype);
        if (!cancelled) {
          setChunks(highlighted);
        }
      } catch (_e) {
        // Keep raw code on error
      }
    }
    highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <box backgroundColor="#1f2335" padding={1}>
      <text>
        {chunks.map((chunk, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chunks are static ordered syntax segments
          <span key={i} fg={chunk.fg}>
            {chunk.text}
          </span>
        ))}
      </text>
    </box>
  );
}

function renderToken(token: Token, index: number): ReactNode {
  switch (token.type) {
    case "code": {
      return (
        <box key={index} marginBottom={1}>
          <CodeBlock code={token.text} language={token.lang || "text"} />
        </box>
      );
    }
    case "hr": {
      return (
        <box
          key={index}
          width="100%"
          height={1}
          marginY={1}
          border={["bottom"]}
          borderColor="#565f89"
        />
      );
    }
    case "space": {
      return null;
    }
    default: {
      // For heading, paragraph, list, blockquote, etc.
      // Pass raw markdown to <markdown> for rendering
      return <markdown key={index} content={token.raw} syntaxStyle={syntaxStyle} />;
    }
  }
}

export function CustomMarkdown({ content }: CustomMarkdownProps) {
  const tokens = marked.lexer(content);
  return <>{tokens.map((token, i) => renderToken(token, i))}</>;
}
