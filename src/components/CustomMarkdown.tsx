import { RGBA, type TextChunk, TextTableRenderable } from "@opentui/core";
import { extend } from "@opentui/react";
import type { Token, Tokens } from "marked";
import { createElement, Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { getCodeBlockMeta } from "../lib/code-block-meta";
import { centerText, padTextEnd, padTextStart, stringWidth } from "../lib/display";
import {
  createSyntaxStyle,
  type HighlightChunk,
  highlightCode,
  resolveFenceLanguage,
} from "../lib/highlight";
import { lexMarkdown } from "../lib/markdown";
import type { CalloutTheme, InkTheme, LinkTheme } from "../lib/theme";

interface CustomMarkdownProps {
  content: string;
  theme: InkTheme;
}

let textTableRegistered = false;

if (!textTableRegistered) {
  extend({ "text-table": TextTableRenderable });
  textTableRegistered = true;
}

const calloutAliases: Record<string, keyof InkTheme["markdown"]["callout"]> = {
  abstract: "info",
  attention: "warning",
  bug: "danger",
  check: "success",
  done: "success",
  error: "danger",
  fail: "danger",
  failure: "danger",
  faq: "question",
  help: "question",
  hint: "tip",
  missing: "danger",
  summary: "info",
  tldr: "info",
  todo: "note",
};

function getHeadingStyle(theme: InkTheme, depth: number) {
  const normalizedDepth = Math.min(Math.max(depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
  return theme.markdown.heading[`h${normalizedDepth}`];
}

function getLinkStyle(theme: InkTheme, href: string): LinkTheme {
  if (/^https?:\/\/github\.com\//.test(href)) {
    return theme.markdown.links.github;
  }

  if (/^https?:\/\//.test(href)) {
    return theme.markdown.links.web;
  }

  if (/^mailto:/.test(href)) {
    return theme.markdown.links.mail;
  }

  if (/^#/.test(href)) {
    return theme.markdown.links.anchor;
  }

  if (/^(\.\.?\/|\/)/.test(href)) {
    return theme.markdown.links.path;
  }

  return theme.markdown.links.default;
}

function toInlineTokens(token: { tokens?: Token[]; text?: string; raw?: string }): Token[] {
  if (token.tokens?.length) {
    return token.tokens;
  }

  if (typeof token.text === "string") {
    return [{ type: "text", raw: token.raw ?? token.text, text: token.text } as Tokens.Text];
  }

  return [];
}

function getInlinePlainText(tokens?: Token[]): string {
  if (!tokens?.length) {
    return "";
  }

  return tokens
    .map((token) => {
      switch (token.type) {
        case "br":
          return " ";
        case "codespan":
        case "escape":
        case "html":
        case "text":
          return token.text;
        case "del":
        case "em":
        case "link":
        case "strong":
          return getInlinePlainText(token.tokens);
        case "image":
          return token.text || token.href;
        default:
          return "text" in token && typeof token.text === "string" ? token.text : token.raw;
      }
    })
    .join("");
}

function alignCell(text: string, width: number, align: Tokens.TableCell["align"]): string {
  switch (align) {
    case "center":
      return centerText(text, width);
    case "right":
      return padTextStart(text, width);
    default:
      return padTextEnd(text, width);
  }
}

function createTableCell(text: string, foreground: string): TextChunk[] {
  return [{ __isChunk: true, text, fg: RGBA.fromHex(foreground) }];
}

function renderInlineToken(theme: InkTheme, token: Token, key: string): ReactNode {
  switch (token.type) {
    case "br": {
      return "\n";
    }
    case "codespan": {
      return (
        <span
          key={key}
          fg={theme.markdown.inlineCode.foreground}
          bg={theme.markdown.inlineCode.background}
        >
          {token.text}
        </span>
      );
    }
    case "del": {
      return (
        <span key={key} fg={theme.syntax.comment}>
          {renderInlineTokens(theme, token.tokens ?? [], `${key}-del`)}
        </span>
      );
    }
    case "em": {
      return <em key={key}>{renderInlineTokens(theme, token.tokens ?? [], `${key}-em`)}</em>;
    }
    case "escape":
    case "html":
    case "text": {
      return token.text;
    }
    case "image": {
      return (
        <span key={key} fg={theme.markdown.links.path.foreground}>
          [img: {token.text || token.href}]
        </span>
      );
    }
    case "link": {
      const linkStyle = getLinkStyle(theme, token.href);

      return (
        <a key={key} href={token.href}>
          <span fg={linkStyle.foreground}>
            {`${linkStyle.icon} `}
            {renderInlineTokens(theme, token.tokens ?? [], `${key}-link`)}
          </span>
        </a>
      );
    }
    case "strong": {
      return (
        <strong key={key}>{renderInlineTokens(theme, token.tokens ?? [], `${key}-strong`)}</strong>
      );
    }
    default: {
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return (
          <Fragment key={key}>{renderInlineTokens(theme, token.tokens, `${key}-tokens`)}</Fragment>
        );
      }

      if ("text" in token && typeof token.text === "string") {
        return token.text;
      }

      return token.raw;
    }
  }
}

function renderInlineTokens(theme: InkTheme, tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token) => {
    const tokenKey = `${keyPrefix}-${token.type}-${token.raw}`;

    return <Fragment key={tokenKey}>{renderInlineToken(theme, token, tokenKey)}</Fragment>;
  });
}

