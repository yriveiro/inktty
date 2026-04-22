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

export const syntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: color("#c0caf5") },
  keyword: { fg: color("#7aa2f7"), bold: true },
  "keyword.function": { fg: color("#7aa2f7"), bold: true },
  "keyword.operator": { fg: color("#7aa2f7"), bold: true },
  string: { fg: color("#9ece6a") },
  "string.escape": { fg: color("#bb9af7") },
  "string.special": { fg: color("#9ece6a") },
  number: { fg: color("#ff9e64") },
  constant: { fg: color("#ff9e64") },
  "constant.builtin": { fg: color("#ff9e64") },
  comment: { fg: color("#565f89"), italic: true },
  function: { fg: color("#e0af68") },
  "function.call": { fg: color("#e0af68") },
  "function.method": { fg: color("#e0af68") },
  "function.method.call": { fg: color("#e0af68") },
  "function.builtin": { fg: color("#e0af68") },
  type: { fg: color("#2ac3de") },
  "type.builtin": { fg: color("#2ac3de") },
  "type.definition": { fg: color("#2ac3de") },
  property: { fg: color("#c0caf5") },
  variable: { fg: color("#c0caf5") },
  "variable.builtin": { fg: color("#2ac3de") },
  "variable.member": { fg: color("#c0caf5") },
  "variable.parameter": { fg: color("#c0caf5") },
  operator: { fg: color("#bb9af7") },
  "operator.word": { fg: color("#bb9af7") },
  punctuation: { fg: color("#a9b1d6") },
  "punctuation.bracket": { fg: color("#a9b1d6") },
  "punctuation.delimiter": { fg: color("#a9b1d6") },
  tag: { fg: color("#7aa2f7") },
  "tag.attribute": { fg: color("#e0af68") },
  "tag.delimiter": { fg: color("#a9b1d6") },
});

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
  const value = token.slice(1, -1);

  if (value.includes('"') && value.includes("'")) {
    return token;
  }

  const quote = value.includes('"') ? "'" : '"';
  return `${quote}${value}${quote}`;
}

function normalizeSourceForHighlighting(content: string, filetype: string): string {
  if (filetype !== "bash") {
    return content;
  }

  // Markdown docs often use angle-bracket placeholders like <path-to-file.md>.
  // Bash parses those as redirects, which can swallow following commands.
  return content.replace(/<[^\s<>]+>/g, normalizeShellPlaceholder);
}

export async function highlightCode(content: string, filetype: string): Promise<HighlightChunk[]> {
  const client = getHighlightingClient();
  await client.initialize();

  const normalizedContent = normalizeSourceForHighlighting(content, filetype);
  const result = await client.highlightOnce(normalizedContent, filetype);

  if (!result.highlights?.length) {
    return [{ text: content, attributes: 0 }];
  }

  return treeSitterToTextChunks(content, result.highlights, syntaxStyle).map((chunk) => ({
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
