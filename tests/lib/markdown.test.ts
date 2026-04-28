import { describe, expect, test } from "bun:test";
import { extractFencedCodeBlocks, extractMermaidBlocks } from "../../src/lib/markdown";

describe("markdown utilities", () => {
  test("extracts fenced code blocks using the shared markdown lexer", () => {
    const source = [
      "Intro",
      "",
      "~~~ts",
      "const x = 1",
      "~~~",
      "",
      "```bash",
      "echo hi",
      "```",
    ].join("\n");

    expect(extractFencedCodeBlocks(source)).toEqual([
      {
        code: "const x = 1",
        infoString: "ts",
        startLine: 2,
      },
      {
        code: "echo hi",
        infoString: "bash",
        startLine: 6,
      },
    ]);
  });

  test("extracts mermaid blocks using the resolved fence language", () => {
    const source = [
      "```mermaid title=demo",
      "flowchart TD",
      "A-->B",
      "```",
      "",
      "```ts",
      "const x = 1",
      "```",
      "",
      "~~~mermaid",
      "sequenceDiagram",
      "Alice->>Bob: hi",
      "~~~",
    ].join("\n");

    expect(extractMermaidBlocks(source)).toEqual([
      {
        code: "flowchart TD\nA-->B",
        index: 0,
      },
      {
        code: "sequenceDiagram\nAlice->>Bob: hi",
        index: 1,
      },
    ]);
  });
});