function renderParagraphTokens(theme: InkTheme, tokens: Token[], key: string) {
  return (
    <box key={key} width="100%" marginBottom={1}>
      <text selectable>{renderInlineTokens(theme, tokens, `${key}-inline`)}</text>
    </box>
  );
}

function renderTable(theme: InkTheme, token: Tokens.Table, key: string) {
  const { table } = theme.markdown;
  const headerTexts = token.header.map((cell) => getInlinePlainText(cell.tokens));
  const rowTexts = token.rows.map((row) => row.map((cell) => getInlinePlainText(cell.tokens)));
  const widths = headerTexts.map((headerText, index) =>
    Math.max(stringWidth(headerText), ...rowTexts.map((row) => stringWidth(row[index] ?? ""))),
  );
  const content = [
    headerTexts.map((cellText, index) =>
      createTableCell(
        alignCell(cellText, widths[index] ?? stringWidth(cellText), token.align[index] ?? "left"),
        table.headerForeground,
      ),
    ),
    ...rowTexts.map((row) =>
      row.map((cellText, index) =>
        createTableCell(
          alignCell(cellText, widths[index] ?? stringWidth(cellText), token.align[index] ?? null),
          table.rowForeground,
        ),
      ),
    ),
  ];
  const tableWidth =
    widths.reduce((total, width) => total + width, 0) + Math.max(0, widths.length - 1);

  return (
    <box key={key} width="100%" marginBottom={1}>
      <box
        width={tableWidth + 2}
        shouldFill={false}
        alignSelf="flex-start"
        border
        borderColor={table.border}
        backgroundColor={table.background}
      >
        {createElement("text-table", {
          content,
          width: tableWidth,
          columnWidthMode: "content",
          wrapMode: "none",
          cellPadding: 0,
          border: true,
          outerBorder: false,
          showBorders: true,
          borderStyle: "single",
          borderColor: table.separatorForeground,
          borderBackgroundColor: table.background,
          backgroundColor: table.background,
          selectable: true,
        })}
      </box>
    </box>
  );
}

