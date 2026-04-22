import type { ScrollBoxRenderable } from "@opentui/core";
import { type RefObject, useLayoutEffect } from "react";
import { CodeModeView } from "./CodeModeView";
import { CustomMarkdown } from "./CustomMarkdown";

export interface ScrollRestoreRequest {
  top: number;
}

interface MarkdownReaderProps {
  content: string;
  mode: "view" | "code";
  showLineNumbers: boolean;
  scrollboxRef: RefObject<ScrollBoxRenderable | null>;
  scrollRestoreRequest: ScrollRestoreRequest | null;
}

export function MarkdownReader({
  content,
  mode,
  showLineNumbers,
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

  return (
    <scrollbox
      id="markdown-reader-scrollbox"
      ref={scrollboxRef}
      flexGrow={1}
      focused
      style={{
        viewportOptions: { padding: 1 },
      }}
    >
      {mode === "view" ? (
        <CustomMarkdown content={content} />
      ) : (
        <CodeModeView content={content} showLineNumbers={showLineNumbers} />
      )}
    </scrollbox>
  );
}
