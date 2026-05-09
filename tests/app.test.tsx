import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { App } from "../src/App";
import { exportMermaidPng, hasMermaidCli } from "../src/lib/mermaid";
import { getEmbeddedThemes, type InkTheme } from "../src/lib/theme";
import {
  destroyTestSetup,
  emitSelection,
  findSpanByText,
  findSpanContainingText,
  findSpanOnLine,
  findSpansByText,
  getScrollbox,
  pause,
  pressKey,
  renderFrame,
  rgb,
  selectionWithText,
  type TestSetup,
  testRender,
} from "./test-utils";

let testSetup: TestSetup | undefined;
const defaultThemes = getEmbeddedThemes();

function createThemes(...themeNames: string[]): InkTheme[] {
  return themeNames.map((themeName) => {
    const theme = defaultThemes.find((candidate) => candidate.name === themeName);

    if (!theme) {
      throw new Error(`Missing test theme: ${themeName}`);
    }

    return theme;
  });
}

async function renderApp(
  content: string,
  fileName = "test.md",
  width = 80,
  height = 24,
  options: { themes?: InkTheme[]; initialThemeName?: string } = {},
) {
  testSetup = await testRender(
    <App
      fileName={fileName}
      content={content}
      themes={options.themes ?? defaultThemes}
      initialThemeName={options.initialThemeName}
    />,
    {
      width,
      height,
    },
  );

  return testSetup;
}

async function fixture(name: string): Promise<string> {
  return Bun.file(new URL(`./fixtures/${name}`, import.meta.url)).text();
}

afterEach(async () => {
  if (testSetup) {
    await destroyTestSetup(testSetup);
    testSetup = undefined;
  }

  mock.restore();
});

