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
          h1: { foreground: "#ff0000" },
        },
      },
    });

    expect(mergedTheme.chrome.brand).toBe("#ffffff");
    expect(mergedTheme.markdown.heading.h1.foreground).toBe("#ff0000");
    expect(baseTheme.chrome.brand).toBe("#7aa2f7");
    expect(baseTheme.markdown.heading.h1.foreground).toBe("#7aa2f7");
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
});
