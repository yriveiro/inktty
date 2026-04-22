import { afterEach, describe, expect, test } from "bun:test";
import { App } from "../../src/App";
import { destroyTestSetup, pressKey, renderFrame, type TestSetup, testRender } from "../test-utils";

let testSetup: TestSetup | undefined;

async function givenInkttyIsRendering(content: string, width = 80, height = 24) {
  testSetup = await testRender(<App fileName="story.md" content={content} />, {
    width,
    height,
  });

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
    test("Given the raw source view, when l is pressed, then each line is prefixed with a line number", async () => {
      const setup = await givenInkttyIsRendering("# Heading\n\nBody");

      await renderFrame(setup);
      await pressKey(setup, "tab", "\t");
      await pressKey(setup, "l");

      const frame = await renderFrame(setup);
      expect(frame).toContain("1 | # Heading");
      expect(frame).toContain("3 | Body");
    });
  });
});
