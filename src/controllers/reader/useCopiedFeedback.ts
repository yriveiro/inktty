import type { CliRenderer } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface CopyFeedback {
  copied: boolean;
  flashCopied: () => void;
}

export function useCopiedFeedback(renderer: CliRenderer): CopyFeedback {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
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

  return { copied, flashCopied };
}
