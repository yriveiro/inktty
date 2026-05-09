import { describe, expect, test } from "bun:test";
import {
  type HighlightChunk,
  highlightCode,
  resolveFenceLanguage,
  syntaxStyle,
} from "../../src/lib/highlight";

describe("highlight", () => {
  test("resolves shell aliases to bash", () => {
    expect(resolveFenceLanguage("bash")).toBe("bash");
    expect(resolveFenceLanguage("sh")).toBe("bash");
    expect(resolveFenceLanguage("shell")).toBe("bash");
    expect(resolveFenceLanguage("zsh")).toBe("bash");
  });

  test("resolves python and toml fence languages", () => {
    expect(resolveFenceLanguage("py")).toBe("python");
    expect(resolveFenceLanguage("python")).toBe("python");
    expect(resolveFenceLanguage("toml")).toBe("toml");
  });

  test("resolves go and rust fence languages", () => {
    expect(resolveFenceLanguage("go")).toBe("go");
    expect(resolveFenceLanguage("golang")).toBe("go");
    expect(resolveFenceLanguage("rust")).toBe("rust");
    expect(resolveFenceLanguage("rs")).toBe("rust");
  });

  test("resolves c, lua, and zig fence languages", () => {
    expect(resolveFenceLanguage("c")).toBe("c");
    expect(resolveFenceLanguage("lua")).toBe("lua");
    expect(resolveFenceLanguage("zig")).toBe("zig");
  });

  test("resolves kotlin fence languages", () => {
    expect(resolveFenceLanguage("kotlin")).toBe("kotlin");
    expect(resolveFenceLanguage("kt")).toBe("kotlin");
    expect(resolveFenceLanguage("kts")).toBe("kotlin");
  });

  test("resolves javascript, typescript, and css fence languages", () => {
    expect(resolveFenceLanguage("js")).toBe("javascript");
    expect(resolveFenceLanguage("jsx")).toBe("javascriptreact");
    expect(resolveFenceLanguage("ts")).toBe("typescript");
    expect(resolveFenceLanguage("tsx")).toBe("typescriptreact");
    expect(resolveFenceLanguage("css")).toBe("css");
  });

  test("resolves csharp and cpp fence languages", () => {
    expect(resolveFenceLanguage("csharp")).toBe("csharp");
    expect(resolveFenceLanguage("cs")).toBe("csharp");
    expect(resolveFenceLanguage("c#")).toBe("csharp");
    expect(resolveFenceLanguage("cpp")).toBe("cpp");
    expect(resolveFenceLanguage("cplusplus")).toBe("cpp");
    expect(resolveFenceLanguage("c++")).toBe("cpp");
  });

  test("resolves php, ruby, and scala fence languages", () => {
    expect(resolveFenceLanguage("php")).toBe("php");
    expect(resolveFenceLanguage("ruby")).toBe("ruby");
    expect(resolveFenceLanguage("rb")).toBe("ruby");
    expect(resolveFenceLanguage("scala")).toBe("scala");
    expect(resolveFenceLanguage("sc")).toBe("scala");
  });

  test("resolves hcl and html fence languages", () => {
    expect(resolveFenceLanguage("hcl")).toBe("hcl");
    expect(resolveFenceLanguage("terraform")).toBe("hcl");
    expect(resolveFenceLanguage("tf")).toBe("hcl");
    expect(resolveFenceLanguage("tfvars")).toBe("hcl");
    expect(resolveFenceLanguage("html")).toBe("html");
  });

  test("covers concrete grammar scopes", () => {
    expect(syntaxStyle.getStyle("keyword.function")).toBeDefined();
    expect(syntaxStyle.getStyle("type.builtin")).toBeDefined();
    expect(syntaxStyle.getStyle("function.method.call")).toBeDefined();
    expect(syntaxStyle.getStyle("variable.builtin")).toBeDefined();
    expect(syntaxStyle.getStyle("punctuation.delimiter")).toBeDefined();
  });

  test("registers a bash parser for syntax highlighting", async () => {
    const styledText = await highlightCode('if true; then\necho "hi"\nfi', "bash");

    const keywordChunk = styledText.find((chunk: HighlightChunk) => chunk.text === "if");
    const stringChunk = styledText.find((chunk: HighlightChunk) => chunk.text === '"hi"');

    expect(keywordChunk?.fg?.toInts().slice(0, 3)).toEqual([122, 162, 247]);
    expect(stringChunk?.fg?.toInts().slice(0, 3)).toEqual([158, 206, 106]);
  });

  test("keeps later bash commands highlighted after markdown placeholders", async () => {
    const source = "bun run src/index.tsx <path-to-file.md>\nbun run dev";
    const chunks = await highlightCode(source, "bash");

    expect(
      chunks
        .find((chunk: HighlightChunk) => chunk.text === "bun")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([224, 175, 104]);
    expect(chunks.some((chunk: HighlightChunk) => chunk.text.includes("bun run dev"))).toBe(false);
    expect(chunks.map((chunk: HighlightChunk) => chunk.text).join("")).toBe(source);
  });

  test("keeps later bash commands highlighted after placeholders with spaces", async () => {
    const source = "bun run <path to file.md>\nbun run dev";
    const chunks = await highlightCode(source, "bash");

    const bunChunks = chunks.filter((chunk: HighlightChunk) => chunk.text === "bun");

    expect(bunChunks).toHaveLength(2);
    expect(bunChunks.at(-1)?.fg?.toInts().slice(0, 3)).toEqual([224, 175, 104]);
    expect(chunks.some((chunk: HighlightChunk) => chunk.text.includes("bun run dev"))).toBe(false);
    expect(chunks.map((chunk: HighlightChunk) => chunk.text).join("")).toBe(source);
  });

  test("keeps later bash commands highlighted after placeholders with mixed quotes", async () => {
    const source = 'bun run <path-with-"quote">\nbun run <path-with-"both\'quotes>\nbun run dev';
    const chunks = await highlightCode(source, "bash");

    const bunChunks = chunks.filter((chunk: HighlightChunk) => chunk.text === "bun");

    expect(bunChunks).toHaveLength(3);
    expect(bunChunks.at(-1)?.fg?.toInts().slice(0, 3)).toEqual([224, 175, 104]);
    expect(chunks.some((chunk: HighlightChunk) => chunk.text.includes("bun run dev"))).toBe(false);
    expect(chunks.map((chunk: HighlightChunk) => chunk.text).join("")).toBe(source);
  });

  test("resolves yaml, json, java, and rego fence languages", () => {
    expect(resolveFenceLanguage("yaml")).toBe("yaml");
    expect(resolveFenceLanguage("yml")).toBe("yaml");
    expect(resolveFenceLanguage("json")).toBe("json");
    expect(resolveFenceLanguage("java")).toBe("java");
    expect(resolveFenceLanguage("rego")).toBe("rego");
  });

  test("registers yaml, json, java, and rego parsers for syntax highlighting", async () => {
    const yamlChunks = await highlightCode("name: inktty", "yaml");
    const jsonChunks = await highlightCode('{"name": "inktty"}', "json");
    const javaChunks = await highlightCode(
      'class Hello {\n  String greet() {\n    return "hi";\n  }\n}',
      "java",
    );
    const regoChunks = await highlightCode(
      'package inktty\n\ndefault allow := false\n\nallow if input.user == "alice"',
      "rego",
    );

    expect(
      yamlChunks
        .find((chunk: HighlightChunk) => chunk.text === ":")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([169, 177, 214]);
    expect(
      jsonChunks
        .find((chunk: HighlightChunk) => chunk.text.includes('"inktty"'))
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      javaChunks
        .find((chunk: HighlightChunk) => chunk.text === "class")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      javaChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      regoChunks
        .find((chunk: HighlightChunk) => chunk.text === "default")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      regoChunks
        .find((chunk: HighlightChunk) => chunk.text === '"alice"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers toml and python parsers for syntax highlighting", async () => {
    const tomlChunks = await highlightCode('name = "inktty"', "toml");
    const pythonChunks = await highlightCode('def greet():\n    return "hi"', "python");

    expect(
      tomlChunks
        .find((chunk: HighlightChunk) => chunk.text.includes('"inktty"'))
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      pythonChunks
        .find((chunk: HighlightChunk) => chunk.text === "def")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      pythonChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers go and rust parsers for syntax highlighting", async () => {
    const goChunks = await highlightCode(
      'package main\n\nfunc greet() string {\n    return "hi"\n}',
      "go",
    );
    const rustChunks = await highlightCode('fn greet() -> &\'static str {\n    "hi"\n}', "rust");

    expect(
      goChunks
        .find((chunk: HighlightChunk) => chunk.text === "func")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      goChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      rustChunks
        .find((chunk: HighlightChunk) => chunk.text === "fn")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      rustChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers hcl and html parsers for syntax highlighting", async () => {
    const hclChunks = await highlightCode('resource "aws_instance" "web" {}', "hcl");
    const htmlChunks = await highlightCode('<div class="hero">hi</div>', "html");

    expect(
      hclChunks
        .find((chunk: HighlightChunk) => chunk.text === "aws_instance")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      htmlChunks
        .find((chunk: HighlightChunk) => chunk.text === "div")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      htmlChunks
        .find((chunk: HighlightChunk) => chunk.text === "hero")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers c, lua, and zig parsers for syntax highlighting", async () => {
    const cChunks = await highlightCode("int main(void) {\n  return 0;\n}", "c");
    const luaChunks = await highlightCode('local function greet()\n  return "hi"\nend', "lua");
    const zigChunks = await highlightCode(
      'const std = @import("std");\n\nfn greet() []const u8 {\n    return "hi";\n}',
      "zig",
    );

    expect(
      cChunks
        .find((chunk: HighlightChunk) => chunk.text === "return")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      cChunks
        .find((chunk: HighlightChunk) => chunk.text === "0")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([255, 158, 100]);
    expect(
      luaChunks
        .find((chunk: HighlightChunk) => chunk.text === "function")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      luaChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      zigChunks
        .find((chunk: HighlightChunk) => chunk.text === "fn")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      zigChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers a kotlin parser for syntax highlighting", async () => {
    const kotlinChunks = await highlightCode(
      'fun greet(name: String): String {\n    return "hi $name"\n}',
      "kotlin",
    );

    expect(
      kotlinChunks
        .find((chunk: HighlightChunk) => chunk.text === "fun")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      kotlinChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi $name"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers javascript, typescript, tsx, and css parsers for syntax highlighting", async () => {
    const javascriptChunks = await highlightCode('const answer = "hi";', "javascript");
    const typescriptChunks = await highlightCode('const answer: string = "hi";', "typescript");
    const tsxChunks = await highlightCode('const view = <Card title="hi" />;', "typescriptreact");
    const cssChunks = await highlightCode(".hero { color: red; }", "css");

    expect(
      javascriptChunks
        .find((chunk: HighlightChunk) => chunk.text === "const")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      javascriptChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      typescriptChunks
        .find((chunk: HighlightChunk) => chunk.text === "string")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([42, 195, 222]);
    expect(
      tsxChunks
        .find((chunk: HighlightChunk) => chunk.text === "const")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      cssChunks
        .find((chunk: HighlightChunk) => chunk.text === "color")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([192, 202, 245]);
  });

  test("registers csharp and cpp parsers for syntax highlighting", async () => {
    const csharpChunks = await highlightCode(
      'public class Hello {\n    public string Greet() {\n        return "hi";\n    }\n}',
      "csharp",
    );
    const cppChunks = await highlightCode(
      '#include <string>\nstd::string greet() {\n  return "hi";\n}',
      "cpp",
    );

    expect(
      csharpChunks
        .find((chunk: HighlightChunk) => chunk.text === "public")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      csharpChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      cppChunks
        .find((chunk: HighlightChunk) => chunk.text === "return")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      cppChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });

  test("registers php, ruby, and scala parsers for syntax highlighting", async () => {
    const phpChunks = await highlightCode(
      '<?php\nfunction greet(): string {\n    return "hi";\n}',
      "php",
    );
    const rubyChunks = await highlightCode('def greet\n  "hi"\nend', "ruby");
    const scalaChunks = await highlightCode(
      'object Hello {\n  def greet(): String = "hi"\n}',
      "scala",
    );

    expect(
      phpChunks
        .find((chunk: HighlightChunk) => chunk.text === "function")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      phpChunks
        .find((chunk: HighlightChunk) => chunk.text === "hi")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      rubyChunks
        .find((chunk: HighlightChunk) => chunk.text === "def")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      rubyChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
    expect(
      scalaChunks
        .find((chunk: HighlightChunk) => chunk.text === "object")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([122, 162, 247]);
    expect(
      scalaChunks
        .find((chunk: HighlightChunk) => chunk.text === '"hi"')
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([158, 206, 106]);
  });
});
