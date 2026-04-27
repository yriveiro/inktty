import { describe, expect, test } from "bun:test";
import {
  applyThemeOverride,
  defaultThemeName,
  getDefaultThemesDir,
  getEmbeddedTheme,
  listThemeNames,
  loadAvailableThemes,
  resolveThemeByName,
} from "../../src/lib/theme";

function requireTheme(name: string) {
  const theme = getEmbeddedTheme(name);

  if (!theme) {
    throw new Error(`Missing embedded theme: ${name}`);
  }

  return theme;
}

describe("theme helpers", () => {
  test("applies nested overrides without mutating the base theme", () => {
    const baseTheme = requireTheme("tokyo-night");

    const mergedTheme = applyThemeOverride(baseTheme, {
      chrome: { brand: "#ffffff" },
      markdown: {
        heading: {
          h1: {
            foreground: "#ff0000",
            separator: false,
            icon: "!",
            topSpacing: 1,
            bottomSpacing: 2,
          },
        },
      },
    });

    expect(mergedTheme.chrome.brand).toBe("#ffffff");
    expect(mergedTheme.markdown.heading.h1.foreground).toBe("#ff0000");
    expect(mergedTheme.markdown.heading.h1.separator).toBe(false);
    expect(mergedTheme.markdown.heading.h1.icon).toBe("!");
    expect(mergedTheme.markdown.heading.h1.topSpacing).toBe(1);
    expect(mergedTheme.markdown.heading.h1.bottomSpacing).toBe(2);
    expect(baseTheme.chrome.brand).toBe("#7aa2f7");
    expect(baseTheme.markdown.heading.h1.foreground).toBe("#7aa2f7");
    expect(baseTheme.markdown.heading.h1.separator).toBe(true);
    expect(baseTheme.markdown.heading.h1.topSpacing).toBe(0);
    expect(baseTheme.markdown.heading.h1.bottomSpacing).toBe(0);
  });

  test("applies code block behavior overrides without mutating the base theme", () => {
    const baseTheme = requireTheme("tokyo-night");

    const mergedTheme = applyThemeOverride(baseTheme, {
      markdown: {
        codeBlock: {
          borderVisible: false,
          separator: false,
          topSpacing: 1,
          bottomSpacing: 2,
        },
      },
    });

    expect(mergedTheme.markdown.codeBlock.borderVisible).toBe(false);
    expect(mergedTheme.markdown.codeBlock.separator).toBe(false);
    expect(mergedTheme.markdown.codeBlock.topSpacing).toBe(1);
    expect(mergedTheme.markdown.codeBlock.bottomSpacing).toBe(2);
    expect(baseTheme.markdown.codeBlock.borderVisible).toBe(true);
    expect(baseTheme.markdown.codeBlock.separator).toBe(true);
    expect(baseTheme.markdown.codeBlock.topSpacing).toBe(0);
    expect(baseTheme.markdown.codeBlock.bottomSpacing).toBe(0);
  });

  test("resolves the requested theme and falls back to the default theme", () => {
    const nord = requireTheme("nord");
    const tokyoNight = requireTheme("tokyo-night");

    const themes = [nord, tokyoNight];

    expect(resolveThemeByName(themes, "nord").name).toBe("nord");
    expect(resolveThemeByName(themes, "missing").name).toBe(defaultThemeName);
  });

  test("lists theme names in sorted order", () => {
    const nord = requireTheme("nord");
    const solarizedDark = requireTheme("solarized-dark");
    const tokyoNight = requireTheme("tokyo-night");

    expect(listThemeNames([tokyoNight, nord, solarizedDark])).toEqual([
      "nord",
      "solarized-dark",
      "tokyo-night",
    ]);
  });

  test("uses XDG_CONFIG_HOME for the default themes directory", () => {
    const previousConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = "/tmp/ink-config";

    try {
      expect(getDefaultThemesDir()).toBe("/tmp/ink-config/inktty/themes");
    } finally {
      process.env.XDG_CONFIG_HOME = previousConfigHome;
    }
  });
});

describe("theme loading", () => {
  test("loads user themes, supports extends, and keeps embedded themes available", async () => {
    const themes = await loadAvailableThemes({
      themesDir: "/virtual/themes",
      readDir: async () => ["midnight.toml", "nord.toml", "notes.txt"],
      readTextFile: async (filePath) => {
        if (filePath.endsWith("midnight.toml")) {
          return [
            'extends = "nord"',
            "[chrome]",
            'brand = "#ffffff"',
            "[markdown.heading.h1]",
            'foreground = "#ff00ff"',
            'background = "#101820"',
            'icon = "!"',
            "separator = false",
            "topSpacing = 1",
            "bottomSpacing = 2",
            "",
            "[markdown.codeBlock]",
            "borderVisible = false",
            "separator = false",
            "topSpacing = 1",
            "bottomSpacing = 1",
          ].join("\n");
        }

        if (filePath.endsWith("nord.toml")) {
          return ["[chrome]", 'controls = "#123456"'].join("\n");
        }

        throw new Error(`Unexpected theme file: ${filePath}`);
      },
    });

    const nord = resolveThemeByName(themes, "nord");
    const midnight = resolveThemeByName(themes, "midnight");
    const tokyoNight = resolveThemeByName(themes, "tokyo-night");

    expect(themes.length).toBeGreaterThanOrEqual(4);
    expect(nord.chrome.controls).toBe("#123456");
    expect(midnight.chrome.brand).toBe("#ffffff");
    expect(midnight.chrome.controls).toBe("#123456");
    expect(midnight.markdown.heading.h1.foreground).toBe("#ff00ff");
    expect(midnight.markdown.heading.h1.background).toBe("#101820");
    expect(midnight.markdown.heading.h1.icon).toBe("!");
    expect(midnight.markdown.heading.h1.separator).toBe(false);
    expect(midnight.markdown.heading.h1.topSpacing).toBe(1);
    expect(midnight.markdown.heading.h1.bottomSpacing).toBe(2);
    expect(midnight.markdown.codeBlock.borderVisible).toBe(false);
    expect(midnight.markdown.codeBlock.separator).toBe(false);
    expect(midnight.markdown.codeBlock.topSpacing).toBe(1);
    expect(midnight.markdown.codeBlock.bottomSpacing).toBe(1);
    expect(tokyoNight.name).toBe("tokyo-night");
  });

  test("detects theme inheritance cycles", async () => {
    await expect(
      loadAvailableThemes({
        themesDir: "/virtual/themes",
        readDir: async () => ["alpha.toml", "beta.toml"],
        readTextFile: async (filePath) => {
          if (filePath.endsWith("alpha.toml")) {
            return 'extends = "beta"';
          }

          if (filePath.endsWith("beta.toml")) {
            return 'extends = "alpha"';
          }

          throw new Error(`Unexpected theme file: ${filePath}`);
        },
      }),
    ).rejects.toThrow("Theme inheritance cycle detected for 'alpha'");
  });

  test("rejects invalid user theme overrides with a helpful validation error", async () => {
    await expect(
      loadAvailableThemes({
        themesDir: "/virtual/themes",
        readDir: async () => ["broken.toml"],
        readTextFile: async () => {
          return [
            "[markdown.heading.h1]",
            'foreground = "magenta"',
            "topSpacing = -1",
            'separator = "no"',
          ].join("\n");
        },
      }),
    ).rejects.toThrow(/Invalid theme config in .*broken\.toml/);
  });
});
