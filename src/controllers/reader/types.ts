import type { ScrollBoxRenderable } from "@opentui/core";
import type { RefObject } from "react";
import type { InkTheme } from "../../lib/theme";

export type ReaderMode = "view" | "code";

export interface ScrollRestoreRequest {
  top: number;
}

export interface UseReaderControllerOptions {
  content: string;
  themes: InkTheme[];
  initialThemeName?: string;
}

export interface ReaderControllerState {
  activateMermaid: (index: number, code: string) => void;
  copied: boolean;
  filePercent: number;
  focusedMermaidIndex: number | null;
  mode: ReaderMode;
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
