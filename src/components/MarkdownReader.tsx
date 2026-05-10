import type { ScrollBoxRenderable } from "@opentui/core";
import { type RefObject, useLayoutEffect } from "react";
import type { ReaderMode, ScrollRestoreRequest } from "../controllers/reader/types";
import type { InkTheme } from "../lib/theme";
import { CodeModeView } from "./CodeModeView";
import { CustomMarkdown } from "./CustomMarkdown";

interface MarkdownReaderProps {
  content: string;
  focusedMermaidIndex?: number | null;
  mode: ReaderMode;
  onMermaidAction?: (index: number, code: string) => void;
  showLineNumbers: boolean;
  softWrap: boolean;
  horizontalOffset: number;
  theme: InkTheme;
  scrollboxRef: RefObject<ScrollBoxRenderable | null>;
  scrollRestoreRequest: ScrollRestoreRequest | null;
}

export function MarkdownReader({
  content,
  focusedMermaidIndex,
  mode,
  onMermaidAction,
  showLineNumbers,
  softWrap,
  horizontalOffset,
  theme,
  scrollboxRef,
  scrollRestoreRequest,
}: MarkdownReaderProps) {
  useLayoutEffect(() => {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox || !scrollRestoreRequest || !scrollbox.viewport) {
      return;
    }

    const maxScrollTop = Math.max(0, scrollbox.scrollHeight - scrollbox.viewport.height);
    const targetScrollTop = Math.min(scrollRestoreRequest.top, maxScrollTop);

    scrollbox.scrollTo(targetScrollTop);
  }, [scrollRestoreRequest, scrollboxRef]);

  const customMarkdownProps = {
    content,
    theme,
    ...(focusedMermaidIndex !== undefined ? { focusedMermaidIndex } : {}),
    ...(onMermaidAction !== undefined ? { onMermaidAction } : {}),
  };

  return (
    <scrollbox
      id="markdown-reader-scrollbox"
      ref={scrollboxRef}
      flexGrow={1}
      flexShrink={1}
      focused
      scrollY
      viewportOptions={{ padding: 1 }}
    >
      {mode === "view" ? (
        <CustomMarkdown {...customMarkdownProps} />
      ) : (
        <CodeModeView
          content={content}
          showLineNumbers={showLineNumbers}
          softWrap={softWrap}
          horizontalOffset={horizontalOffset}
          theme={theme}
        />
      )}
    </scrollbox>
  );
}
