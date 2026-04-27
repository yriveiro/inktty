import { describe, expect, test } from "bun:test";
import {
  centerText,
  padTextEnd,
  padTextStart,
  sliceTextByWidth,
  stringWidth,
} from "../../src/lib/display";

describe("display utilities", () => {
  test("measures terminal cell width for wide characters", () => {
    expect(stringWidth("abc")).toBe(3);
    expect(stringWidth("漢字")).toBe(4);
  });

  test("pads text using terminal display width", () => {
    expect(padTextEnd("漢", 4)).toBe("漢  ");
    expect(padTextStart("漢", 4)).toBe("  漢");
    expect(centerText("漢", 5)).toBe(" 漢  ");
  });

  test("slices text by terminal width without splitting wide glyphs", () => {
    expect(sliceTextByWidth("漢字abc", 0)).toBe("漢字abc");
    expect(sliceTextByWidth("漢字abc", 2)).toBe("字abc");
    expect(sliceTextByWidth("漢字abc", 3)).toBe("abc");
    expect(sliceTextByWidth("漢字abc", 4)).toBe("abc");
  });
});