function renderListItemBody(theme: InkTheme, tokens: Token[], key: string): ReactNode {
  const contentTokens = tokens.filter((token) => token.type !== "checkbox");

  if (contentTokens.length === 0) {
    return <text selectable> </text>;
  }

  if (contentTokens.length === 1) {
    const token = contentTokens[0];

    if (token?.type === "paragraph" || token?.type === "text") {
      return (
        <text selectable>{renderInlineTokens(theme, toInlineTokens(token), `${key}-inline`)}</text>
      );
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {renderBlocks(theme, contentTokens, `${key}-blocks`)}
    </box>
  );
}

function renderList(theme: InkTheme, token: Tokens.List, key: string) {
  const orderedStart = token.ordered && typeof token.start === "number" ? token.start : 1;
  const prefixWidth = token.ordered ? String(orderedStart + token.items.length - 1).length + 2 : 4;

  return (
    <box key={key} width="100%" flexDirection="column" marginBottom={1}>
      {token.items.map((item, index) => {
        const prefix = item.task
          ? item.checked
            ? "[x]"
            : "[ ]"
          : token.ordered
            ? `${orderedStart + index}.`
            : theme.markdown.list.bullet;
        const prefixColor = item.task
          ? item.checked
            ? theme.markdown.list.taskChecked
            : theme.markdown.list.taskUnchecked
          : theme.markdown.list.bulletForeground;
        const itemKey = `${key}-item-${item.raw}`;

        return (
          <box key={itemKey} width="100%" flexDirection="row" marginBottom={item.loose ? 1 : 0}>
            <box width={prefixWidth}>
              <text selectable>
                <span fg={prefixColor}>{prefix}</span>
              </text>
            </box>
            <box flexGrow={1}>{renderListItemBody(theme, item.tokens, itemKey)}</box>
          </box>
        );
      })}
    </box>
  );
}

function parseCallout(
  theme: InkTheme,
  text: string,
): { body: string; style: CalloutTheme; title?: string } | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  const match = firstLine.match(/^\[!([^\]]+)\](?:\s+(.*))?$/);

  if (!match) {
    return null;
  }

  const rawType = match[1]?.toLowerCase() ?? "note";
  const normalizedType =
    calloutAliases[rawType] ?? (rawType as keyof InkTheme["markdown"]["callout"]);
  const style = theme.markdown.callout[normalizedType] ?? theme.markdown.callout.note;
  const title = match[2]?.trim();
  const body = lines.slice(1).join("\n").trim();

  return {
    body,
    style,
    title,
  };
}

function renderBlockquote(theme: InkTheme, token: Tokens.Blockquote, key: string) {
  const callout = parseCallout(theme, token.text);

  if (callout) {
    const headerText = callout.title
      ? `${callout.style.badge} ${callout.title}`
      : callout.style.badge;
    const bodyTokens = callout.body ? lexMarkdown(callout.body) : [];

    return (
      <box
        key={key}
        width="100%"
        flexDirection="column"
        marginBottom={1}
        border={["left"]}
        borderColor={callout.style.border}
        backgroundColor={callout.style.background}
        paddingLeft={1}
      >
        <text selectable>
          <span fg={callout.style.foreground}>
            <strong>{headerText}</strong>
          </span>
        </text>
        {bodyTokens.length > 0 && (
          <box marginTop={1}>{renderBlocks(theme, bodyTokens, `${key}-callout`)}</box>
        )}
      </box>
    );
  }

  return (
    <box key={key} width="100%" flexDirection="row" gap={1} marginBottom={1}>
      <text selectable>
        <span fg={theme.markdown.blockquote.foreground}>{theme.markdown.blockquote.marker}</span>
      </text>
      <box
        flexGrow={1}
        paddingLeft={1}
        border={["left"]}
        borderColor={theme.markdown.blockquote.border}
      >
        {renderBlocks(theme, token.tokens, `${key}-quote`)}
      </box>
    </box>
  );
}

