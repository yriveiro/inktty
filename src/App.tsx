import { useTerminalDimensions } from "@opentui/react";
import { MarkdownReader } from "./components/MarkdownReader";
import { stringWidth } from "./lib/display";
import type { InkTheme } from "./lib/theme";
import { useReaderController } from "./useReaderController";

interface AppProps {
  fileName: string;
  content: string;
  themes: InkTheme[];
  initialThemeName?: string;
}

export function App({ fileName, content, themes, initialThemeName }: AppProps) {
  const { width } = useTerminalDimensions();
  const {
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
  } = useReaderController({ content, themes, initialThemeName });

  const footerRight = `${copied ? "copied! | " : ""}${filePercent}% | ? Help`;
  const fullFooterLeft =
    mode === "code"
      ? `Inktty | ${fileName} | ${theme.name} | code y:${topLine} | w:${softWrap ? "on" : "off"} | n:${showLineNumbers ? "on" : "off"}${softWrap ? "" : ` | x:${horizontalOffset}`}`
      : `Inktty | ${fileName} | ${theme.name} | view y:${topLine}`;
  const compactFooterLeft =
    mode === "code" && !softWrap
      ? `Inktty | ${fileName} | ${theme.name} | code y:${topLine} | x:${horizontalOffset}`
      : `Inktty | ${fileName} | ${theme.name} | ${mode} y:${topLine}`;
  const minimalFooterLeft = `Inktty | ${fileName} | ${theme.name}`;
  const tinyFooterLeft = `Inktty | ${fileName}`;
  const footerLeftOptions = [
    fullFooterLeft,
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
      {helpRows.map(([leftKey, leftDescription, rightKey, rightDescription]) => (
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
        mode={mode}
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
