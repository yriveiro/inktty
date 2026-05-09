import { afterEach, describe, expect, test } from "bun:test";
import { App } from "../../src/App";
import { getEmbeddedThemes } from "../../src/lib/theme";
import { destroyTestSetup, pressKey, renderFrame, type TestSetup, testRender } from "../test-utils";

let testSetup: TestSetup | undefined;
const defaultThemes = getEmbeddedThemes();

async function givenInkttyIsRendering(content: string, width = 80, height = 24) {
  testSetup = await testRender(
    <App fileName="story.md" content={content} themes={defaultThemes} />,
    {
      width,
      height,
    },
  );

  return testSetup;
}

afterEach(async () => {
  if (testSetup) {
    await destroyTestSetup(testSetup);
    testSetup = undefined;
  }
});

describe("Package behavior", () => {
  describe("Scenario: toggling between parsed and raw views", () => {
    test("Given a markdown document, when Tab is pressed, then inktty shows the raw source view", async () => {
      const setup = await givenInkttyIsRendering("# Heading\n\n```ts\nconst x = 1\n```");

      const parsedFrame = await renderFrame(setup);
      expect(parsedFrame).toContain("const x = 1");
      expect(parsedFrame).not.toContain("```ts");

      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Heading");
      expect(frame).toContain("```ts");
      expect(frame).toContain("const x = 1");
    });
  });

  describe("Scenario: keeping the reader position while changing modes", () => {
    test("Given a long document, when the user scrolls and toggles modes, then the visible section stays stable", async () => {
      const content = Array.from({ length: 16 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      const setup = await givenInkttyIsRendering(content, 40, 6);

      await renderFrame(setup);
      await pressKey(setup, "j");
      await pressKey(setup, "j");
      await pressKey(setup, "j");

      const beforeToggle = await renderFrame(setup);
      expect(beforeToggle).toContain("Line 3");
      expect(beforeToggle).not.toContain("Line 1\n");

      await pressKey(setup, "tab", "\t");

      const afterToggle = await renderFrame(setup);
      expect(afterToggle).toContain("Line 3");
      expect(afterToggle).not.toContain("Line 1\n");
    });
  });

  describe("Scenario: enabling line numbers in raw code view", () => {
    test("Given the raw source view, when n is pressed, then each line is prefixed with a line number", async () => {
      const setup = await givenInkttyIsRendering("# Heading\n\nBody");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "n");

      const frame = await renderFrame(setup);
      expect(frame).toContain("1 | # Heading");
      expect(frame).toContain("3 | Body");
    });
  });

  describe("Scenario: switching between soft wrap and horizontal scrolling", () => {
    test("Given a long code line, when wrap is disabled, then h and l scroll horizontally instead of toggling line numbers", async () => {
      const setup = await givenInkttyIsRendering(
        "averylonglinewithoutspaces-1234567890-abcdefghij",
        90,
        12,
      );

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "w");
      await pressKey(setup, "/", "?");

      const beforeScroll = await renderFrame(setup);
      expect(beforeScroll).toContain("toggle wrap");
      expect(beforeScroll).toContain("horizontal scroll");

      await pressKey(setup, "escape", "\u001B");
      await pressKey(setup, "l");
      await pressKey(setup, "l");

      const afterScroll = await renderFrame(setup);
      expect(afterScroll).toContain("1234567890");
      expect(afterScroll).not.toContain("lines: on");
    });
  });

  describe("Scenario: rendering richer markdown affordances", () => {
    test("Given enhanced markdown blocks, when inktty renders the parsed view, then headings, tasks, callouts, tables, and links get terminal-specific chrome", async () => {
      const content = await Bun.file(
        new URL("../fixtures/rich-markdown.md", import.meta.url),
      ).text();
      const setup = await givenInkttyIsRendering(content, 90, 28);

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Release Notes");
      expect(frame).toContain("gh GitHub link");
      expect(frame).toContain("[ ]");
      expect(frame).toContain("[x]");
      expect(frame).toContain("[NOTE] Terminal rendering");
      expect(frame).toContain("┌───────────┐");
      expect(frame).toContain("│Name │Value│");
    });
  });

  describe("Scenario: rendering frontmatter in parsed view", () => {
    test("Given a document with leading yaml frontmatter, when inktty renders the parsed view, then the frontmatter is shown as yaml code instead of a markdown heading", async () => {
      const content = [
        "---",
        "description: Post-execution validation subagent.",
        "mode: subagent",
        "model: github-copilot/gpt-5.4",
        "temperature: 0.5",
        "permissions:",
        "  write: deny",
        "  edit: deny",
        "  bash: deny",
        "  skill: allow",
        "---",
      ].join("\n");
      const setup = await givenInkttyIsRendering(content, 90, 18);

      const frame = await renderFrame(setup);
      expect(frame).toContain(" yaml");
      expect(frame).toContain("description: Post-execution validation subagent.");
      expect(frame).toContain("mode: subagent");
      expect(frame).not.toContain("## description:");
    });
  });

  describe("Scenario: rendering documentation-oriented code fences", () => {
    test("Given markdown with c, cpp, csharp, css, hcl, html, javascript, kotlin, lua, php, ruby, scala, toml, tsx, python, go, rust, and zig fences, when inktty renders the parsed view, then the blocks are shown with language labels", async () => {
      const content = [
        "```c",
        "int main(void) {",
        "  return 0;",
        "}",
        "```",
        "",
        "```cpp",
        "#include <string>",
        "std::string greet() {",
        '  return "hi";',
        "}",
        "```",
        "",
        "```csharp",
        "public class Hello {",
        '    public string Greet() { return "hi"; }',
        "}",
        "```",
        "",
        "```css",
        ".hero { color: red; }",
        "```",
        "",
        "```hcl",
        'resource "aws_instance" "web" {}',
        "```",
        "",
        "```html",
        '<div class="hero">hi</div>',
        "```",
        "",
        "```javascript",
        'const answer = "hi";',
        "```",
        "",
        "```lua",
        "local function greet()",
        '  return "hi"',
        "end",
        "```",
        "",
        "```php",
        "<?php",
        "function greet(): string {",
        '    return "hi";',
        "}",
        "```",
        "",
        "```ruby",
        "def greet",
        '  "hi"',
        "end",
        "```",
        "",
        "```scala",
        "object Hello {",
        '  def greet(): String = "hi"',
        "}",
        "```",
        "",
        "```kotlin",
        "fun greet(name: String): String {",
        '    return "hi $name"',
        "}",
        "```",
        "",
        "```toml",
        'name = "inktty"',
        "```",
        "",
        "```tsx",
        'const view = <Card title="hi" />',
        "```",
        "",
        "```python",
        'print("hi")',
        "```",
        "",
        "```go",
        "package main",
        "",
        "func greet() string {",
        '    return "hi"',
        "}",
        "```",
        "",
        "```rust",
        "fn greet() -> &'static str {",
        '    "hi"',
        "}",
        "```",
        "",
        "```zig",
        'const std = @import("std");',
        "",
        "fn greet() []const u8 {",
        '    return "hi";',
        "}",
        "```",
      ].join("\n");
      const setup = await givenInkttyIsRendering(content, 90, 170);

      const frame = await renderFrame(setup);
      expect(frame).toContain(" c");
      expect(frame).toContain(" cpp");
      expect(frame).toContain("󰌛 csharp");
      expect(frame).toContain(" css");
      expect(frame).toContain("󱁢 hcl");
      expect(frame).toContain("󰌝 html");
      expect(frame).toContain("󰌞 javascript");
      expect(frame).toContain(" kotlin");
      expect(frame).toContain(" lua");
      expect(frame).toContain(" php");
      expect(frame).toContain(" ruby");
      expect(frame).toContain(" scala");
      expect(frame).toContain(" toml");
      expect(frame).toContain(" typescriptreact");
      expect(frame).toContain('name = "inktty"');
      expect(frame).toContain("󰌠 python");
      expect(frame).toContain('print("hi")');
      expect(frame).toContain(" go");
      expect(frame).toContain(" rust");
      expect(frame).toContain(" zig");
    });
  });
});
