import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stringWidth } from "../../lib/display";
import { normalizeMarkdownSource } from "../../lib/markdown";
import type { ScrollRestoreRequest } from "./types";

interface ScrollController {
  filePercent: number;
  getMaxHorizontalOffset: () => number;
  queueScrollRestore: () => void;
  scheduleScrollTopSync: () => void;
  scrollByViewport: (delta: number) => void;
  scrollRestoreRequest: ScrollRestoreRequest | null;
  scrollToBottom: () => void;
  scrollToTop: () => void;
  scrollboxRef: React.RefObject<ScrollBoxRenderable | null>;
  topLine: number;
}

export function useScrollController(content: string, showLineNumbers: boolean): ScrollController {
  const lines = useMemo(() => normalizeMarkdownSource(content).split("\n"), [content]);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollRestoreRequest, setScrollRestoreRequest] = useState<ScrollRestoreRequest | null>(
    null,
  );
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);
  const scrollSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncScrollTop = useCallback((): void => {
    const nextScrollTop = scrollboxRef.current?.scrollTop ?? 0;

    setScrollTop((currentScrollTop) =>
      currentScrollTop === nextScrollTop ? currentScrollTop : nextScrollTop,
    );
  }, []);

  const scheduleScrollTopSync = useCallback((): void => {
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }

    scrollSyncTimeoutRef.current = setTimeout(() => {
      scrollSyncTimeoutRef.current = null;
      syncScrollTop();
    }, 0);
  }, [syncScrollTop]);

  const getMaxScrollableTop = useCallback((): number => {
    const scrollbox = scrollboxRef.current;
    const viewportHeight = scrollbox?.viewport?.height ?? 0;

    return Math.max(0, (scrollbox?.scrollHeight ?? 0) - viewportHeight);
  }, []);

  const queueScrollRestore = useCallback((): void => {
    const scrollbox = scrollboxRef.current;

    setScrollRestoreRequest(scrollbox ? { top: scrollbox.scrollTop } : null);
  }, []);

  const scrollToTop = useCallback((): void => {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return;
    }

    scrollbox.scrollTo(0);
    scheduleScrollTopSync();
  }, [scheduleScrollTopSync]);

  const scrollToBottom = useCallback((): void => {
    const scrollbox = scrollboxRef.current;

    if (!scrollbox) {
      return;
    }

    scrollbox.scrollTo(getMaxScrollableTop());
    scheduleScrollTopSync();
  }, [getMaxScrollableTop, scheduleScrollTopSync]);

  const scrollByViewport = useCallback(
    (delta: number): void => {
      const scrollbox = scrollboxRef.current;

      if (!scrollbox) {
        return;
      }

      scrollbox.scrollBy(delta, "viewport");
      scheduleScrollTopSync();
    },
    [scheduleScrollTopSync],
  );

  const getMaxHorizontalOffset = useCallback((): number => {
    const scrollbox = scrollboxRef.current;
    const viewportWidth = scrollbox?.viewport?.width ?? 0;
    const gutterWidth = showLineNumbers ? String(lines.length).length + 3 : 0;
    const availableWidth = Math.max(1, viewportWidth - gutterWidth);
    const longestLine = lines.reduce((maxWidth, line) => Math.max(maxWidth, stringWidth(line)), 0);

    return Math.max(0, longestLine - availableWidth);
  }, [lines, showLineNumbers]);

  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  const topLine = scrollTop + 1;
  const filePercent = (() => {
    const maxScrollableTop = getMaxScrollableTop();

    if (maxScrollableTop === 0) {
      return 100;
    }

    return Math.min(100, Math.round((scrollTop / maxScrollableTop) * 100));
  })();

  return {
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
  };
}
