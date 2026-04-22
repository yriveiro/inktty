import { afterEach, describe, expect, test } from "bun:test";
import {
  type CapturedLine,
  type CapturedSpan,
  KeyEvent,
  type ScrollBoxRenderable,
} from "@opentui/core";
import { act } from "react";
import { App } from "./App";
import { testRender } from "./test-utils";

let testSetup: Awaited<ReturnType<typeof testRender>>;

async function pause(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

afterEach(async () => {
  if (testSetup) {
    await act(async () => {
      testSetup.renderer.destroy();
    });
  }
});

async function renderFrame(): Promise<string> {
  await testSetup.renderOnce();
  await pause(100);
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
}

function findSpanText(text: string) {
  for (const line of testSetup.captureSpans().lines) {
    for (const span of line.spans) {
      if (span.text === text) {
        return span;
      }
    }
  }

  return undefined;
}

function getScrollbox(): ScrollBoxRenderable | undefined {
  return testSetup.renderer.root.findDescendantById("markdown-reader-scrollbox") as
    | ScrollBoxRenderable
    | undefined;
}

function emitKey(name: string, sequence: string): void {
  act(() => {
    testSetup.renderer.keyInput.emit(
      "keypress",
      new KeyEvent({
        name,
        sequence,
        ctrl: false,
        shift: false,
        meta: false,
        option: false,
        eventType: "press",
        repeated: false,
        number: false,
        raw: sequence,
        source: "raw",
      }),
    );
  });
}

async function pressTab(): Promise<void> {
  emitKey("tab", "\t");
  await pause(50);
}

async function pressL(): Promise<void> {
  emitKey("l", "l");
  await pause(50);
}

async function pressJ(): Promise<void> {
  emitKey("j", "j");
  await pause(50);
}

async function pressK(): Promise<void> {
  emitKey("k", "k");
  await pause(50);
}

describe("Markdown Reader App", () => {
  describe("header", () => {
    test("displays the filename", async () => {
      testSetup = await testRender(<App fileName="README.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("README.md");
    });

    test("shows mode indicators", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("view");
      expect(frame).toContain("code");
    });

    test("shows tab toggle hint", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("tab: toggle");
    });

    test("shows q: quit hint", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("q: quit");
    });

    test("does not show line numbers toggle in view mode", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).not.toContain("l: lines");
    });
  });

  describe("view mode", () => {
    test("renders markdown content", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello World" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("Hello World");
    });

    test("renders paragraphs", async () => {
      const content = "This is a simple paragraph of text.";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("simple paragraph");
    });

    test("renders bold text", async () => {
      const content = "This is **bold** text.";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("bold");
    });

    test("renders code blocks", async () => {
      const content = "```typescript\nfunction hello() {}\n```";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("function hello");
    });

    test("renders horizontal rules", async () => {
      const content = ["before", "", "---", "", "after"].join("\n");
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();

      expect(frame).toContain("before");
      expect(frame).toContain("after");
      expect(frame).toMatch(/─{5,}/);
    });

    test("uses fence language aliases for code block highlighting", async () => {
      const content = "```ts\nconst x = 1\n```";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText("const")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText("1")?.fg.toInts().slice(0, 3)).toEqual([255, 158, 100]);
    });

    test("highlights bash fenced code blocks", async () => {
      const content = '```bash\nif true; then\necho "hi"\nfi\n```';
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText("if")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText('"hi"')?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
    });

    test("highlights yaml fenced code blocks", async () => {
      const content = "```yaml\nname: inktty\n```";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText(":")?.fg.toInts().slice(0, 3)).toEqual([169, 177, 214]);
      expect(findSpanText("inktty")?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
    });

    test("highlights json fenced code blocks", async () => {
      const content = '```json\n{"name": "inktty"}\n```';
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText('"inktty"')?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
    });

    test("highlights java fenced code blocks", async () => {
      const content = '```java\nclass Hello {\n  String greet() {\n    return "hi";\n  }\n}\n```';
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText("class")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText('"hi"')?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
    });

    test("highlights rego fenced code blocks", async () => {
      const content =
        '```rego\npackage inktty\n\ndefault allow := false\n\nallow if input.user == "alice"\n```';
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      expect(findSpanText("default")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText('"alice"')?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
    });

    test("keeps later bun commands highlighted after markdown placeholders", async () => {
      const content = [
        "```bash",
        "# Read a markdown file",
        "bun run src/index.tsx <path-to-file.md>",
        "# Development (watch mode)",
        "bun run dev",
        "```",
      ].join("\n");
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pause(100);
      await testSetup.renderOnce();

      const bunSpans = testSetup
        .captureSpans()
        .lines.flatMap((line: CapturedLine) => line.spans)
        .filter((span: CapturedSpan) => span.text === "bun");

      expect(bunSpans.length).toBeGreaterThanOrEqual(2);
      expect(bunSpans.at(-1)?.fg.toInts().slice(0, 3)).toEqual([224, 175, 104]);
    });

    test("matches snapshot", async () => {
      const content = "# Hello\n\nThis is **bold** text.";
      testSetup = await testRender(<App fileName="snap.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toMatchSnapshot();
    });
  });

  describe("code mode", () => {
    test("shows raw source without line numbers by default", async () => {
      const content = "# Hello World";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toContain("# Hello World");
      expect(frame).not.toContain("1 |");
    });

    test("shows line numbers toggle in header", async () => {
      const content = "# Hello";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toContain("l: lines off");
    });

    test("toggles line numbers on with l", async () => {
      const content = "# Hello World";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      await pressL();
      const frame = await renderFrame();
      expect(frame).toContain("1 | # Hello World");
    });

    test("only highlights code inside fenced blocks", async () => {
      const content = ["# Title", "", "```ts", "const x = 1", "```"].join("\n");
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();

      expect(frame).toContain("# Title");
      expect(frame).toContain("```ts");
      expect(frame).toContain("const x = 1");
      expect(findSpanText("const")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText("1")?.fg.toInts().slice(0, 3)).toEqual([255, 158, 100]);
    });

    test("highlights bash only inside fenced blocks", async () => {
      const content = ["# Title", "", "```bash", "if true; then", 'echo "hi"', "fi", "```"].join(
        "\n",
      );
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      await renderFrame();

      expect(findSpanText("if")?.fg.toInts().slice(0, 3)).toEqual([122, 162, 247]);
      expect(findSpanText('"hi"')?.fg.toInts().slice(0, 3)).toEqual([158, 206, 106]);
      expect(findSpanText("# Title")?.fg).toBeUndefined();
    });

    test("pressing l in view mode is ignored", async () => {
      const content = "# Hello World";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressL();
      const frame = await renderFrame();
      expect(frame).toContain("Hello World");
      expect(frame).toContain("view");
    });

    test("matches snapshot", async () => {
      const content = "# Hello\n\nThis is **bold** text.";
      testSetup = await testRender(<App fileName="snap.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toMatchSnapshot();
    });
  });

  describe("mode switching", () => {
    test("starts in view mode", async () => {
      testSetup = await testRender(<App fileName="test.md" content="# Hello" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      // view is highlighted, code is dim
      expect(frame).toContain("view");
      expect(frame).toContain("code");
    });

    test("tab switches to code mode", async () => {
      const content = "# Hello";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toContain("# Hello");
      expect(frame).toContain("l: lines");
    });

    test("tab twice returns to view mode", async () => {
      const content = "# Hello World";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toContain("Hello World");
      expect(frame).not.toContain("l: lines");
    });

    test("tab preserves scroll position", async () => {
      const content = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      testSetup = await testRender(<App fileName="scroll.md" content={content} />, {
        width: 40,
        height: 6,
      });

      await renderFrame();
      await pressJ();
      await pressJ();

      let frame = await renderFrame();
      expect(frame).toContain("Line 2");
      expect(frame).not.toContain("Line 1\n");

      const scrollTopBeforeToggle = getScrollbox()?.scrollTop;
      expect(scrollTopBeforeToggle).toBeGreaterThan(0);

      await pressTab();
      frame = await renderFrame();

      expect(frame).toContain("Line 2");
      expect(frame).not.toContain("Line 1\n");
      expect(getScrollbox()?.scrollTop).toBe(scrollTopBeforeToggle ?? 0);
    });
  });

  describe("copy mode", () => {
    test("text is selectable in view mode", async () => {
      const content = "Copy this text";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("Copy this text");
    });

    test("text is selectable in code mode", async () => {
      const content = "# Copy this code";
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      await renderFrame();
      await pressTab();
      const frame = await renderFrame();
      expect(frame).toContain("# Copy this code");
    });
  });

  describe("scrolling", () => {
    test("j and k scroll the viewport", async () => {
      const content = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n\n");
      testSetup = await testRender(<App fileName="scroll.md" content={content} />, {
        width: 40,
        height: 6,
      });

      let frame = await renderFrame();
      expect(frame).toContain("Line 1");
      expect(frame).not.toContain("Line 12");

      await pressJ();
      await pressJ();
      frame = await renderFrame();
      expect(frame).toContain("Line 2");
      expect(frame).toContain("Line 6");
      expect(frame).not.toContain("Line 1\n");

      await pressK();
      frame = await renderFrame();
      expect(frame).toContain("Line 1");
    });
  });

  describe("edge cases", () => {
    test("renders empty markdown without errors", async () => {
      testSetup = await testRender(<App fileName="empty.md" content="" />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toBeDefined();
      expect(frame.length).toBeGreaterThan(0);
    });

    test("renders multiple sections", async () => {
      const content = [
        "# Introduction",
        "Welcome to the app.",
        "## Features",
        "- Feature one",
        "- Feature two",
        "## Conclusion",
        "Thanks for reading.",
      ].join("\n\n");
      testSetup = await testRender(<App fileName="test.md" content={content} />, {
        width: 80,
        height: 24,
      });
      const frame = await renderFrame();
      expect(frame).toContain("Introduction");
      expect(frame).toContain("Features");
      expect(frame).toContain("Conclusion");
    });
  });
});
