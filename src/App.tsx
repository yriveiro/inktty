import { useTerminalDimensions } from "@opentui/react";
import { MarkdownReader } from "./components/MarkdownReader";
import { useReaderController } from "./controllers/useReaderController";
import { stringWidth } from "./lib/display";
import type { InkTheme } from "./lib/theme";

interface AppProps {
  fileName: string;
  content: string;
  themes: InkTheme[];
  initialThemeName?: string;
}

export function App({ fileName, content, themes, initialThemeName }: AppProps) {
  const { width } = useTerminalDimensions();
  const {
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
  } = useReaderController({ content, themes, initialThemeName });

  const footerRight = `${copied ? "copied! | " : ""}${filePercent}% | ? Help`;
  const fullFooterLeft =
    mode === "code"
      ? `Inktty | ${fileName} | ${theme.name} | code y:${topLine} | w:${softWrap ? "on" : "off"} | n:${showLineNumbers ? "on" : "off"}${softWrap ? "" : ` | x:${horizontalOffset}`}`
      : `Inktty | ${fileName} | ${theme.name} | view y:${topLine}`;
  const compactCodeFooterLeft =
    mode === "code"
      ? `Inktty | ${fileName} | ${theme.name} | code y:${topLine} | n:${showLineNumbers ? "on" : "off"}${softWrap ? "" : ` | x:${horizontalOffset}`}`
      : `Inktty | ${fileName} | ${theme.name} | ${mode} y:${topLine}`;
  const compactFooterLeft =
    mode === "code" && !softWrap
      ? `Inktty | ${fileName} | ${theme.name} | code y:${topLine} | x:${horizontalOffset}`
      : `Inktty | ${fileName} | ${theme.name} | ${mode} y:${topLine}`;
  const minimalFooterLeft = `Inktty | ${fileName} | ${theme.name}`;
  const tinyFooterLeft = `Inktty | ${fileName}`;
  const footerLeftOptions = [
    fullFooterLeft,
    compactCodeFooterLeft,
    compactFooterLeft,
    minimalFooterLeft,
    tinyFooterLeft,
    "Inktty",
  ];
  const footerAvailableWidth = Math.max(1, width - stringWidth(footerRight) - 3);
  const footerLeft =
    footerLeftOptions.find((value) => stringWidth(value) <= footerAvailableWidth) ??
    footerLeftOptions[footerLeftOptions.length - 1] ??
    "Inktty";

  const helpRows: Array<readonly [string, string, string, string]> = [
    ["k/up", "up", "g/home", "go to top"],
    ["j/down", "down", "G/end", "go to bottom"],
    ["b/pgup", "page up", "c", "copy contents"],
    ["f/pgdn", "page down", "?", "toggle help"],
    ["u", "1/2 page up", "esc", "close help"],
    ["d", "1/2 page down", "tab", "toggle view/code"],
  ];

  if (mode === "view") {
    helpRows.push([",/.", "prev/next diagram", "v", "open diagram rendered"]);
  }

  if (themeNames.length > 1) {
    helpRows.push(["t/T", "cycle theme", "q", "quit"]);
  } else {
    helpRows.push(["q", "quit", "", ""]);
  }

  if (mode === "code") {
    helpRows.push(["w", "toggle wrap", "n", "toggle line numbers"]);

    if (!softWrap) {
      helpRows.push(["h/l", "horizontal scroll", "", ""]);
    }
  }

  const helpEntries = helpRows.flatMap(([leftKey, leftDescription, rightKey, rightDescription]) => {
    const entries: Array<readonly [string, string]> = [[leftKey, leftDescription]];

    if (rightKey || rightDescription) {
      entries.push([rightKey, rightDescription]);
    }

    return entries;
  });
  const helpColumnWidth = Math.max(
    0,
    ...helpEntries.map(
      ([keyLabel, description]) => stringWidth(keyLabel) + 2 + stringWidth(description),
    ),
  );
  const useSingleColumnHelp = width < helpColumnWidth * 2 + 6;

  const footerBar = (
    <box
      height={1}
      paddingX={1}
      backgroundColor={theme.chrome.headerBackground}
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
    >
      <text fg={theme.chrome.controls}>{footerLeft}</text>
      <text fg={theme.chrome.controls}>{footerRight}</text>
    </box>
  );

  const helpPanel = showHelp ? (
    <box
      backgroundColor={theme.chrome.helpBackground}
      flexDirection="column"
      paddingX={1}
      paddingTop={1}
      paddingBottom={1}
      flexShrink={0}
    >
      {useSingleColumnHelp
        ? helpEntries.map(([keyLabel, description]) => (
            <box key={`${keyLabel}-${description}`} width="100%" flexDirection="row">
              <box width={10} shouldFill={false}>
                <text fg={theme.chrome.controls}>{keyLabel}</text>
              </box>
              <text fg={theme.chrome.fileName}>{description}</text>
            </box>
          ))
        : helpRows.map(([leftKey, leftDescription, rightKey, rightDescription]) => (
            <box key={`${leftKey}-${rightKey}`} width="100%" flexDirection="row">
              <box width="50%" flexDirection="row">
                <box width={10} shouldFill={false}>
                  <text fg={theme.chrome.controls}>{leftKey}</text>
                </box>
                <text fg={theme.chrome.fileName}>{leftDescription}</text>
              </box>
              <box width="50%" flexDirection="row">
                <box width={10} shouldFill={false}>
                  <text fg={theme.chrome.controls}>{rightKey}</text>
                </box>
                <text fg={theme.chrome.fileName}>{rightDescription}</text>
              </box>
            </box>
          ))}
    </box>
  ) : null;

  return (
    <box flexDirection="column" width="100%" height="100%">
      <MarkdownReader
        content={content}
        focusedMermaidIndex={focusedMermaidIndex}
        mode={mode}
        onMermaidAction={activateMermaid}
        showLineNumbers={showLineNumbers}
        softWrap={softWrap}
        horizontalOffset={horizontalOffset}
        theme={theme}
        scrollboxRef={scrollboxRef}
        scrollRestoreRequest={scrollRestoreRequest}
      />
      {showHelp ? (
        <>
          {footerBar}
          {helpPanel}
        </>
      ) : (
        footerBar
      )}
    </box>
  );
}
