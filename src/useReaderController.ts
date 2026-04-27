import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScrollRestoreRequest } from "./components/MarkdownReader";
import { stringWidth } from "./lib/display";
import { normalizeMarkdownSource } from "./lib/markdown";
import { defaultTheme, type InkTheme, listThemeNames, resolveThemeByName } from "./lib/theme";

interface UseReaderControllerOptions {
  content: string;
  themes: InkTheme[];
  initialThemeName?: string;
}

interface ReaderControllerState {
  copied: boolean;
  filePercent: number;
  mode: "view" | "code";
  scrollRestoreRequest: ScrollRestoreRequest | null;
  scrollboxRef: RefObject<ScrollBoxRenderable | null>;
  showHelp: boolean;
  showLineNumbers: boolean;
  softWrap: boolean;
  theme: InkTheme;
  themeNames: string[];
  topLine: number;
  horizontalOffset: number;
}

export function useReaderController({
  content,
  themes,
  initialThemeName,
}: UseReaderControllerOptions): ReaderControllerState {
  const renderer = useRenderer();
  const availableThemes = useMemo(() => (themes.length > 0 ? themes : [defaultTheme]), [themes]);
  const themeNames = useMemo(() => listThemeNames(availableThemes), [availableThemes]);
  const [activeThemeName, setActiveThemeName] = useState(
    () => resolveThemeByName(availableThemes, initialThemeName).name,
  );
  const [mode, setMode] = useState<"view" | "code">("view");
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [softWrap, setSoftWrap] = useState(true);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollRestoreRequest, setScrollRestoreRequest] = useState<ScrollRestoreRequest | null>(
    null,
  );
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useMemo(
    () => resolveThemeByName(availableThemes, activeThemeName),
    [activeThemeName, availableThemes],
  );

  function cycleTheme(step: number): void {
    if (themeNames.length < 2) {
      return;
    }

    setActiveThemeName((currentThemeName) => {
      const currentIndex = themeNames.indexOf(currentThemeName);
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + step + themeNames.length) % themeNames.length;

      return themeNames[nextIndex] ?? currentThemeName;
    });
  }

  function getMaxHorizontalOffset(): number {
    const scrollbox = scrollboxRef.current;
    const viewportWidth = scrollbox?.viewport?.width ?? 0;
    const lines = normalizeMarkdownSource(content).split("\n");
    const gutterWidth = showLineNumbers ? String(lines.length).length + 3 : 0;
    const availableWidth = Math.max(1, viewportWidth - gutterWidth);
    const longestLine = lines.reduce((maxWidth, line) => Math.max(maxWidth, stringWidth(line)), 0);

    return Math.max(0, longestLine - availableWidth);
  }

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

  function syncScrollTop(): void {
    const nextScrollTop = scrollboxRef.current?.scrollTop ?? 0;

    setScrollTop((currentScrollTop) =>
      currentScrollTop === nextScrollTop ? currentScrollTop : nextScrollTop,
    );
  }

  function scheduleScrollTopSync(): void {
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }

    scrollSyncTimeoutRef.current = setTimeout(() => {
      scrollSyncTimeoutRef.current = null;
      syncScrollTop();
    }, 0);
  }

  function getMaxScrollableTop(): number {
    const scrollbox = scrollboxRef.current;
    const viewportHeight = scrollbox?.viewport?.height ?? 0;

    return Math.max(0, (scrollbox?.scrollHeight ?? 0) - viewportHeight);
  }

  function scrollToTop(): void {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return;
    }

    scrollbox.scrollTo(0);
    scheduleScrollTopSync();
  }

  function scrollToBottom(): void {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return;
    }

    scrollbox.scrollTo(getMaxScrollableTop());
    scheduleScrollTopSync();
  }

  function scrollByViewport(delta: number): void {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return;
    }

    scrollbox.scrollBy(delta, "viewport");
    scheduleScrollTopSync();
  }

  const flashCopied = useCallback((): void => {
    setCopied(true);

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    copiedTimeoutRef.current = setTimeout(() => {
      copiedTimeoutRef.current = null;
      setCopied(false);
    }, 1500);
  }, []);

  useEffect(() => {
    const resolvedThemeName = resolveThemeByName(availableThemes, activeThemeName).name;

    if (resolvedThemeName !== activeThemeName) {
      setActiveThemeName(resolvedThemeName);
    }
  }, [activeThemeName, availableThemes]);

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

    if (key.name === "tab") {
      queueScrollRestore();
      setMode((value) => (value === "view" ? "code" : "view"));
      scheduleScrollTopSync();
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
    }

    if (key.name === "n" && mode === "code") {
      queueScrollRestore();
      setShowLineNumbers((value) => !value);
      scheduleScrollTopSync();
    }

    if (key.name === "t") {
      cycleTheme(key.shift ? -1 : 1);
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

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }

      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (selection: { getSelectedText: () => string }) => {
      const text = selection.getSelectedText();

      if (text) {
        renderer.copyToClipboardOSC52(text);
        flashCopied();
      }
    };

    renderer.on("selection", handler);

    return () => {
      renderer.off("selection", handler);
    };
  }, [flashCopied, renderer]);

  const topLine = scrollTop + 1;
  const filePercent = (() => {
    const maxScrollableTop = getMaxScrollableTop();

    if (maxScrollableTop === 0) {
      return 100;
    }

    return Math.min(100, Math.round((scrollTop / maxScrollableTop) * 100));
  })();

  return {
    copied,
    filePercent,
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