function CodeBlock({ code, language, theme }: { code: string; language: string; theme: InkTheme }) {
  const filetype = resolveFenceLanguage(language);
  const syntaxStyle = useMemo(() => createSyntaxStyle(theme), [theme]);
  const [chunks, setChunks] = useState<HighlightChunk[]>([{ text: code, attributes: 0 }]);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const highlighted = await highlightCode(code, filetype, syntaxStyle);
        if (!cancelled) {
          setChunks(highlighted);
        }
      } catch (_e) {
        // Keep raw code on error
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, filetype, syntaxStyle]);

  const { icon } = getCodeBlockMeta(filetype);
  const style = theme.markdown.codeBlock;
  const header = (
    <box
      backgroundColor={style.headerBackground}
      paddingX={1}
      paddingTop={style.topSpacing}
      paddingBottom={style.bottomSpacing}
      border={style.separator ? ["bottom"] : undefined}
      borderColor={style.separator ? style.border : undefined}
    >
      <text selectable>
        <span fg={style.label}>{icon}</span>
      </text>
    </box>
  );
  const body = (
    <box padding={1}>
      <text selectable>
        {chunks.map((chunk, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chunks are static ordered syntax segments
          <span key={i} fg={chunk.fg}>
            {chunk.text}
          </span>
        ))}
      </text>
    </box>
  );

  if (!style.borderVisible) {
    return (
      <box width="100%" flexDirection="column" backgroundColor={style.background}>
        {header}
        {body}
      </box>
    );
  }

  return (
    <box
      width="100%"
      flexDirection="column"
      border
      borderColor={style.border}
      backgroundColor={style.background}
    >
      {header}
      {body}
    </box>
  );
}

function renderToken(theme: InkTheme, token: Token, index: number, keyPrefix = "token"): ReactNode {
  const key = `${keyPrefix}-${index}`;
  const syntaxStyle = createSyntaxStyle(theme);

  switch (token.type) {
    case "blockquote": {
      return renderBlockquote(theme, token as Tokens.Blockquote, key);
    }
    case "code": {
      return (
        <box key={key} marginBottom={1}>
          <CodeBlock code={token.text} language={token.lang || "text"} theme={theme} />
        </box>
      );
    }
    case "heading": {
      const style = getHeadingStyle(theme, token.depth);
      const showIcon = style.icon.trim().length > 0;

      return (
        <box
          key={key}
          width="100%"
          marginBottom={1}
          paddingX={1}
          paddingTop={style.topSpacing}
          paddingBottom={style.bottomSpacing}
          border={style.separator ? ["bottom"] : undefined}
          borderColor={style.separator ? style.border : undefined}
          backgroundColor={style.background}
        >
          <text selectable>
            {showIcon ? (
              <span fg={style.foreground}>
                <strong>{`${style.icon} `}</strong>
              </span>
            ) : null}
            <span fg={style.foreground}>
              <strong>{renderInlineTokens(theme, token.tokens ?? [], `${key}-heading`)}</strong>
            </span>
          </text>
        </box>
      );
    }
    case "hr": {
      return (
        <box key={key} width="100%" flexDirection="row" alignItems="center" marginY={1}>
          <box
            flexGrow={1}
            height={1}
            border={["bottom"]}
            borderColor={theme.markdown.horizontalRule.foreground}
          />
        </box>
      );
    }
    case "list": {
      return renderList(theme, token as Tokens.List, key);
    }
    case "paragraph": {
      return renderParagraphTokens(theme, token.tokens ?? [], key);
    }
    case "space": {
      return null;
    }
    case "table": {
      return renderTable(theme, token as Tokens.Table, key);
    }
    case "text": {
      return renderParagraphTokens(theme, toInlineTokens(token), key);
    }
    default: {
      return <markdown key={key} content={token.raw} syntaxStyle={syntaxStyle} />;
    }
  }
}

function renderBlocks(theme: InkTheme, tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => renderToken(theme, token, index, keyPrefix));
}

export function CustomMarkdown({ content, theme }: CustomMarkdownProps) {
  const tokens = lexMarkdown(content);

  return <>{renderBlocks(theme, tokens, "root")}</>;
}
