import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { App } from "../src/App";
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

async function renderApp(content: string, fileName = "test.md", width = 80, height = 24) {
  testSetup = await testRender(<App fileName={fileName} content={content} />, {
    width,
    height,
  });

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
});

describe("App", () => {
  describe("header", () => {
    test("displays the filename", async () => {
      const setup = await renderApp("# Hello", "README.md");

      expect(await renderFrame(setup)).toContain("README.md");
    });

    test("shows mode indicators", async () => {
      const setup = await renderApp("# Hello");
      const frame = await renderFrame(setup);

      expect(frame).toContain("view");
      expect(frame).toContain("code");
    });

    test("shows tab toggle and quit hints", async () => {
      const setup = await renderApp("# Hello");
      const frame = await renderFrame(setup);

      expect(frame).toContain("tab: toggle");
      expect(frame).toContain("q: quit");
      expect(frame).not.toContain("l: lines");
    });
  });

  describe("view mode", () => {
    test("renders markdown content from fixtures", async () => {
      const setup = await renderApp(await fixture("basic.md"));
      const frame = await renderFrame(setup);

      expect(frame).toContain("Hello");
      expect(frame).toContain("This is bold text.");
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

      expect(rgb(findSpanOnLine(setup, /const x = 1/, "const"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /const x = 1/, "1"))).toEqual([255, 158, 100]);
    });

    test("highlights bash fenced code blocks", async () => {
      const setup = await renderApp(await fixture("bash-sample.md"));

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanOnLine(setup, /if true; then/, "if"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /echo "hi"/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights yaml fenced code blocks", async () => {
      const setup = await renderApp("```yaml\nname: sample-app\n```");

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanOnLine(setup, /name: sample-app/, ":"))).toEqual([169, 177, 214]);
      expect(rgb(findSpanOnLine(setup, /name: sample-app/, "sample-app"))).toEqual([158, 206, 106]);
    });

    test("highlights json fenced code blocks", async () => {
      const setup = await renderApp('```json\n{"name": "inktty"}\n```');

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanOnLine(setup, /inktty/, '"inktty"'))).toEqual([158, 206, 106]);
    });

    test("highlights java fenced code blocks", async () => {
      const content = '```java\nclass Hello {\n  String greet() {\n    return "hi";\n  }\n}\n```';
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanOnLine(setup, /class Hello/, "class"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanOnLine(setup, /return "hi";/, '"hi"'))).toEqual([158, 206, 106]);
    });

    test("highlights rego fenced code blocks", async () => {
      const setup = await renderApp(await fixture("rego-sample.md"));

      await renderFrame(setup);
      await pause(100);
      await setup.renderOnce();

      expect(rgb(findSpanOnLine(setup, /default allow := false/, "default"))).toEqual([
        122, 162, 247,
      ]);
      expect(rgb(findSpanOnLine(setup, /allow if input.user == "alice"/, '"alice"'))).toEqual([
        158, 206, 106,
      ]);
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

    test("matches snapshot", async () => {
      const setup = await renderApp(await fixture("basic.md"), "snap.md");

      expect(await renderFrame(setup)).toMatchSnapshot();
    });
  });

  describe("code mode", () => {
    test("shows raw source without line numbers by default", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Hello World");
      expect(frame).not.toContain("1 |");
    });

    test("shows line numbers toggle in header", async () => {
      const setup = await renderApp("# Hello");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      expect(await renderFrame(setup)).toContain("l: lines off");
    });

    test("toggles line numbers on with l", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "l");

      expect(await renderFrame(setup)).toContain("1 | # Hello World");
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

    test("highlights bash only inside fenced blocks", async () => {
      const content = ["# Title", "", "```bash", "if true; then", 'echo "hi"', "fi", "```"].join(
        "\n",
      );
      const setup = await renderApp(content);

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await renderFrame(setup);

      expect(rgb(findSpanByText(setup, "if"))).toEqual([122, 162, 247]);
      expect(rgb(findSpanByText(setup, '"hi"'))).toEqual([158, 206, 106]);
      expect(findSpanContainingText(setup, "# Title")).toBeDefined();
      expect(rgb(findSpanContainingText(setup, "# Title"))).not.toEqual([122, 162, 247]);
    });

    test("pressing l in view mode is ignored", async () => {
      const setup = await renderApp("# Hello World");

      await renderFrame(setup);
      await pressKey(setup, "l");

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

      expect(frame).toContain("view");
      expect(frame).toContain("code");
    });

    test("tab switches to code mode", async () => {
      const setup = await renderApp("# Hello");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");

      const frame = await renderFrame(setup);
      expect(frame).toContain("# Hello");
      expect(frame).toContain("l: lines");
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
  });

  describe("copy mode", () => {
    test("copies selected text to the renderer clipboard and shows feedback", async () => {
      const setup = await renderApp("Copy this text");
      const copySpy = spyOn(setup.renderer, "copyToClipboardOSC52");

      await renderFrame(setup);
      await emitSelection(setup, selectionWithText("Copy this text"));

      expect(copySpy).toHaveBeenCalledWith("Copy this text");
      expect(await renderFrame(setup)).toContain("copied!");
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
      const setup = await renderApp(content, "scroll.md", 40, 6);

      let frame = await renderFrame(setup);
      expect(frame).toContain("Line 1");
      expect(frame).not.toContain("Line 12");

      await pressKey(setup, "j");
      await pressKey(setup, "j");
      frame = await renderFrame(setup);
      expect(frame).toContain("Line 2");
      expect(frame).toContain("Line 6");
      expect(frame).not.toContain("Line 1\n");

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
