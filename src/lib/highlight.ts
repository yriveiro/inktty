import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  getTreeSitterClient,
  infoStringToFiletype,
  RGBA,
  SyntaxStyle,
  type TreeSitterClient,
  treeSitterToTextChunks,
} from "@opentui/core";
import { defaultTheme, type InkTheme, type SyntaxPalette } from "./theme";

const require = createRequire(import.meta.url);
const bashHighlightQueryPath = require.resolve("tree-sitter-bash/queries/highlights.scm");
const bashParserWasmPath = require.resolve("tree-sitter-bash/tree-sitter-bash.wasm");
const yamlHighlightQueryPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-yaml/queries/highlights.scm",
);
const yamlParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-yaml/tree-sitter-yaml.wasm",
);
const jsonHighlightQueryPath = require.resolve("tree-sitter-json/queries/highlights.scm");
const jsonParserWasmPath = require.resolve("tree-sitter-json/tree-sitter-json.wasm");
const javaHighlightQueryPath = require.resolve("tree-sitter-java/queries/highlights.scm");
const javaParserWasmPath = require.resolve("tree-sitter-java/tree-sitter-java.wasm");
const regoHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-rego/highlights.scm", import.meta.url),
);
const regoParserWasmPath = fileURLToPath(
  new URL("./tree-sitter-rego/tree-sitter-rego.wasm", import.meta.url),
);
const customFiletypeParsers: Parameters<TreeSitterClient["addFiletypeParser"]>[0][] = [
  {
    filetype: "bash",
    aliases: ["shell", "sh", "zsh", "fish"],
    wasm: bashParserWasmPath,
    queries: {
      highlights: [bashHighlightQueryPath],
    },
  },
  {
    filetype: "yaml",
    aliases: ["yml"],
    wasm: yamlParserWasmPath,
    queries: {
      highlights: [yamlHighlightQueryPath],
    },
  },
  {
    filetype: "json",
    wasm: jsonParserWasmPath,
    queries: {
      highlights: [jsonHighlightQueryPath],
    },
  },
  {
    filetype: "java",
    wasm: javaParserWasmPath,
    queries: {
      highlights: [javaHighlightQueryPath],
    },
  },
  {
    filetype: "rego",
    wasm: regoParserWasmPath,
    queries: {
      highlights: [regoHighlightQueryPath],
    },
  },
];
const configuredHighlightClients = new WeakSet<TreeSitterClient>();

export interface HighlightChunk {
  text: string;
  fg?: RGBA;
  attributes: number;
}

function color(hex: string): RGBA {
  return RGBA.fromHex(hex);
}

const fenceLanguageAliases: Record<string, string> = {
  bash: "bash",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  fish: "bash",
  mermaid: "mermaid",
  yml: "yaml",
  yaml: "yaml",
  json: "json",
  java: "java",
  rego: "rego",
  js: "javascript",
  jsx: "javascriptreact",
  ts: "typescript",
  tsx: "typescriptreact",
  cplusplus: "cpp",
  "c++": "cpp",
};

function buildSyntaxStyle(palette: SyntaxPalette): SyntaxStyle {
  return SyntaxStyle.fromStyles({
    default: { fg: color(palette.default) },
    keyword: { fg: color(palette.keyword), bold: true },
    "keyword.function": { fg: color(palette.keyword), bold: true },
    "keyword.operator": { fg: color(palette.keyword), bold: true },
    string: { fg: color(palette.string) },
    "string.escape": { fg: color(palette.stringEscape) },
    "string.special": { fg: color(palette.string) },
    number: { fg: color(palette.number) },
    constant: { fg: color(palette.number) },
    "constant.builtin": { fg: color(palette.number) },
    comment: { fg: color(palette.comment), italic: true },
    function: { fg: color(palette.function) },
    "function.call": { fg: color(palette.function) },
    "function.method": { fg: color(palette.function) },
    "function.method.call": { fg: color(palette.function) },
    "function.builtin": { fg: color(palette.function) },
    type: { fg: color(palette.type) },
    "type.builtin": { fg: color(palette.type) },
    "type.definition": { fg: color(palette.type) },
    property: { fg: color(palette.property) },
    variable: { fg: color(palette.variable) },
    "variable.builtin": { fg: color(palette.variableBuiltin) },
    "variable.member": { fg: color(palette.variable) },
    "variable.parameter": { fg: color(palette.variable) },
    operator: { fg: color(palette.operator) },
    "operator.word": { fg: color(palette.operator) },
    punctuation: { fg: color(palette.punctuation) },
    "punctuation.bracket": { fg: color(palette.punctuation) },
    "punctuation.delimiter": { fg: color(palette.punctuation) },
    tag: { fg: color(palette.tag) },
    "tag.attribute": { fg: color(palette.tagAttribute) },
    "tag.delimiter": { fg: color(palette.tagDelimiter) },
  });
}

export function createSyntaxStyle(theme: InkTheme): SyntaxStyle {
  return buildSyntaxStyle(theme.syntax);
}

export const syntaxStyle = createSyntaxStyle(defaultTheme);

export function getHighlightingClient(): TreeSitterClient {
  const client = getTreeSitterClient();

  if (!configuredHighlightClients.has(client)) {
    for (const parser of customFiletypeParsers) {
      client.addFiletypeParser(parser);
    }

    configuredHighlightClients.add(client);
  }

  return client;
}

function normalizeShellPlaceholder(token: string): string {
  return `"${"_".repeat(token.length - 2)}"`;
}

function normalizeSourceForHighlighting(content: string, filetype: string): string {
  if (filetype !== "bash") {
    return content;
  }

  // Markdown docs often use angle-bracket placeholders like <path-to-file.md>.
  // Bash parses those as redirects, which can swallow following commands.
  return content.replace(/<[^<>\r\n]+>/g, normalizeShellPlaceholder);
}

export async function highlightCode(
  content: string,
  filetype: string,
  style: SyntaxStyle = syntaxStyle,
): Promise<HighlightChunk[]> {
  const client = getHighlightingClient();
  await client.initialize();

  const normalizedContent = normalizeSourceForHighlighting(content, filetype);
  const result = await client.highlightOnce(normalizedContent, filetype);

  if (!result.highlights?.length) {
    return [{ text: content, attributes: 0 }];
  }

  return treeSitterToTextChunks(content, result.highlights, style).map((chunk) => ({
    text: chunk.text,
    fg: chunk.fg,
    attributes: chunk.attributes ?? 0,
  }));
}

export function resolveFenceLanguage(infoString?: string): string {
  const trimmed = infoString?.trim();
  if (!trimmed) {
    return "text";
  }

  const token = trimmed.split(/\s+/, 1)[0]?.toLowerCase();
  if (!token) {
    return "text";
  }

  return (
    fenceLanguageAliases[token] ??
    infoStringToFiletype(trimmed) ??
    infoStringToFiletype(token) ??
    token
  );
}
