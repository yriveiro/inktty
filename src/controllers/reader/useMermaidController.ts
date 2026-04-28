import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { extractMermaidBlocks } from "../../lib/markdown";
import { openMermaidPng } from "../../lib/mermaid";
import type { ReaderMode } from "./types";

interface MermaidController {
  activateMermaid: (index: number, code: string) => void;
  focusedMermaidIndex: number | null;
  getActiveMermaidBlock: () => ReturnType<typeof extractMermaidBlocks>[number] | null;
  navigateMermaid: (direction: -1 | 1) => void;
}

interface MermaidControllerOptions {
  content: string;
  mode: ReaderMode;
  scheduleScrollTopSync: () => void;
  scrollboxRef: React.RefObject<ScrollBoxRenderable | null>;
}

export function useMermaidController({
  content,
  mode,
  scheduleScrollTopSync,
  scrollboxRef,
}: MermaidControllerOptions): MermaidController {
  const mermaidBlocks = useMemo(() => extractMermaidBlocks(content), [content]);
  const [focusedMermaidIndex, setFocusedMermaidIndex] = useState<number | null>(null);

  useEffect(() => {
    setFocusedMermaidIndex((currentIndex) =>
      currentIndex !== null && mermaidBlocks.some((block) => block.index === currentIndex)
        ? currentIndex
        : null,
    );
  }, [mermaidBlocks]);

  const getVisibleMermaidIndices = useCallback((): number[] => {
    const scrollbox = scrollboxRef.current;
    const viewport = scrollbox?.viewport;

    if (!scrollbox || !viewport) {
      return [];
    }

    const viewportTop = viewport.screenY;
    const viewportBottom = viewportTop + viewport.height - 1;

    return mermaidBlocks
      .filter((block) => {
        const renderable = scrollbox.findDescendantById(`mermaid-png-action-${block.index}`);

        if (!renderable) {
          return false;
        }

        const renderableTop = renderable.screenY;
        const renderableBottom = renderable.screenY + renderable.height - 1;

        return renderableBottom >= viewportTop && renderableTop <= viewportBottom;
      })
      .map((block) => block.index);
  }, [mermaidBlocks, scrollboxRef]);

  const focusMermaidBlock = useCallback(
    (index: number): void => {
      const scrollbox = scrollboxRef.current;

      if (!scrollbox) {
        return;
      }

      scrollbox.scrollChildIntoView(`mermaid-png-action-${index}`);
      setFocusedMermaidIndex(index);
      scheduleScrollTopSync();
    },
    [scheduleScrollTopSync, scrollboxRef],
  );

  const getActiveMermaidIndex = useCallback((): number | null => {
    if (
      focusedMermaidIndex !== null &&
      mermaidBlocks.some((block) => block.index === focusedMermaidIndex)
    ) {
      return focusedMermaidIndex;
    }

    return getVisibleMermaidIndices()[0] ?? mermaidBlocks[0]?.index ?? null;
  }, [focusedMermaidIndex, getVisibleMermaidIndices, mermaidBlocks]);

  const getActiveMermaidBlock = useCallback(() => {
    const activeIndex = getActiveMermaidIndex();

    if (activeIndex === null) {
      return null;
    }

    return mermaidBlocks.find((block) => block.index === activeIndex) ?? null;
  }, [getActiveMermaidIndex, mermaidBlocks]);

  const navigateMermaid = useCallback(
    (direction: -1 | 1): void => {
      if (mode !== "view" || mermaidBlocks.length === 0) {
        return;
      }

      const currentIndex = getActiveMermaidIndex();

      if (currentIndex === null) {
        return;
      }

      const currentPosition = mermaidBlocks.findIndex((block) => block.index === currentIndex);

      if (currentPosition === -1) {
        return;
      }

      const nextPosition = Math.min(
        Math.max(0, currentPosition + direction),
        mermaidBlocks.length - 1,
      );
      const nextIndex = mermaidBlocks[nextPosition]?.index;

      if (nextIndex === undefined) {
        return;
      }

      focusMermaidBlock(nextIndex);
    },
    [focusMermaidBlock, getActiveMermaidIndex, mermaidBlocks, mode],
  );

  const activateMermaid = useCallback(
    (index: number, code: string): void => {
      setFocusedMermaidIndex(index);
      scheduleScrollTopSync();
      void openMermaidPng(code);
    },
    [scheduleScrollTopSync],
  );

  return {
    activateMermaid,
    focusedMermaidIndex,
    getActiveMermaidBlock,
    navigateMermaid,
  };
}
