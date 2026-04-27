import type { Token, Tokens } from "marked";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
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

const codeBlockLabels: Record<string, string> = {
  bash: "sh",
  fish: "sh",
  javascript: "js",
  javascriptreact: "jsx",
  json: "json",
  java: "java",
  rego: "rego",
  shell: "sh",
  sh: "sh",
  text: "txt",
  typescript: "ts",
  typescriptreact: "tsx",
  yaml: "yaml",
  yml: "yaml",
  zsh: "sh",
};

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

function getCodeBlockLabel(filetype: string): string {
  return codeBlockLabels[filetype] ?? filetype.slice(0, 6) ?? "txt";
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
  const headerTexts = token.header.map((cell) => {
    const indicator =
      cell.align === "center"
        ? table.centerAlignIndicator
        : cell.align === "right"
          ? table.rightAlignIndicator
          : table.leftAlignIndicator;
    return `${getInlinePlainText(cell.tokens)} ${indicator}`;
  });
  const rowTexts = token.rows.map((row) => row.map((cell) => getInlinePlainText(cell.tokens)));
  const widths = headerTexts.map((headerText, index) =>
    Math.max(stringWidth(headerText), ...rowTexts.map((row) => stringWidth(row[index] ?? ""))),
  );

  const headerLine = headerTexts
    .map((cellText, index) =>
      alignCell(cellText, widths[index] ?? stringWidth(cellText), token.align[index] ?? "left"),
    )
    .join(" | ");
  const separatorLine = widths.map((width) => "-".repeat(width)).join("-+-");
  const bodyLines = rowTexts.map((row) =>
    row
      .map((cellText, index) =>
        alignCell(cellText, widths[index] ?? stringWidth(cellText), token.align[index] ?? null),
      )
      .join(" | "),
  );

  return (
    <box
      key={key}
      width="100%"
      marginBottom={1}
      border
      borderColor={table.border}
      backgroundColor={table.background}
      paddingX={1}
    >
      <text selectable>
        <span fg={table.headerForeground}>{headerLine}</span>
        {"\n"}
        <span fg={table.separatorForeground}>{separatorLine}</span>
        {bodyLines.map((line) => (
          <Fragment key={`${key}-row-${line}`}>
            {"\n"}
            <span fg={table.rowForeground}>{line}</span>
          </Fragment>
        ))}
      </text>
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

  const label = getCodeBlockLabel(filetype);

  return (
    <box
      width="100%"
      flexDirection="column"
      border
      borderColor={theme.markdown.codeBlock.border}
      backgroundColor={theme.markdown.codeBlock.background}
    >
      <box
        backgroundColor={theme.markdown.codeBlock.headerBackground}
        paddingX={1}
        border={["bottom"]}
        borderColor={theme.markdown.codeBlock.border}
      >
        <text selectable>
          <span fg={theme.markdown.codeBlock.label}>[{label}]</span>
          <span fg={theme.markdown.codeBlock.language}> {filetype}</span>
        </text>
      </box>
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

      return (
        <box
          key={key}
          width="100%"
          marginBottom={1}
          paddingX={1}
          border={["bottom"]}
          borderColor={style.border}
          backgroundColor={style.background}
        >
          <text selectable>
            <span fg={style.foreground}>
              <strong>{`${style.icon} `}</strong>
            </span>
            <span fg={style.foreground}>
              <strong>{renderInlineTokens(theme, token.tokens ?? [], `${key}-heading`)}</strong>
            </span>
          </text>
        </box>
      );
    }
    case "hr": {
      return (
        <box key={key} width="100%" flexDirection="row" alignItems="center" gap={1} marginY={1}>
          <text selectable>
            <span fg={theme.markdown.horizontalRule.foreground}>
              {theme.markdown.horizontalRule.icon}
            </span>
          </text>
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
