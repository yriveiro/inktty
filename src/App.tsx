import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { MarkdownReader, type ScrollRestoreRequest } from "./components/MarkdownReader";

interface AppProps {
  fileName: string;
  content: string;
}

export function App({ fileName, content }: AppProps) {
  const renderer = useRenderer();
  const [mode, setMode] = useState<"view" | "code">("view");
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollRestoreRequest, setScrollRestoreRequest] = useState<ScrollRestoreRequest | null>(
    null,
  );
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);

  function captureScrollRestore(): ScrollRestoreRequest | null {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return null;
    }

    return {
      top: scrollbox.scrollTop,
    };
  }

  function queueScrollRestore(): void {
    setScrollRestoreRequest(captureScrollRestore());
  }

  useKeyboard((key) => {
    if (key.name === "q") {
      renderer.destroy();
    }
    if (key.name === "tab") {
      queueScrollRestore();
      setMode((m) => (m === "view" ? "code" : "view"));
    }
    if (key.name === "l" && mode === "code") {
      queueScrollRestore();
      setShowLineNumbers((s) => !s);
    }
  });

  useEffect(() => {
    let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

    const handler = (selection: { getSelectedText: () => string }) => {
      const text = selection.getSelectedText();
      if (text) {
        renderer.copyToClipboardOSC52(text);
        setCopied(true);
        if (copiedTimeout) {
          clearTimeout(copiedTimeout);
        }
        copiedTimeout = setTimeout(() => setCopied(false), 1500);
      }
    };

    renderer.on("selection", handler);

    return () => {
      if (copiedTimeout) {
        clearTimeout(copiedTimeout);
      }
      renderer.off("selection", handler);
    };
  }, [renderer]);

  const controls =
    mode === "code"
      ? `| tab: toggle | l: lines ${showLineNumbers ? "on" : "off"} | q: quit`
      : "| tab: toggle | q: quit";

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box
        height={1}
        paddingX={1}
        backgroundColor="#1a1a2e"
        flexDirection="row"
        justifyContent="space-between"
      >
        <box flexDirection="row">
          <text fg="#7aa2f7">mdreader</text>
          <text fg="#565f89"> | {fileName}</text>
        </box>
        <box flexDirection="row" gap={2}>
          <text fg={mode === "view" ? "#7aa2f7" : "#565f89"}>view</text>
          <text fg={mode === "code" ? "#7aa2f7" : "#565f89"}>code</text>
          <text fg="#565f89">{controls}</text>
          {copied && <text fg="#9ece6a">copied!</text>}
        </box>
      </box>
      <MarkdownReader
        content={content}
        mode={mode}
        showLineNumbers={showLineNumbers}
        scrollboxRef={scrollboxRef}
        scrollRestoreRequest={scrollRestoreRequest}
      />
    </box>
  );
}
