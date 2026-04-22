import { describe, expect, test } from "bun:test";
import { type HighlightChunk, highlightCode, resolveFenceLanguage, syntaxStyle } from "./highlight";

describe("highlight", () => {
  test("resolves shell aliases to bash", () => {
    expect(resolveFenceLanguage("bash")).toBe("bash");
    expect(resolveFenceLanguage("sh")).toBe("bash");
    expect(resolveFenceLanguage("shell")).toBe("bash");
    expect(resolveFenceLanguage("zsh")).toBe("bash");
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
    const chunks = await highlightCode(
      "bun run src/index.tsx <path-to-file.md>\nbun run dev",
      "bash",
    );

    expect(
      chunks
        .find((chunk: HighlightChunk) => chunk.text === "bun")
        ?.fg?.toInts()
        .slice(0, 3),
    ).toEqual([224, 175, 104]);
    expect(chunks.some((chunk: HighlightChunk) => chunk.text.includes("bun run dev"))).toBe(false);
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
});
