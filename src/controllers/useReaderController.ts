import { useKeyboard, useRenderer } from "@opentui/react";
import { useState } from "react";
import type { ReaderControllerState, ReaderMode, UseReaderControllerOptions } from "./reader/types";
import { useCopiedFeedback } from "./reader/useCopiedFeedback";
import { useMermaidController } from "./reader/useMermaidController";
import { useReaderTheme } from "./reader/useReaderTheme";
import { useScrollController } from "./reader/useScrollController";

export function useReaderController({
  content,
  themes,
  initialThemeName,
}: UseReaderControllerOptions): ReaderControllerState {
  const renderer = useRenderer();
  const { copied, flashCopied } = useCopiedFeedback(renderer);
  const { cycleTheme, theme, themeNames } = useReaderTheme(themes, initialThemeName);
  const [mode, setMode] = useState<ReaderMode>("view");
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [softWrap, setSoftWrap] = useState(true);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const {
    filePercent,
    getMaxHorizontalOffset,
    queueScrollRestore,
    scheduleScrollTopSync,
    scrollByViewport,
    scrollRestoreRequest,
    scrollToBottom,
    scrollToTop,
    scrollboxRef,
    topLine,
  } = useScrollController(content, showLineNumbers);
  const { activateMermaid, focusedMermaidIndex, getActiveMermaidBlock, navigateMermaid } =
    useMermaidController({
      content,
      mode,
      scheduleScrollTopSync,
      scrollboxRef,
    });

  useKeyboard((key) => {
    const isHelpToggle = key.sequence === "?" || (key.shift && key.name === "/");

    if (isHelpToggle) {
      setShowHelp((value) => !value);
      return;
    }

    if (key.name === "escape" && showHelp) {
      setShowHelp(false);
      return;
    }

    if (key.name === "q") {
      renderer.destroy();
      return;
    }

    if (key.name === "c") {
      renderer.copyToClipboardOSC52(content);
      flashCopied();
      return;
    }

    if (key.name === "g") {
      if (key.shift) {
        scrollToBottom();
      } else {
        scrollToTop();
      }

      return;
    }

    if (key.name === "b") {
      scrollByViewport(-1);
      return;
    }

    if (key.name === "f") {
      scrollByViewport(1);
      return;
    }

    if (key.name === "u") {
      scrollByViewport(-0.5);
      return;
    }

    if (key.name === "d") {
      scrollByViewport(0.5);
      return;
    }

    if (key.sequence === ",") {
      navigateMermaid(-1);
      return;
    }

    if (key.sequence === ".") {
      navigateMermaid(1);
      return;
    }

    if (key.name === "v") {
      const mermaidBlock = getActiveMermaidBlock();

      if (mode === "view" && mermaidBlock) {
        activateMermaid(mermaidBlock.index, mermaidBlock.code);
        return;
      }
    }

    if (key.name === "tab") {
      queueScrollRestore();
      setMode((value) => (value === "view" ? "code" : "view"));
      scheduleScrollTopSync();
      return;
    }

    if (key.name === "w" && mode === "code") {
      queueScrollRestore();
      setSoftWrap((value) => {
        if (!value) {
          setHorizontalOffset(0);
        }

        return !value;
      });
      scheduleScrollTopSync();
      return;
    }

    if (key.name === "n" && mode === "code") {
      queueScrollRestore();
      setShowLineNumbers((value) => !value);
      scheduleScrollTopSync();
      return;
    }

    if (key.name === "t") {
      cycleTheme(key.shift ? -1 : 1);
      return;
    }

    if (
      key.name === "j" ||
      key.name === "k" ||
      key.name === "up" ||
      key.name === "down" ||
      key.name === "pageup" ||
      key.name === "pagedown" ||
      key.name === "home" ||
      key.name === "end"
    ) {
      scheduleScrollTopSync();
      return;
    }

    if (!softWrap && mode === "code") {
      const maxHorizontalOffset = getMaxHorizontalOffset();

      if (key.name === "h") {
        setHorizontalOffset((value) => Math.max(0, value - 4));
      }

      if (key.name === "l") {
        setHorizontalOffset((value) => Math.min(maxHorizontalOffset, value + 4));
      }
    }
  });

  return {
    activateMermaid,
    copied,
    filePercent,
    focusedMermaidIndex,
    mode,
    scrollRestoreRequest,
    scrollboxRef,
    showHelp,
    showLineNumbers,
    softWrap,
    theme,
    themeNames,
    topLine,
    horizontalOffset,
  };
}
