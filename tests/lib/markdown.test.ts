import { describe, expect, test } from "bun:test";
import { stripMarkdown, withLineNumbers } from "../../src/lib/markdown";

describe("markdown utilities", () => {
  test("strips common markdown syntax for parsed view text", () => {
    const source = ["# Heading", "", "This is **bold** and _italic_.", "", "- one", "- two"].join(
      "\n",
    );

    expect(stripMarkdown(source)).toContain("Heading");
    expect(stripMarkdown(source)).toContain("This is bold and italic.");
    expect(stripMarkdown(source)).toContain("one");
    expect(stripMarkdown(source)).not.toContain("# ");
    expect(stripMarkdown(source)).not.toContain("**");
  });

  test("adds padded line numbers for code view", () => {
    expect(withLineNumbers("alpha\nbeta\ngamma")).toBe("1 | alpha\n2 | beta\n3 | gamma");
    expect(
      withLineNumbers(Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n")),
    ).toContain("12 | line 12");
  });
});