describe("App", () => {
  describe("mermaid png export", () => {
    test("exports mermaid diagrams to a png file url", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const url = await exportMermaidPng("flowchart TD\nA[Start]-->B[Done]\n");

      expect(url).toMatch(/^file:\/\/.+\.png$/);
      expect(await Bun.file(new URL(url)).arrayBuffer()).not.toHaveLength(0);
      const svgPath = new URL(`${url}.svg`);

      expect(await Bun.file(svgPath).exists()).toBe(false);
    });
  });

  describe("footer chrome", () => {
    test("displays the filename", async () => {
      const setup = await renderApp("# Hello", "README.md");

      expect(await renderFrame(setup)).toContain("README.md");
      expect(await renderFrame(setup)).toContain("Inktty | README.md | tokyo-night");
    });

    test("shows the current mode in the footer", async () => {
      const setup = await renderApp("# Hello");
      const frame = await renderFrame(setup);

      expect(frame).toContain("view y:1");
      expect(frame).not.toContain("view code");
    });

    test("keeps controls inside the help drawer", async () => {
      const setup = await renderApp("# Hello");
      const frame = await renderFrame(setup);

      expect(frame).not.toContain("tab: mode");
      expect(frame).not.toContain("j/k: scroll");
      expect(frame).not.toContain("q: quit");
      expect(frame).not.toContain("t/T: theme");
      expect(frame).not.toContain("h/l: pan");
      expect(frame).not.toContain("w: wrap");
      expect(frame).not.toContain("n: lines");
    });

    test("shows status information in the bottom bar", async () => {
      const setup = await renderApp("# Hello", "README.md");
      const frame = await renderFrame(setup);

      expect(frame).toContain("Inktty | README.md | tokyo-night | view y:1");
      expect(frame).toContain("100% | ? Help");
    });

    test("hides theme cycling hint when only one theme is available", async () => {
      const setup = await renderApp("# Hello", "README.md", 80, 24, {
        themes: createThemes("tokyo-night"),
      });

      await renderFrame(setup);
      await pressKey(setup, "/", "?");

      const frame = await renderFrame(setup);

      expect(frame).toContain("Inktty | README.md | tokyo-night");
      expect(frame).not.toContain("t/T");
    });

    test("expands help when ? is pressed and closes it with escape", async () => {
      const setup = await renderApp("# Hello", "README.md", 90, 16);

      await renderFrame(setup);
      await pressKey(setup, "/", "?");

      let frame = await renderFrame(setup);
      expect(frame).toContain("k/up");
      expect(frame).toContain("up");
      expect(frame).toContain("tab");
      expect(frame).toContain("toggle view/code");
      expect(frame).toContain("esc");
      expect(frame).toContain("close help");
      expect(frame).toContain("prev/next diagram");
      expect(frame).toContain("open diagram rendered");
      expect(frame).toContain("README.md");
      expect(frame).toContain("tokyo-night");
      expect(frame).toContain("view y:1");
      expect(frame).toContain("? Help");

      await pressKey(setup, "escape", "\u001B");
      frame = await renderFrame(setup);
      expect(frame).not.toContain("go to top");
    });
  });

  describe("view mode", () => {
    test("renders markdown content from fixtures", async () => {
      const setup = await renderApp(await fixture("basic.md"));
      const frame = await renderFrame(setup);

      expect(frame).toContain("Hello");
      expect(frame).toContain("This is bold text.");
    });

    test("renders leading frontmatter as a yaml code block instead of a heading", async () => {
      const setup = await renderApp(
        [
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
        ].join("\n"),
      );
      const frame = await renderFrame(setup);

      expect(frame).toContain(" yaml");
      expect(frame).toContain("description: Post-execution validation subagent.");
      expect(frame).toContain("mode: subagent");
      expect(frame).not.toContain("## description:");
    });

    test("renders horizontal rules", async () => {
      const content = ["before", "", "---", "", "after"].join("\n");
      const setup = await renderApp(content);
      const frame = await renderFrame(setup);

      expect(frame).toContain("before");
      expect(frame).toContain("after");
      expect(frame).toMatch(/─{5,}/);
    });

    test("uses fence language aliases for code block highlighting", async () => {
      const setup = await renderApp("```ts\nconst x = 1\n```");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanContainingText(setup, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanContainingText(setup, "1"))).toEqual([255, 158, 100]);
    });

    test("highlights javascript fenced code blocks", async () => {
      const setup = await renderApp('```javascript\nconst answer = "hi";\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰌞 javascript");
      expect(rgb(findSpanOnLine(setup, /const answer = "hi";/, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /const answer = "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights csharp fenced code blocks", async () => {
      const setup = await renderApp(
        '```csharp\npublic class Hello {\n    public string Greet() {\n        return "hi";\n    }\n}\n```',
      );

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰌛 csharp");
      expect(rgb(findSpanOnLine(setup, /public class Hello/, "public"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights cpp fenced code blocks", async () => {
      const setup = await renderApp(
        '```cpp\n#include <string>\nstd::string greet() {\n  return "hi";\n}\n```',
      );

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" cpp");
      expect(rgb(findSpanOnLine(setup, /return "hi";/, "return"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights php fenced code blocks", async () => {
      const setup = await renderApp(
        '```php\n<?php\nfunction greet(): string {\n    return "hi";\n}\n```',
      );

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" php");
      expect(rgb(findSpanOnLine(setup, /function greet\(\): string \{/, "function"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights ruby fenced code blocks", async () => {
      const setup = await renderApp('```ruby\ndef greet\n  "hi"\nend\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" ruby");
      expect(rgb(findSpanOnLine(setup, /def greet/, "def"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /"hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights scala fenced code blocks", async () => {
      const setup = await renderApp(
        '```scala\nobject Hello {\n  def greet(): String = "hi"\n}\n```',
      );

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" scala");
      expect(rgb(findSpanOnLine(setup, /object Hello \{/, "object"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /def greet\(\): String = "hi"/, '"hi"'))).toEqual([
        158, 206, 106,
      ]);
    });

    test("highlights jsx fenced code blocks", async () => {
      const setup = await renderApp('```jsx\nconst view = <Card title="hi" />;\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" javascriptreact");
      expect(rgb(findSpanOnLine(setup, /const view = <Card title="hi" \/>;/, "const"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /const view = <Card title="hi" \/>;/, '"hi"'))).toEqual([
        158, 206, 106,
      ]);
    });

    test("highlights css fenced code blocks", async () => {
      const setup = await renderApp("```css\n.hero { color: red; }\n```");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" css");
      expect(rgb(findSpanOnLine(setup, /\.hero \{ color: red; \}/, ".hero { color"))).toEqual([
        192, 202, 245,
      ]);
      expect(rgb(findSpanOnLine(setup, /\.hero \{ color: red; \}/, ":"))).toEqual([169, 177, 214]);
    });

    test("highlights tilde fenced code blocks in view mode", async () => {
      const setup = await renderApp("~~~ts\nconst x = 1\n~~~");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanContainingText(setup, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanContainingText(setup, "1"))).toEqual([255, 158, 100]);
    });

    test("highlights bash fenced code blocks", async () => {
      const setup = await renderApp(await fixture("bash-sample.md"));

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" bash");
      expect(rgb(findSpanOnLine(setup, /if true; then/, "if"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /echo "hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights yaml fenced code blocks", async () => {
      const setup = await renderApp("```yaml\nname: sample-app\n```");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" yaml");
      expect(rgb(findSpanOnLine(setup, /name: sample-app/, ":"))).toEqual([169, 177, 214]);
      expect(rgb(findSpanOnLine(setup, /name: sample-app/, "sample-app"))).toEqual([158, 206, 106]);
    });

    test("highlights json fenced code blocks", async () => {
      const setup = await renderApp('```json\n{"name": "inktty"}\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰘦 json");
      expect(rgb(findSpanOnLine(setup, /inktty/, '"inktty"'))).toEqual([158, 206, 106]);
    });

    test("highlights java fenced code blocks", async () => {
      const content = '```java\nclass Hello {\n  String greet() {\n    return "hi";\n  }\n}\n```';
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰬷 java");
      expect(rgb(findSpanOnLine(setup, /class Hello/, "class"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights rego fenced code blocks", async () => {
      const setup = await renderApp(await fixture("rego-sample.md"));

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰫿 rego");
      expect(rgb(findSpanOnLine(setup, /default allow := false/, "default"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /allow if input.user == "alice"/, '"alice"'))).toEqual([
        158, 206, 106,
      ]);
    });

    test("highlights toml fenced code blocks", async () => {
      const setup = await renderApp('```toml\nname = "inktty"\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" toml");
      expect(rgb(findSpanOnLine(setup, /name = "inktty"/, '"inktty"'))).toEqual([158, 206, 106]);
    });

    test("highlights hcl fenced code blocks", async () => {
      const setup = await renderApp('```hcl\nresource "aws_instance" "web" {}\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󱁢 hcl");
      expect(
        rgb(findSpanOnLine(setup, /resource "aws_instance" "web" \{\}/, '"aws_instance"')),
      ).toEqual([158, 206, 106]);
    });

    test("highlights html fenced code blocks", async () => {
      const setup = await renderApp('```html\n<div class="hero">hi</div>\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰌝 html");
      expect(rgb(findSpanOnLine(setup, /<div class="hero">hi<\/div>/, "div"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /<div class="hero">hi<\/div>/, "hero"))).toEqual([
        158, 206, 106,
      ]);
    });

    test("highlights go fenced code blocks", async () => {
      const content = '```go\npackage main\n\nfunc greet() string {\n    return "hi"\n}\n```';
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" go");
      expect(rgb(findSpanOnLine(setup, /func greet\(\) string/, "func"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return "hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights c fenced code blocks", async () => {
      const setup = await renderApp("```c\nint main(void) {\n  return 0;\n}\n```");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" c");
      expect(rgb(findSpanOnLine(setup, /return 0;/, "return"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return 0;/, "0"))).toEqual([255, 158, 100]);
    });

    test("highlights lua fenced code blocks", async () => {
      const setup = await renderApp('```lua\nlocal function greet()\n  return "hi"\nend\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" lua");
      expect(rgb(findSpanOnLine(setup, /local function greet\(\)/, "function"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /return "hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights kotlin fenced code blocks", async () => {
      const setup = await renderApp(
        '```kotlin\nfun greet(name: String): String {\n    return "hi $name"\n}\n```',
      );

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" kotlin");
      expect(rgb(findSpanOnLine(setup, /fun greet\(name: String\): String \{/, "fun"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /return "hi \$name"/, '"hi $name"'))).toEqual([
        158, 206, 106,
      ]);
    });

    test("highlights tsx fenced code blocks", async () => {
      const setup = await renderApp('```tsx\nconst view = <Card title="hi" />\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" typescriptreact");
      expect(rgb(findSpanOnLine(setup, /const view = <Card title="hi" \/>/, "const"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /const view = <Card title="hi" \/>/, '"hi"'))).toEqual([
        158, 206, 106,
      ]);
    });

    test("renders nerd font icons for python fenced code blocks", async () => {
      const setup = await renderApp('```python\nprint("hi")\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain("󰌠 python");
      expect(rgb(findSpanOnLine(setup, /print\("hi"\)/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights rust fenced code blocks", async () => {
      const setup = await renderApp('```rust\nfn greet() -> &\'static str {\n    "hi"\n}\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" rust");
      expect(rgb(findSpanOnLine(setup, /fn greet\(\)/, "fn"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /"hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights zig fenced code blocks", async () => {
      const content =
        '```zig\nconst std = @import("std");\n\nfn greet() []const u8 {\n    return "hi";\n}\n```';
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(await renderFrame(setup)).toContain(" zig");
      expect(rgb(findSpanOnLine(setup, /fn greet\(\) \[\]const u8 \{/, "fn"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("renders mermaid fenced code blocks as glyph diagrams", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp("```mermaid\nflowchart TD\nA[Start]-->B[Done]\n```");
      const frame = await renderFrame(setup);

      expect(frame).toContain("󰫺 mermaid");
      expect(frame).toContain("");
      expect(frame).toContain("Start");
      expect(frame).toContain("Done");
      expect(frame).toContain("▼");
      expect(frame).toContain("┌");
      expect(frame).toMatch(/󰫺 mermaid\s+/);
    });

    test("keeps the mermaid png action available after toggling code and view modes", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp(
        "```mermaid\nflowchart TD\nA[Start]-->B[Done]\n```",
        "toggle.md",
        80,
        24,
      );
      const openSpy = spyOn(Bun, "spawn");
      let frame = await renderFrame(setup);

      await pressKey(setup, "tab", "\t");
      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      frame = await renderFrame(setup);

      expect(frame).toContain("");

      await pressKey(setup, "v");

      for (let i = 0; i < 20 && openSpy.mock.calls.length === 0; i += 1) {
        await pause(50);
      }

      expect(openSpy).toHaveBeenCalledWith(
        ["open", expect.stringMatching(/diagram-.+\.png$/)],
        expect.objectContaining({ stderr: "ignore", stdout: "ignore" }),
      );
    });

    test("navigates to the next visible mermaid png entry with .", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const content = [
        "```mermaid",
        "flowchart TD",
        "A[One]-->B[Two]",
        "```",
        "",
        "padding 1",
        "",
        "padding 2",
        "",
        "padding 3",
        "",
        "```mermaid",
        "flowchart TD",
        "C[Three]-->D[Four]",
        "```",
      ].join("\n");
      const setup = await renderApp(content, "multi-mermaid.md", 80, 12);

      let frame = await renderFrame(setup);
      expect(frame).toMatch(/󰫺 mermaid\s+/);
      const initialScrollTop = getScrollbox(setup)?.scrollTop ?? 0;

      await pressKey(setup, ".", ".");
      frame = await renderFrame(setup);

      expect(frame).toContain(" view");
      expect(frame).toContain("padding 3");
      expect(getScrollbox(setup)?.scrollTop).toBeGreaterThan(initialScrollTop);
      expect(frame).toContain("Inktty | multi-mermaid.md | tokyo-night | view y:");
    });

    test("navigates back to the previous mermaid png entry with ,", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const content = [
        "```mermaid",
        "flowchart TD",
        "A[One]-->B[Two]",
        "```",
        "",
        "padding 1",
        "",
        "padding 2",
        "",
        "padding 3",
        "",
        "```mermaid",
        "flowchart TD",
        "C[Three]-->D[Four]",
        "```",
      ].join("\n");
      const setup = await renderApp(content, "multi-mermaid.md", 80, 12);

      await renderFrame(setup);
      await pressKey(setup, ".", ".");
      await renderFrame(setup);
      await pressKey(setup, ",", ",");

      const frame = await renderFrame(setup);

      expect(frame).toContain("One");
      expect(frame).toContain("Two");
      expect(frame).not.toContain("Three");
    });

    test("opens the selected mermaid png entry with v", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const content = [
        "```mermaid",
        "flowchart TD",
        "A[One]-->B[Two]",
        "```",
        "",
        "padding 1",
        "",
        "padding 2",
        "",
        "padding 3",
        "",
        "```mermaid",
        "flowchart TD",
        "C[Three]-->D[Four]",
        "```",
      ].join("\n");
      const setup = await renderApp(content, "multi-mermaid.md", 80, 12);
      const openSpy = spyOn(Bun, "spawn");

      await renderFrame(setup);
      await pressKey(setup, ".", ".");
      await renderFrame(setup);
      await pressKey(setup, "v");

      for (let i = 0; i < 20 && openSpy.mock.calls.length === 0; i += 1) {
        await pause(50);
      }

      expect(openSpy).toHaveBeenCalledWith(
        ["open", expect.stringMatching(/diagram-.+\.png$/)],
        expect.objectContaining({ stderr: "ignore", stdout: "ignore" }),
      );
    });

    test("opens mermaid png entries with v when the fence has extra info-string metadata", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp(
        ["```mermaid title=demo", "flowchart TD", "A[One]-->B[Two]", "```"].join("\n"),
        "mermaid-metadata.md",
        80,
        24,
      );
      const openSpy = spyOn(Bun, "spawn");

      await renderFrame(setup);
      await pressKey(setup, "v");

      for (let i = 0; i < 20 && openSpy.mock.calls.length === 0; i += 1) {
        await pause(50);
      }

      expect(openSpy).toHaveBeenCalledWith(
        ["open", expect.stringMatching(/diagram-.+\.png$/)],
        expect.objectContaining({ stderr: "ignore", stdout: "ignore" }),
      );
    });

    test("opens mermaid png entries with v when the document ends with a trailing newline", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp(
        "```mermaid\nflowchart TD\nA[One]-->B[Two]\n```\n",
        "trailing-newline-mermaid.md",
        80,
        24,
      );
      const openSpy = spyOn(Bun, "spawn");

      await renderFrame(setup);
      await pressKey(setup, "v");

      for (let i = 0; i < 20 && openSpy.mock.calls.length === 0; i += 1) {
        await pause(50);
      }

      expect(openSpy).toHaveBeenCalledWith(
        ["open", expect.stringMatching(/diagram-.+\.png$/)],
        expect.objectContaining({ stderr: "ignore", stdout: "ignore" }),
      );
    });

    test("keeps the only mermaid png entry selected when navigating with , and .", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp(
        "```mermaid\nflowchart TD\nA[One]-->B[Two]\n```",
        "single-mermaid.md",
        80,
        24,
      );
      const initialScrollTop = getScrollbox(setup)?.scrollTop ?? 0;

      await renderFrame(setup);
      await pressKey(setup, ".", ".");
      let frame = await renderFrame(setup);

      expect(frame).toContain(" view");
      expect(rgb(findSpanOnLine(setup, /󰫺 mermaid\s+ view/, " view"))).toEqual([122, 162, 247]);
      expect(getScrollbox(setup)?.scrollTop ?? 0).toBe(initialScrollTop);

      await pressKey(setup, ".", ".");
      frame = await renderFrame(setup);

      expect(frame).toContain(" view");
      expect(rgb(findSpanOnLine(setup, /󰫺 mermaid\s+ view/, " view"))).toEqual([122, 162, 247]);
      expect(getScrollbox(setup)?.scrollTop ?? 0).toBe(initialScrollTop);

      await pressKey(setup, ",", ",");
      frame = await renderFrame(setup);

      expect(frame).toContain(" view");
      expect(rgb(findSpanOnLine(setup, /󰫺 mermaid\s+ view/, " view"))).toEqual([122, 162, 247]);
      expect(getScrollbox(setup)?.scrollTop ?? 0).toBe(initialScrollTop);
    });

    test("expands the mermaid action label on mouse hover", async () => {
      if (!hasMermaidCli()) {
        return;
      }

      const setup = await renderApp(
        "```mermaid\nflowchart TD\nA[Start]-->B[Done]\n```",
        "hover-mermaid.md",
        80,
        24,
      );

      let frame = await renderFrame(setup);
      expect(frame).toContain("");
      expect(frame).not.toContain(" view");

      const mermaidAction = setup.renderer.root.findDescendantById("mermaid-png-action-0");

      expect(mermaidAction?.screenX).toBeDefined();
      expect(mermaidAction?.screenY).toBeDefined();

      if (!mermaidAction) {
        throw new Error("Missing Mermaid action renderable");
      }

      await setup.mockMouse.moveTo(mermaidAction.screenX, mermaidAction.screenY);
      frame = await renderFrame(setup);

      expect(frame).toContain(" view");
      expect(rgb(findSpanOnLine(setup, /󰫺 mermaid\s+ view/, " view"))).toEqual([42, 195, 222]);
    });

    test("shows mermaid-cli required when the cli is unavailable", async () => {
      const whichSpy = spyOn(Bun, "which").mockReturnValue(null);

      try {
        const setup = await renderApp("```mermaid\nflowchart TD\nA[Start]-->B[Done]\n```");
        const frame = await renderFrame(setup);

        expect(frame).toContain("󰫺 mermaid");
        expect(frame).toContain("mermaid-cli required");
        expect(frame).not.toContain("[png]");
      } finally {
        whichSpy.mockRestore();
      }
    });

    test("falls back to raw source when mermaid rendering fails", async () => {
      const setup = await renderApp(
        "```mermaid\nnot really mermaid\n```",
        "broken-mermaid.md",
        80,
        16,
      );

      const frame = await renderFrame(setup);

      expect(frame).toContain("󰫺 mermaid");
      expect(frame).not.toContain("[png]");
      expect(frame).toContain("not really mermaid");
    });

    test("honors code block theme overrides for border, separator, and icon spacing", async () => {
      const customTheme = structuredClone(createThemes("tokyo-night")[0]);

      if (!customTheme) {
        throw new Error("Missing custom test theme");
      }

      customTheme.name = "custom-code-block-theme";
      customTheme.markdown.codeBlock.borderVisible = false;
      customTheme.markdown.codeBlock.separator = false;
      customTheme.markdown.codeBlock.topSpacing = 1;
      customTheme.markdown.codeBlock.bottomSpacing = 1;

      const setup = await renderApp('```bash\necho "hi"\n```', "code-block-theme.md", 80, 14, {
        themes: [customTheme],
        initialThemeName: customTheme.name,
      });

      const frame = await renderFrame(setup);
      const lines = frame.split("\n");
      const iconLineIndex = lines.findIndex((line) => line.includes(" bash"));

      expect(frame).toContain(" bash");
      expect(frame).not.toMatch(/[─│┌┐└┘]/);
      expect(iconLineIndex).toBeGreaterThan(0);
      expect(lines[iconLineIndex - 1]?.trim()).toBe("");
      expect(lines[iconLineIndex + 1]?.trim()).toBe("");
    });

    test("keeps later bun commands highlighted after markdown placeholders", async () => {
      const setup = await renderApp(await fixture("placeholder-bash.md"));

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      const bunSpans = findSpansByText(setup, "bun");

      expect(bunSpans.length).toBeGreaterThanOrEqual(2);
      expect(rgb(bunSpans.at(-1))).toEqual([224, 175, 104]);
    });

    test("renders custom heading, inline code, link, list, quote, callout, and table styling", async () => {
      const setup = await renderApp(await fixture("rich-markdown.md"), "rich.md", 80, 28);
      const frame = await renderFrame(setup);

      expect(frame).toContain("# Release Notes");
      expect(frame).toContain("inline code");
      expect(frame).toContain("gh GitHub link");
      expect(frame).toContain("[ ]");
      expect(frame).toContain("[x]");
      expect(frame).toContain("•");
      expect(frame).toContain("> │ A plain quote lives here.");
      expect(frame).toContain("[NOTE] Terminal rendering");
      expect(frame).toContain("Callouts should stand out in the reader.");
      expect(frame).toContain("┌───────────┐");
      expect(frame).toContain("│Name │Value│");
      expect(frame).toContain("│alpha│    1│");
      expect(frame).toContain("│beta │   20│");
    });

    test("applies the expected custom colors to headings, inline code, task states, and links", async () => {
      const setup = await renderApp(await fixture("rich-markdown.md"), "rich.md");

      await renderFrame(setup);

      expect(rgb(findSpanContainingText(setup, "# Release Notes"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanByText(setup, "inline code"))).toEqual([224, 175, 104]);
      expect(rgb(findSpanOnLine(setup, /ship heading chrome/, "[ ]"))).toEqual([224, 175, 104]);
      expect(rgb(findSpanOnLine(setup, /support checkbox states/, "[x]"))).toEqual([158, 206, 106]);
      expect(rgb(findSpanContainingText(setup, "gh GitHub link"))).toEqual([122, 162, 247]);
    });

    test("honors heading theme overrides for foreground, icon, and separator", async () => {
      const customTheme = structuredClone(createThemes("tokyo-night")[0]);

      if (!customTheme) {
        throw new Error("Missing custom test theme");
      }

      customTheme.name = "custom-heading-theme";
      customTheme.markdown.heading.h1.foreground = "#ff00ff";
      customTheme.markdown.heading.h1.background = "#101820";
      customTheme.markdown.heading.h1.icon = "!";
      customTheme.markdown.heading.h1.separator = false;
      customTheme.markdown.heading.h1.topSpacing = 1;
      customTheme.markdown.heading.h1.bottomSpacing = 1;

      const setup = await renderApp("# Hello", "custom-theme.md", 80, 12, {
        themes: [customTheme],
        initialThemeName: customTheme.name,
      });

      const frame = await renderFrame(setup);
      const lines = frame.split("\n");
      const headingLineIndex = lines.findIndex((line) => line.includes("! Hello"));

      expect(frame).toContain("! Hello");
      expect(frame).not.toMatch(/─{3,}/);
      expect(headingLineIndex).toBeGreaterThan(0);
      expect(lines[headingLineIndex - 1]?.trim()).toBe("");
      expect(lines[headingLineIndex + 1]?.trim()).toBe("");
      expect(rgb(findSpanContainingText(setup, "! Hello"))).toEqual([255, 0, 255]);
    });

    test("matches snapshot", async () => {
      const setup = await renderApp(await fixture("basic.md"), "snap.md");

      expect(await renderFrame(setup)).toMatchSnapshot();
    });

    test("cycles to the next theme with t", async () => {
      const setup = await renderApp("# Hello", "theme.md", 100, 12, {
        themes: createThemes("nord", "solarized-dark", "tokyo-night"),
        initialThemeName: "nord",
      });

      expect(await renderFrame(setup)).toContain("Inktty | theme.md | nord | view y:1");

      await pressKey(setup, "t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("Inktty | theme.md | solarized-dark | view y:1");
      expect(rgb(findSpanContainingText(setup, "# Hello"))).toEqual([38, 139, 210]);
    });

    test("cycles to the previous theme with T", async () => {
      const setup = await renderApp("# Hello", "theme.md", 100, 12, {
        themes: createThemes("nord", "solarized-dark", "tokyo-night"),
        initialThemeName: "nord",
      });

      await renderFrame(setup);
      await pressKey(setup, "t", "T");

      const frame = await renderFrame(setup);
      expect(frame).toContain("Inktty | theme.md | tokyo-night | view y:1");
      expect(rgb(findSpanContainingText(setup, "# Hello"))).toEqual([122, 162, 247]);
    });
  });

  describe("code mode", () => {
    test("shows raw source without line numbers by default", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Hello World");
      expect(frame).not.toContain("1 | # Hello World");
    });

    test("shows line number and wrap toggles in the help drawer", async () => {
      const setup = await renderApp("# Hello");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "/", "?");

      const frame = await renderFrame(setup);
      expect(frame).toContain("w");
      expect(frame).toContain("toggle wrap");
      expect(frame).toContain("n");
      expect(frame).toContain("toggle line numbers");
    });

    test("toggles line numbers on with n", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "n");

      expect(await renderFrame(setup)).toContain("1 | # Hello World");
    });

    test("toggles soft wrap off with w and shows horizontal scroll controls in help", async () => {
      const setup = await renderApp(
        "averylonglinewithoutspaces-1234567890-abcdefghij",
        "wrap.md",
        90,
        12,
      );

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "w");
      await pressKey(setup, "/", "?");

      const frame = await renderFrame(setup);
      expect(frame).toContain("h/l");
      expect(frame).toContain("horizontal scroll");
    });

    test("keeps code mode help entries visible on narrow terminals", async () => {
      const setup = await renderApp(
        "averylonglinewithoutspaces-1234567890-abcdefghij",
        "wrap.md",
        50,
        16,
      );

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "w");
      await pressKey(setup, "/", "?");

      const frame = await renderFrame(setup);
      expect(frame).toContain("w");
      expect(frame).toContain("toggle wrap");
      expect(frame).toContain("n");
      expect(frame).toContain("toggle line");
      expect(frame).toContain("numbers");
      expect(frame).toContain("h/l");
      expect(frame).toContain("horizontal");
      expect(frame).toContain("scroll");
    });

    test("shows code mode status in the bottom bar", async () => {
      const setup = await renderApp("# Hello World", "code.md", 80, 12);

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("Inktty | code.md | tokyo-night | code y:1 | w:on | n:off");
    });

    test("shows horizontal offset in the bottom bar when nowrap code mode is active", async () => {
      const setup = await renderApp("a".repeat(100), "scroll-x.md", 80, 10);

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "w");
      await pressKey(setup, "l");
      await pressKey(setup, "l");

      const frame = await renderFrame(setup);
      expect(frame).toContain("n:off");
      expect(frame).toContain("x:8");
    });

    test("h and l horizontally scroll when soft wrap is disabled", async () => {
      const content = "averylonglinewithoutspaces-1234567890-abcdefghij";
      const setup = await renderApp(content, "scroll-x.md", 30, 8);

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "w");

      let frame = await renderFrame(setup);
      expect(frame).toContain("averylonglinewithoutspaces");
      expect(frame).not.toContain("abcdefghij");

      await pressKey(setup, "l");
      await pressKey(setup, "l");
      await pressKey(setup, "l");
      await pressKey(setup, "l");
      await pressKey(setup, "l");
      await pressKey(setup, "l");
      frame = await renderFrame(setup);

      expect(frame).toContain("1234567890");
      expect(frame).not.toContain("averylonglinewithoutspaces");

      await pressKey(setup, "h");
      frame = await renderFrame(setup);
      expect(frame).toContain("ithoutspaces");
      expect(frame).not.toContain("averylonglinewithoutspaces");
    });

    test("only highlights code inside fenced blocks", async () => {
      const setup = await renderApp(await fixture("code-sample.md"));

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Title");
      expect(frame).toContain("```ts");
      expect(frame).toContain("const x = 1");
      expect(findSpanContainingText(setup, "# Title")).toBeDefined();
      expect(rgb(findSpanContainingText(setup, "# Title"))).not.toEqual([122, 162, 247]);
      expect(rgb(findSpanByText(setup, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanByText(setup, "1"))).toEqual([255, 158, 100]);
    });

    test("uses the active theme palette in code mode", async () => {
      const setup = await renderApp("```ts\nconst x = 1\n```", "code-theme.md", 80, 12, {
        themes: createThemes("nord", "solarized-dark"),
        initialThemeName: "solarized-dark",
      });

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await renderFrame(setup);

      expect(rgb(findSpanByText(setup, "const"))).toEqual([38, 139, 210]);
      expect(rgb(findSpanByText(setup, "1"))).toEqual([203, 75, 22]);
    });

    test("highlights tilde fenced code blocks in code mode", async () => {
      const setup = await renderApp("~~~ts\nconst x = 1\n~~~");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await renderFrame(setup);

      expect(rgb(findSpanByText(setup, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanByText(setup, "1"))).toEqual([255, 158, 100]);
    });

    test("highlights bash only inside fenced blocks", async () => {
      const content = ["# Title", "", "```bash", "if true; then", 'echo "hi"', "fi", "```"].join(
        "\n",
      );
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await renderFrame(setup);

      expect(rgb(findSpanContainingText(setup, "if"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanContainingText(setup, '"hi"'))).toEqual([158, 206, 106]);
      expect(findSpanContainingText(setup, "# Title")).toBeDefined();
      expect(rgb(findSpanContainingText(setup, "# Title"))).not.toEqual([122, 162, 247]);
    });

    test("pressing n in view mode is ignored", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "n");

      const frame = await renderFrame(setup);
      expect(frame).toContain("Hello World");
      expect(frame).toContain("view");
    });

    test("matches snapshot", async () => {
      const setup = await renderApp(await fixture("basic.md"), "snap.md");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      expect(await renderFrame(setup)).toMatchSnapshot();
    });
  });

  describe("mode switching", () => {
    test("starts in view mode", async () => {
      const setup = await renderApp("# Hello");
      const frame = await renderFrame(setup);

      expect(frame).toContain("view y:1");
      expect(frame).not.toContain("code y:1");
    });

    test("tab switches to code mode", async () => {
      const setup = await renderApp("# Hello");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Hello");
      expect(frame).toContain("code y:1 | w:on | n:off");
    });

    test("tab twice returns to view mode", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("Hello World");
      expect(frame).not.toContain("l: lines");
    });

    test("tab preserves scroll position", async () => {
      const content = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      const setup = await renderApp(content, "scroll.md", 40, 6);

      await renderFrame(setup);
      await pressKey(setup, "j");
      await pressKey(setup, "j");

      let frame = await renderFrame(setup);
      expect(frame).toContain("Line 2");
      expect(frame).not.toContain("Line 1\n");

      const scrollTopBeforeToggle = getScrollbox(setup)?.scrollTop;
      expect(scrollTopBeforeToggle).toBeGreaterThan(0);

      await pressKey(setup, "tab", "\t");
      frame = await renderFrame(setup);

      expect(frame).toContain("Line 2");
      expect(frame).not.toContain("Line 1\n");
      expect(getScrollbox(setup)?.scrollTop).toBe(scrollTopBeforeToggle ?? 0);
    });

    test("repeated toggles preserve scroll position at the same offset", async () => {
      const content = Array.from({ length: 16 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      const setup = await renderApp(content, "scroll-repeat.md", 40, 6);

      await renderFrame(setup);
      await pressKey(setup, "j");
      await pressKey(setup, "j");

      const scrollTop = getScrollbox(setup)?.scrollTop ?? 0;
      expect(scrollTop).toBeGreaterThan(0);

      for (let i = 0; i < 3; i += 1) {
        await pressKey(setup, "tab", "\t");
        const frame = await renderFrame(setup);

        expect(frame).toContain("Line 2");
        expect(frame).not.toContain("Line 1\n");
        expect(getScrollbox(setup)?.scrollTop).toBe(scrollTop);
      }
    });
  });

  describe("copy mode", () => {
    test("copies selected text to the renderer clipboard and shows feedback", async () => {
      const setup = await renderApp("Copy this text");
      const copySpy = spyOn(setup.renderer, "copyToClipboardOSC52");

      await renderFrame(setup);
      await emitSelection(setup, selectionWithText("Copy this text"));

      expect(copySpy).toHaveBeenCalledWith("Copy this text");
      expect(await renderFrame(setup)).toContain("copied!");
      expect(await renderFrame(setup)).toContain("copied! |");
    });

    test("ignores empty selections", async () => {
      const setup = await renderApp("Copy this text");
      const copySpy = spyOn(setup.renderer, "copyToClipboardOSC52");

      await renderFrame(setup);
      await emitSelection(setup, selectionWithText(""));

      expect(copySpy).not.toHaveBeenCalled();
      expect(await renderFrame(setup)).not.toContain("copied!");
    });
  });

  describe("scrolling", () => {
    test("j and k scroll the viewport", async () => {
      const content = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      const setup = await renderApp(content, "scroll.md", 80, 6);

      let frame = await renderFrame(setup);
      expect(frame).toContain("Line 1");
      expect(frame).not.toContain("Line 12");

      await pressKey(setup, "j");
      await pressKey(setup, "j");
      frame = await renderFrame(setup);
      expect(frame).toContain("Line 2");
      expect(frame).toContain("Line 3");
      expect(frame).not.toContain("Line 1\n");
      expect(frame).toContain("Inktty | scroll.md | tokyo-night | view y:3");

      await pressKey(setup, "k");
      expect(await renderFrame(setup)).toContain("Line 1");
    });
  });

  describe("edge cases", () => {
    test("renders empty markdown without errors", async () => {
      const setup = await renderApp("", "empty.md");
      const frame = await renderFrame(setup);

      expect(frame).toBeDefined();
      expect(frame.length).toBeGreaterThan(0);
    });

    test("renders multiple sections from fixtures", async () => {
      const setup = await renderApp(await fixture("multi-section.md"));
      const frame = await renderFrame(setup);

      expect(frame).toContain("Introduction");
      expect(frame).toContain("Features");
      expect(frame).toContain("Conclusion");
    });
  });
});
