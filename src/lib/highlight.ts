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
const cHighlightQueryPath = require.resolve("tree-sitter-c/queries/highlights.scm");
const cParserWasmPath = require.resolve("tree-sitter-c/tree-sitter-c.wasm");
const cSharpHighlightQueryPath = require.resolve("tree-sitter-c-sharp/queries/highlights.scm");
const cSharpParserWasmPath = require.resolve("tree-sitter-c-sharp/tree-sitter-c_sharp.wasm");
const cppHighlightQueryPath = require.resolve("tree-sitter-cpp/queries/highlights.scm");
const cppParserWasmPath = require.resolve("tree-sitter-cpp/tree-sitter-cpp.wasm");
const cssHighlightQueryPath = require.resolve("tree-sitter-css/queries/highlights.scm");
const cssParserWasmPath = require.resolve("tree-sitter-css/tree-sitter-css.wasm");
const diffHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-diff/highlights.scm", import.meta.url),
);
const diffParserWasmPath = fileURLToPath(
  new URL("./tree-sitter-diff/tree-sitter-diff.wasm", import.meta.url),
);
const dockerfileHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-dockerfile/highlights.scm", import.meta.url),
);
const dockerfileParserWasmPath = fileURLToPath(
  new URL("./tree-sitter-dockerfile/tree-sitter-dockerfile.wasm", import.meta.url),
);
const yamlHighlightQueryPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-yaml/queries/highlights.scm",
);
const yamlParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-yaml/tree-sitter-yaml.wasm",
);
const hclHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-hcl/highlights.scm", import.meta.url),
);
const hclParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-hcl/tree-sitter-hcl.wasm",
);
const tomlHighlightQueryPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-toml/queries/highlights.scm",
);
const tomlParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-toml/tree-sitter-toml.wasm",
);
const htmlHighlightQueryPath = require.resolve("tree-sitter-html/queries/highlights.scm");
const htmlParserWasmPath = require.resolve("tree-sitter-html/tree-sitter-html.wasm");
const jsonHighlightQueryPath = require.resolve("tree-sitter-json/queries/highlights.scm");
const jsonParserWasmPath = require.resolve("tree-sitter-json/tree-sitter-json.wasm");
const goHighlightQueryPath = require.resolve("tree-sitter-go/queries/highlights.scm");
const goParserWasmPath = require.resolve("tree-sitter-go/tree-sitter-go.wasm");
const javascriptHighlightQueryPath = require.resolve(
  "tree-sitter-javascript/queries/highlights.scm",
);
const javascriptJsxHighlightQueryPath = require.resolve(
  "tree-sitter-javascript/queries/highlights-jsx.scm",
);
const javascriptParserWasmPath = require.resolve(
  "tree-sitter-javascript/tree-sitter-javascript.wasm",
);
const kotlinHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-kotlin/highlights.scm", import.meta.url),
);
const kotlinParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm",
);
const javaHighlightQueryPath = require.resolve("tree-sitter-java/queries/highlights.scm");
const javaParserWasmPath = require.resolve("tree-sitter-java/tree-sitter-java.wasm");
const luaHighlightQueryPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-lua/queries/highlights.scm",
);
const luaParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-lua/tree-sitter-lua.wasm",
);
const phpHighlightQueryPath = require.resolve("tree-sitter-php/queries/highlights.scm");
const phpParserWasmPath = require.resolve("tree-sitter-php/tree-sitter-php.wasm");
const pythonHighlightQueryPath = require.resolve("tree-sitter-python/queries/highlights.scm");
const pythonParserWasmPath = require.resolve("tree-sitter-python/tree-sitter-python.wasm");
const rubyHighlightQueryPath = require.resolve("tree-sitter-ruby/queries/highlights.scm");
const rubyParserWasmPath = require.resolve("tree-sitter-ruby/tree-sitter-ruby.wasm");
const rustHighlightQueryPath = require.resolve("tree-sitter-rust/queries/highlights.scm");
const rustParserWasmPath = require.resolve("tree-sitter-rust/tree-sitter-rust.wasm");
const scalaHighlightQueryPath = require.resolve("tree-sitter-scala/queries/highlights.scm");
const scalaParserWasmPath = require.resolve("tree-sitter-scala/tree-sitter-scala.wasm");
const sqlHighlightQueryPath = fileURLToPath(
  new URL("./tree-sitter-sql/highlights.scm", import.meta.url),
);
const sqlParserWasmPath = fileURLToPath(
  new URL("./tree-sitter-sql/tree-sitter-sql.wasm", import.meta.url),
);
const typescriptHighlightQueryPath = require.resolve(
  "tree-sitter-typescript/queries/highlights.scm",
);
const typescriptParserWasmPath = require.resolve(
  "tree-sitter-typescript/tree-sitter-typescript.wasm",
);
const typescriptReactParserWasmPath = require.resolve(
  "tree-sitter-typescript/tree-sitter-tsx.wasm",
);
const zigHighlightQueryPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-zig/queries/highlights.scm",
);
const zigParserWasmPath = require.resolve(
  "@tree-sitter-grammars/tree-sitter-zig/tree-sitter-zig.wasm",
);
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
    filetype: "c",
    wasm: cParserWasmPath,
    queries: {
      highlights: [cHighlightQueryPath],
    },
  },
  {
    filetype: "csharp",
    aliases: ["cs", "c#"],
    wasm: cSharpParserWasmPath,
    queries: {
      highlights: [cSharpHighlightQueryPath],
    },
  },
  {
    filetype: "cpp",
    aliases: ["cplusplus", "c++"],
    wasm: cppParserWasmPath,
    queries: {
      highlights: [cHighlightQueryPath, cppHighlightQueryPath],
    },
  },
  {
    filetype: "css",
    wasm: cssParserWasmPath,
    queries: {
      highlights: [cssHighlightQueryPath],
    },
  },
  {
    filetype: "diff",
    wasm: diffParserWasmPath,
    queries: {
      highlights: [diffHighlightQueryPath],
    },
  },
  {
    filetype: "dockerfile",
    aliases: ["docker"],
    wasm: dockerfileParserWasmPath,
    queries: {
      highlights: [dockerfileHighlightQueryPath],
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
    filetype: "hcl",
    aliases: ["terraform", "tf", "tfvars"],
    wasm: hclParserWasmPath,
    queries: {
      highlights: [hclHighlightQueryPath],
    },
  },
  {
    filetype: "toml",
    wasm: tomlParserWasmPath,
    queries: {
      highlights: [tomlHighlightQueryPath],
    },
  },
  {
    filetype: "html",
    wasm: htmlParserWasmPath,
    queries: {
      highlights: [htmlHighlightQueryPath],
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
    filetype: "go",
    aliases: ["golang"],
    wasm: goParserWasmPath,
    queries: {
      highlights: [goHighlightQueryPath],
    },
  },
  {
    filetype: "javascript",
    aliases: ["js"],
    wasm: javascriptParserWasmPath,
    queries: {
      highlights: [javascriptHighlightQueryPath],
    },
  },
  {
    filetype: "javascriptreact",
    aliases: ["jsx"],
    wasm: javascriptParserWasmPath,
    queries: {
      highlights: [javascriptJsxHighlightQueryPath, javascriptHighlightQueryPath],
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
    filetype: "kotlin",
    aliases: ["kt", "kts"],
    wasm: kotlinParserWasmPath,
    queries: {
      highlights: [kotlinHighlightQueryPath],
    },
  },
  {
    filetype: "lua",
    wasm: luaParserWasmPath,
    queries: {
      highlights: [luaHighlightQueryPath],
    },
  },
  {
    filetype: "php",
    wasm: phpParserWasmPath,
    queries: {
      highlights: [phpHighlightQueryPath],
    },
  },
  {
    filetype: "python",
    aliases: ["py"],
    wasm: pythonParserWasmPath,
    queries: {
      highlights: [pythonHighlightQueryPath],
    },
  },
  {
    filetype: "ruby",
    aliases: ["rb"],
    wasm: rubyParserWasmPath,
    queries: {
      highlights: [rubyHighlightQueryPath],
    },
  },
  {
    filetype: "rust",
    aliases: ["rs"],
    wasm: rustParserWasmPath,
    queries: {
      highlights: [rustHighlightQueryPath],
    },
  },
  {
    filetype: "scala",
    aliases: ["sc"],
    wasm: scalaParserWasmPath,
    queries: {
      highlights: [scalaHighlightQueryPath],
    },
  },
  {
    filetype: "sql",
    wasm: sqlParserWasmPath,
    queries: {
      highlights: [sqlHighlightQueryPath],
    },
  },
  {
    filetype: "typescript",
    aliases: ["ts"],
    wasm: typescriptParserWasmPath,
    queries: {
      highlights: [typescriptHighlightQueryPath, javascriptHighlightQueryPath],
    },
  },
  {
    filetype: "typescriptreact",
    aliases: ["tsx"],
    wasm: typescriptReactParserWasmPath,
    queries: {
      highlights: [
        typescriptHighlightQueryPath,
        javascriptJsxHighlightQueryPath,
        javascriptHighlightQueryPath,
      ],
    },
  },
  {
    filetype: "zig",
    wasm: zigParserWasmPath,
    queries: {
      highlights: [zigHighlightQueryPath],
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
  c: "c",
  "c#": "csharp",
  csharp: "csharp",
  cs: "csharp",
  cpp: "cpp",
  css: "css",
  diff: "diff",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  fish: "bash",
  mermaid: "mermaid",
  go: "go",
  golang: "go",
  hcl: "hcl",
  html: "html",
  kt: "kotlin",
  kts: "kotlin",
  kotlin: "kotlin",
  php: "php",
  py: "python",
  python: "python",
  rb: "ruby",
  ruby: "ruby",
  lua: "lua",
  rs: "rust",
  rust: "rust",
  scala: "scala",
  sc: "scala",
  sql: "sql",
  terraform: "hcl",
  tf: "hcl",
  tfvars: "hcl",
  toml: "toml",
  yml: "yaml",
  yaml: "yaml",
  json: "json",
  java: "java",
  rego: "rego",
  zig: "zig",
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
    attribute: { fg: color(palette.property) },
    "attribute.builtin": { fg: color(palette.property) },
    boolean: { fg: color(palette.number) },
    conditional: { fg: color(palette.keyword), bold: true },
    character: { fg: color(palette.string) },
    "character.special": { fg: color(palette.stringEscape) },
    "diff.delta": { fg: color(palette.keyword), bold: true },
    "diff.minus": { fg: color(palette.number) },
    "diff.plus": { fg: color(palette.string) },
    keyword: { fg: color(palette.keyword), bold: true },
    "keyword.conditional": { fg: color(palette.keyword), bold: true },
    "keyword.coroutine": { fg: color(palette.keyword), bold: true },
    "keyword.directive": { fg: color(palette.keyword), bold: true },
    "keyword.directive.define": { fg: color(palette.keyword), bold: true },
    "keyword.exception": { fg: color(palette.keyword), bold: true },
    "keyword.function": { fg: color(palette.keyword), bold: true },
    "keyword.import": { fg: color(palette.keyword), bold: true },
    "keyword.modifier": { fg: color(palette.keyword), bold: true },
    "keyword.operator": { fg: color(palette.keyword), bold: true },
    "keyword.repeat": { fg: color(palette.keyword), bold: true },
    "keyword.return": { fg: color(palette.keyword), bold: true },
    "keyword.type": { fg: color(palette.keyword), bold: true },
    constructor: { fg: color(palette.function) },
    label: { fg: color(palette.type) },
    module: { fg: color(palette.type) },
    "module.builtin": { fg: color(palette.type) },
    string: { fg: color(palette.string) },
    "string.documentation": { fg: color(palette.string) },
    "string.escape": { fg: color(palette.stringEscape) },
    "string.regexp": { fg: color(palette.string) },
    "string.special": { fg: color(palette.string) },
    "string.special.path": { fg: color(palette.string) },
    "string.special.symbol": { fg: color(palette.string) },
    "string.special.url": { fg: color(palette.string) },
    number: { fg: color(palette.number) },
    "number.float": { fg: color(palette.number) },
    constant: { fg: color(palette.number) },
    "constant.builtin": { fg: color(palette.number) },
    "constant.macro": { fg: color(palette.number) },
    comment: { fg: color(palette.comment), italic: true },
    "comment.documentation": { fg: color(palette.comment), italic: true },
    "comment.error": { fg: color(palette.comment), italic: true },
    "comment.note": { fg: color(palette.comment), italic: true },
    "comment.todo": { fg: color(palette.comment), italic: true },
    "comment.warning": { fg: color(palette.comment), italic: true },
    function: { fg: color(palette.function) },
    "function.call": { fg: color(palette.function) },
    "function.macro": { fg: color(palette.function) },
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
    "punctuation.special": { fg: color(palette.punctuation) },
    tag: { fg: color(palette.tag) },
    "tag.builtin": { fg: color(palette.tag) },
    "tag.attribute": { fg: color(palette.tagAttribute) },
    "tag.delimiter": { fg: color(palette.tagDelimiter) },
  });
}

export function createSyntaxStyle(theme: InkTheme): SyntaxStyle {
  return buildSyntaxStyle(theme.syntax);
}

export const syntaxStyle = createSyntaxStyle(defaultTheme);

function getHighlightingClient(): TreeSitterClient {
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
