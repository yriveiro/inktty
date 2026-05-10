import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import * as z from "zod";

export interface SyntaxPalette {
  default: string;
  keyword: string;
  string: string;
  stringEscape: string;
  number: string;
  comment: string;
  function: string;
  type: string;
  property: string;
  variable: string;
  variableBuiltin: string;
  operator: string;
  punctuation: string;
  tag: string;
  tagAttribute: string;
  tagDelimiter: string;
}

export interface HeadingTheme {
  background: string;
  bottomSpacing: number;
  border: string;
  foreground: string;
  icon: string;
  separator: boolean;
  topSpacing: number;
}

export interface LinkTheme {
  foreground: string;
  icon: string;
}

export interface CalloutTheme {
  background: string;
  badge: string;
  border: string;
  foreground: string;
}

export interface CodeBlockTheme {
  background: string;
  border: string;
  borderVisible: boolean;
  bottomSpacing: number;
  headerBackground: string;
  label: string;
  language: string;
  separator: boolean;
  topSpacing: number;
}

export interface InkTheme {
  name: string;
  chrome: {
    activeMode: string;
    brand: string;
    controls: string;
    copied: string;
    fileName: string;
    headerBackground: string;
    helpBackground: string;
    inactiveMode: string;
    lineNumber: string;
  };
  markdown: {
    blockquote: {
      border: string;
      foreground: string;
      marker: string;
    };
    callout: {
      caution: CalloutTheme;
      danger: CalloutTheme;
      example: CalloutTheme;
      important: CalloutTheme;
      info: CalloutTheme;
      note: CalloutTheme;
      question: CalloutTheme;
      quote: CalloutTheme;
      success: CalloutTheme;
      tip: CalloutTheme;
      warning: CalloutTheme;
    };
    codeBlock: {
      background: string;
      border: string;
      borderVisible: boolean;
      bottomSpacing: number;
      headerBackground: string;
      label: string;
      language: string;
      separator: boolean;
      topSpacing: number;
    };
    heading: {
      h1: HeadingTheme;
      h2: HeadingTheme;
      h3: HeadingTheme;
      h4: HeadingTheme;
      h5: HeadingTheme;
      h6: HeadingTheme;
    };
    horizontalRule: {
      foreground: string;
    };
    inlineCode: {
      background: string;
      foreground: string;
    };
    links: {
      anchor: LinkTheme;
      default: LinkTheme;
      github: LinkTheme;
      mail: LinkTheme;
      path: LinkTheme;
      web: LinkTheme;
    };
    list: {
      bullet: string;
      bulletForeground: string;
      taskChecked: string;
      taskUnchecked: string;
    };
    table: {
      background: string;
      border: string;
      centerAlignIndicator: string;
      headerForeground: string;
      leftAlignIndicator: string;
      rightAlignIndicator: string;
      rowForeground: string;
      separatorForeground: string;
    };
  };
  syntax: SyntaxPalette;
}

type DeepPartial<T> = {
  [K in keyof T]?: (T[K] extends object ? DeepPartial<T[K]> : T[K]) | undefined;
};

type PlainObject = Record<string, unknown>;

interface ThemeSource {
  name: string;
  override: ThemeOverride;
}

export interface ThemeLoadOptions {
  readDir?: (dir: string) => Promise<string[]>;
  readTextFile?: (filePath: string) => Promise<string>;
  themesDir?: string;
}

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const nonNegativeIntegerSchema = z.int().nonnegative();

const headingThemeOverrideSchema = z.strictObject({
  background: hexColorSchema.optional(),
  bottomSpacing: nonNegativeIntegerSchema.optional(),
  border: hexColorSchema.optional(),
  foreground: hexColorSchema.optional(),
  icon: z.string().optional(),
  separator: z.boolean().optional(),
  topSpacing: nonNegativeIntegerSchema.optional(),
});

const codeBlockThemeOverrideSchema = z.strictObject({
  background: hexColorSchema.optional(),
  border: hexColorSchema.optional(),
  borderVisible: z.boolean().optional(),
  bottomSpacing: nonNegativeIntegerSchema.optional(),
  headerBackground: hexColorSchema.optional(),
  label: hexColorSchema.optional(),
  language: hexColorSchema.optional(),
  separator: z.boolean().optional(),
  topSpacing: nonNegativeIntegerSchema.optional(),
});

const linkThemeOverrideSchema = z.strictObject({
  foreground: hexColorSchema.optional(),
  icon: z.string().optional(),
});

const calloutThemeOverrideSchema = z.strictObject({
  background: hexColorSchema.optional(),
  badge: z.string().optional(),
  border: hexColorSchema.optional(),
  foreground: hexColorSchema.optional(),
});

const themeOverrideSchema = z.strictObject({
  chrome: z
    .strictObject({
      activeMode: hexColorSchema.optional(),
      brand: hexColorSchema.optional(),
      controls: hexColorSchema.optional(),
      copied: hexColorSchema.optional(),
      fileName: hexColorSchema.optional(),
      headerBackground: hexColorSchema.optional(),
      helpBackground: hexColorSchema.optional(),
      inactiveMode: hexColorSchema.optional(),
      lineNumber: hexColorSchema.optional(),
    })
    .optional(),
  extends: z.string().optional(),
  markdown: z
    .strictObject({
      blockquote: z
        .strictObject({
          border: hexColorSchema.optional(),
          foreground: hexColorSchema.optional(),
          marker: z.string().optional(),
        })
        .optional(),
      callout: z
        .strictObject({
          caution: calloutThemeOverrideSchema.optional(),
          danger: calloutThemeOverrideSchema.optional(),
          example: calloutThemeOverrideSchema.optional(),
          important: calloutThemeOverrideSchema.optional(),
          info: calloutThemeOverrideSchema.optional(),
          note: calloutThemeOverrideSchema.optional(),
          question: calloutThemeOverrideSchema.optional(),
          quote: calloutThemeOverrideSchema.optional(),
          success: calloutThemeOverrideSchema.optional(),
          tip: calloutThemeOverrideSchema.optional(),
          warning: calloutThemeOverrideSchema.optional(),
        })
        .optional(),
      codeBlock: z.strictObject(codeBlockThemeOverrideSchema.shape).optional(),
      heading: z
        .strictObject({
          h1: headingThemeOverrideSchema.optional(),
          h2: headingThemeOverrideSchema.optional(),
          h3: headingThemeOverrideSchema.optional(),
          h4: headingThemeOverrideSchema.optional(),
          h5: headingThemeOverrideSchema.optional(),
          h6: headingThemeOverrideSchema.optional(),
        })
        .optional(),
      horizontalRule: z
        .strictObject({
          foreground: hexColorSchema.optional(),
        })
        .optional(),
      inlineCode: z
        .strictObject({
          background: hexColorSchema.optional(),
          foreground: hexColorSchema.optional(),
        })
        .optional(),
      links: z
        .strictObject({
          anchor: linkThemeOverrideSchema.optional(),
          default: linkThemeOverrideSchema.optional(),
          github: linkThemeOverrideSchema.optional(),
          mail: linkThemeOverrideSchema.optional(),
          path: linkThemeOverrideSchema.optional(),
          web: linkThemeOverrideSchema.optional(),
        })
        .optional(),
      list: z
        .strictObject({
          bullet: z.string().optional(),
          bulletForeground: hexColorSchema.optional(),
          taskChecked: hexColorSchema.optional(),
          taskUnchecked: hexColorSchema.optional(),
        })
        .optional(),
      table: z
        .strictObject({
          background: hexColorSchema.optional(),
          border: hexColorSchema.optional(),
          centerAlignIndicator: z.string().optional(),
          headerForeground: hexColorSchema.optional(),
          leftAlignIndicator: z.string().optional(),
          rightAlignIndicator: z.string().optional(),
          rowForeground: hexColorSchema.optional(),
          separatorForeground: hexColorSchema.optional(),
        })
        .optional(),
    })
    .optional(),
  name: z.string().optional(),
  syntax: z
    .strictObject({
      comment: hexColorSchema.optional(),
      default: hexColorSchema.optional(),
      function: hexColorSchema.optional(),
      keyword: hexColorSchema.optional(),
      number: hexColorSchema.optional(),
      operator: hexColorSchema.optional(),
      property: hexColorSchema.optional(),
      punctuation: hexColorSchema.optional(),
      string: hexColorSchema.optional(),
      stringEscape: hexColorSchema.optional(),
      tag: hexColorSchema.optional(),
      tagAttribute: hexColorSchema.optional(),
      tagDelimiter: hexColorSchema.optional(),
      type: hexColorSchema.optional(),
      variable: hexColorSchema.optional(),
      variableBuiltin: hexColorSchema.optional(),
    })
    .optional(),
});

export type ThemeOverride = z.infer<typeof themeOverrideSchema>;

function formatThemeValidationError(filePath: string, error: z.ZodError): string {
  const pretty = z.prettifyError(error).trim();
  return `Invalid theme config in ${filePath}\n${pretty}`;
}

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePlainObjects(base: PlainObject, patch: PlainObject): PlainObject {
  const result = structuredClone(base);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    const current = result[key];
    result[key] =
      isPlainObject(current) && isPlainObject(value) ? mergePlainObjects(current, value) : value;
  }

  return result;
}

function deepMerge<T extends object>(base: T, patch: DeepPartial<T>): T {
  return mergePlainObjects(base as PlainObject, patch as PlainObject) as T;
}

function calloutTheme(
  badge: string,
  foreground: string,
  border: string,
  background: string,
): CalloutTheme {
  return { badge, foreground, border, background };
}

function codeBlockTheme(
  background: string,
  border: string,
  headerBackground: string,
  label: string,
  language: string,
): CodeBlockTheme {
  return {
    background,
    border,
    borderVisible: true,
    bottomSpacing: 0,
    headerBackground,
    label,
    language,
    separator: true,
    topSpacing: 0,
  };
}

function headingTheme(
  icon: string,
  foreground: string,
  border: string,
  background: string,
): HeadingTheme {
  return {
    background,
    bottomSpacing: 0,
    border,
    foreground,
    icon,
    separator: true,
    topSpacing: 0,
  };
}

function linkTheme(icon: string, foreground: string): LinkTheme {
  return { icon, foreground };
}

const tokyoNight: InkTheme = {
  name: "tokyo-night",
  chrome: {
    activeMode: "#7aa2f7",
    brand: "#7aa2f7",
    controls: "#565f89",
    copied: "#9ece6a",
    fileName: "#565f89",
    headerBackground: "#1a1a2e",
    helpBackground: "#1f2335",
    inactiveMode: "#565f89",
    lineNumber: "#565f89",
  },
  markdown: {
    blockquote: {
      border: "#7aa2f7",
      foreground: "#7aa2f7",
      marker: ">",
    },
    callout: {
      caution: calloutTheme("[CAUTION]", "#e0af68", "#e0af68", "#2a1f14"),
      danger: calloutTheme("[DANGER]", "#f7768e", "#f7768e", "#2a1a22"),
      example: calloutTheme("[EXAMPLE]", "#bb9af7", "#bb9af7", "#221b2f"),
      important: calloutTheme("[IMPORTANT]", "#bb9af7", "#bb9af7", "#221b2f"),
      info: calloutTheme("[INFO]", "#2ac3de", "#2ac3de", "#16232a"),
      note: calloutTheme("[NOTE]", "#7aa2f7", "#7aa2f7", "#1f2335"),
      question: calloutTheme("[QUESTION]", "#e0af68", "#e0af68", "#2a2414"),
      quote: calloutTheme("[QUOTE]", "#7dcfff", "#7dcfff", "#162028"),
      success: calloutTheme("[SUCCESS]", "#9ece6a", "#9ece6a", "#18251c"),
      tip: calloutTheme("[TIP]", "#9ece6a", "#9ece6a", "#18251c"),
      warning: calloutTheme("[WARNING]", "#e0af68", "#e0af68", "#2a2414"),
    },
    codeBlock: codeBlockTheme("#1f2335", "#414868", "#16161e", "#7aa2f7", "#565f89"),
    heading: {
      h1: headingTheme("#", "#7aa2f7", "#7aa2f7", "#1f2335"),
      h2: headingTheme("##", "#2ac3de", "#2ac3de", "#1a1b26"),
      h3: headingTheme("###", "#9ece6a", "#9ece6a", "#16161e"),
      h4: headingTheme("####", "#e0af68", "#e0af68", "#16161e"),
      h5: headingTheme("#####", "#bb9af7", "#bb9af7", "#16161e"),
      h6: headingTheme("######", "#c0caf5", "#565f89", "#16161e"),
    },
    horizontalRule: {
      foreground: "#565f89",
    },
    inlineCode: {
      background: "#1f2335",
      foreground: "#e0af68",
    },
    links: {
      anchor: linkTheme("#", "#bb9af7"),
      default: linkTheme("->", "#7dcfff"),
      github: linkTheme("gh", "#7aa2f7"),
      mail: linkTheme("@", "#9ece6a"),
      path: linkTheme("./", "#2ac3de"),
      web: linkTheme("->", "#7dcfff"),
    },
    list: {
      bullet: "•",
      bulletForeground: "#7aa2f7",
      taskChecked: "#9ece6a",
      taskUnchecked: "#e0af68",
    },
    table: {
      background: "#16161e",
      border: "#414868",
      centerAlignIndicator: "=",
      headerForeground: "#7aa2f7",
      leftAlignIndicator: "<",
      rightAlignIndicator: ">",
      rowForeground: "#c0caf5",
      separatorForeground: "#565f89",
    },
  },
  syntax: {
    comment: "#565f89",
    default: "#c0caf5",
    function: "#e0af68",
    keyword: "#7aa2f7",
    number: "#ff9e64",
    operator: "#bb9af7",
    property: "#c0caf5",
    punctuation: "#a9b1d6",
    string: "#9ece6a",
    stringEscape: "#bb9af7",
    tag: "#7aa2f7",
    tagAttribute: "#e0af68",
    tagDelimiter: "#a9b1d6",
    type: "#2ac3de",
    variable: "#c0caf5",
    variableBuiltin: "#2ac3de",
  },
};

const nord: InkTheme = {
  name: "nord",
  chrome: {
    activeMode: "#88c0d0",
    brand: "#88c0d0",
    controls: "#81a1c1",
    copied: "#a3be8c",
    fileName: "#81a1c1",
    headerBackground: "#2e3440",
    helpBackground: "#3b4252",
    inactiveMode: "#81a1c1",
    lineNumber: "#81a1c1",
  },
  markdown: {
    blockquote: {
      border: "#88c0d0",
      foreground: "#88c0d0",
      marker: ">",
    },
    callout: {
      caution: calloutTheme("[CAUTION]", "#ebcb8b", "#ebcb8b", "#3b342b"),
      danger: calloutTheme("[DANGER]", "#bf616a", "#bf616a", "#3d2d31"),
      example: calloutTheme("[EXAMPLE]", "#b48ead", "#b48ead", "#382f3b"),
      important: calloutTheme("[IMPORTANT]", "#b48ead", "#b48ead", "#382f3b"),
      info: calloutTheme("[INFO]", "#88c0d0", "#88c0d0", "#2b3940"),
      note: calloutTheme("[NOTE]", "#81a1c1", "#81a1c1", "#303b4a"),
      question: calloutTheme("[QUESTION]", "#ebcb8b", "#ebcb8b", "#3b342b"),
      quote: calloutTheme("[QUOTE]", "#8fbcbb", "#8fbcbb", "#2b3b3b"),
      success: calloutTheme("[SUCCESS]", "#a3be8c", "#a3be8c", "#2f3a30"),
      tip: calloutTheme("[TIP]", "#a3be8c", "#a3be8c", "#2f3a30"),
      warning: calloutTheme("[WARNING]", "#d08770", "#d08770", "#3c312c"),
    },
    codeBlock: codeBlockTheme("#3b4252", "#4c566a", "#2e3440", "#88c0d0", "#81a1c1"),
    heading: {
      h1: headingTheme("#", "#88c0d0", "#88c0d0", "#3b4252"),
      h2: headingTheme("##", "#8fbcbb", "#8fbcbb", "#2e3440"),
      h3: headingTheme("###", "#a3be8c", "#a3be8c", "#2e3440"),
      h4: headingTheme("####", "#ebcb8b", "#ebcb8b", "#2e3440"),
      h5: headingTheme("#####", "#b48ead", "#b48ead", "#2e3440"),
      h6: headingTheme("######", "#d8dee9", "#4c566a", "#2e3440"),
    },
    horizontalRule: {
      foreground: "#4c566a",
    },
    inlineCode: {
      background: "#3b4252",
      foreground: "#ebcb8b",
    },
    links: {
      anchor: linkTheme("#", "#b48ead"),
      default: linkTheme("->", "#8fbcbb"),
      github: linkTheme("gh", "#88c0d0"),
      mail: linkTheme("@", "#a3be8c"),
      path: linkTheme("./", "#81a1c1"),
      web: linkTheme("->", "#8fbcbb"),
    },
    list: {
      bullet: "•",
      bulletForeground: "#88c0d0",
      taskChecked: "#a3be8c",
      taskUnchecked: "#ebcb8b",
    },
    table: {
      background: "#2e3440",
      border: "#4c566a",
      centerAlignIndicator: "=",
      headerForeground: "#88c0d0",
      leftAlignIndicator: "<",
      rightAlignIndicator: ">",
      rowForeground: "#d8dee9",
      separatorForeground: "#81a1c1",
    },
  },
  syntax: {
    comment: "#616e88",
    default: "#d8dee9",
    function: "#88c0d0",
    keyword: "#81a1c1",
    number: "#d08770",
    operator: "#b48ead",
    property: "#d8dee9",
    punctuation: "#81a1c1",
    string: "#a3be8c",
    stringEscape: "#ebcb8b",
    tag: "#81a1c1",
    tagAttribute: "#8fbcbb",
    tagDelimiter: "#81a1c1",
    type: "#8fbcbb",
    variable: "#d8dee9",
    variableBuiltin: "#88c0d0",
  },
};

const solarizedDark: InkTheme = {
  name: "solarized-dark",
  chrome: {
    activeMode: "#268bd2",
    brand: "#268bd2",
    controls: "#586e75",
    copied: "#859900",
    fileName: "#586e75",
    headerBackground: "#073642",
    helpBackground: "#002b36",
    inactiveMode: "#586e75",
    lineNumber: "#586e75",
  },
  markdown: {
    blockquote: {
      border: "#268bd2",
      foreground: "#268bd2",
      marker: ">",
    },
    callout: {
      caution: calloutTheme("[CAUTION]", "#b58900", "#b58900", "#3c3300"),
      danger: calloutTheme("[DANGER]", "#dc322f", "#dc322f", "#3b2020"),
      example: calloutTheme("[EXAMPLE]", "#6c71c4", "#6c71c4", "#2f2c46"),
      important: calloutTheme("[IMPORTANT]", "#6c71c4", "#6c71c4", "#2f2c46"),
      info: calloutTheme("[INFO]", "#2aa198", "#2aa198", "#143a3a"),
      note: calloutTheme("[NOTE]", "#268bd2", "#268bd2", "#143447"),
      question: calloutTheme("[QUESTION]", "#cb4b16", "#cb4b16", "#3d2b20"),
      quote: calloutTheme("[QUOTE]", "#2aa198", "#2aa198", "#143a3a"),
      success: calloutTheme("[SUCCESS]", "#859900", "#859900", "#24340d"),
      tip: calloutTheme("[TIP]", "#859900", "#859900", "#24340d"),
      warning: calloutTheme("[WARNING]", "#b58900", "#b58900", "#3c3300"),
    },
    codeBlock: codeBlockTheme("#002b36", "#586e75", "#073642", "#268bd2", "#586e75"),
    heading: {
      h1: headingTheme("#", "#268bd2", "#268bd2", "#002b36"),
      h2: headingTheme("##", "#2aa198", "#2aa198", "#073642"),
      h3: headingTheme("###", "#859900", "#859900", "#073642"),
      h4: headingTheme("####", "#b58900", "#b58900", "#073642"),
      h5: headingTheme("#####", "#6c71c4", "#6c71c4", "#073642"),
      h6: headingTheme("######", "#93a1a1", "#586e75", "#073642"),
    },
    horizontalRule: {
      foreground: "#586e75",
    },
    inlineCode: {
      background: "#073642",
      foreground: "#b58900",
    },
    links: {
      anchor: linkTheme("#", "#6c71c4"),
      default: linkTheme("->", "#2aa198"),
      github: linkTheme("gh", "#268bd2"),
      mail: linkTheme("@", "#859900"),
      path: linkTheme("./", "#2aa198"),
      web: linkTheme("->", "#2aa198"),
    },
    list: {
      bullet: "•",
      bulletForeground: "#268bd2",
      taskChecked: "#859900",
      taskUnchecked: "#b58900",
    },
    table: {
      background: "#002b36",
      border: "#586e75",
      centerAlignIndicator: "=",
      headerForeground: "#268bd2",
      leftAlignIndicator: "<",
      rightAlignIndicator: ">",
      rowForeground: "#93a1a1",
      separatorForeground: "#586e75",
    },
  },
  syntax: {
    comment: "#586e75",
    default: "#93a1a1",
    function: "#2aa198",
    keyword: "#268bd2",
    number: "#cb4b16",
    operator: "#6c71c4",
    property: "#93a1a1",
    punctuation: "#839496",
    string: "#859900",
    stringEscape: "#b58900",
    tag: "#268bd2",
    tagAttribute: "#2aa198",
    tagDelimiter: "#839496",
    type: "#2aa198",
    variable: "#93a1a1",
    variableBuiltin: "#2aa198",
  },
};

const embeddedThemes = [tokyoNight, nord, solarizedDark] satisfies readonly InkTheme[];

const embeddedThemeMap = new Map<string, InkTheme>(
  embeddedThemes.map((theme) => [theme.name, structuredClone(theme)]),
);

export const defaultThemeName = tokyoNight.name;
export const defaultTheme = structuredClone(tokyoNight);

export function getEmbeddedThemes(): InkTheme[] {
  return embeddedThemes.map((theme) => structuredClone(theme));
}

export function getEmbeddedTheme(name: string): InkTheme | undefined {
  const theme = embeddedThemeMap.get(name);
  return theme ? structuredClone(theme) : undefined;
}

export function getDefaultThemesDir(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configHome, "inktty", "themes");
}

export function applyThemeOverride(
  baseTheme: InkTheme,
  override: ThemeOverride,
  name?: string,
): InkTheme {
  const { extends: _extends, name: _name, ...patch } = override;
  const mergedTheme = deepMerge(baseTheme, patch);

  return {
    ...mergedTheme,
    name: name ?? override.name ?? baseTheme.name,
  };
}

async function defaultReadDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function defaultReadTextFile(filePath: string): Promise<string> {
  return Bun.file(filePath).text();
}

async function loadThemeSources({
  readDir = defaultReadDir,
  readTextFile = defaultReadTextFile,
  themesDir = getDefaultThemesDir(),
}: ThemeLoadOptions): Promise<Map<string, ThemeSource>> {
  const entries = await readDir(themesDir);
  const sources = new Map<string, ThemeSource>();

  for (const entry of [...entries].sort()) {
    if (!entry.endsWith(".toml")) {
      continue;
    }

    const filePath = join(themesDir, entry);
    const rawTheme = Bun.TOML.parse(await readTextFile(filePath));
    const validated = themeOverrideSchema.safeParse(rawTheme);

    if (!validated.success) {
      throw new Error(formatThemeValidationError(filePath, validated.error));
    }

    const parsed = validated.data;
    const name = parsed.name ?? basename(entry, ".toml");

    sources.set(name, {
      name,
      override: parsed,
    });
  }

  return sources;
}

export async function loadAvailableThemes(options: ThemeLoadOptions = {}): Promise<InkTheme[]> {
  const sources = await loadThemeSources(options);
  const resolvedThemes = new Map<string, InkTheme>(
    getEmbeddedThemes().map((theme) => [theme.name, theme]),
  );
  const resolving = new Set<string>();

  function resolveTheme(name: string): InkTheme {
    const existingTheme = resolvedThemes.get(name);
    const source = sources.get(name);

    if (existingTheme && !source) {
      return existingTheme;
    }

    if (!source) {
      return resolvedThemes.get(defaultThemeName) ?? defaultTheme;
    }

    if (resolving.has(name)) {
      throw new Error(`Theme inheritance cycle detected for '${name}'`);
    }

    resolving.add(name);

    const baseName =
      source.override.extends ?? (embeddedThemeMap.has(name) ? name : defaultThemeName);
    const baseTheme =
      name === baseName && embeddedThemeMap.has(name)
        ? (getEmbeddedTheme(name) ?? defaultTheme)
        : resolveTheme(baseName);
    const mergedTheme = applyThemeOverride(baseTheme, source.override, source.name);

    resolvedThemes.set(name, mergedTheme);
    resolving.delete(name);
    return mergedTheme;
  }

  for (const name of sources.keys()) {
    resolveTheme(name);
  }

  return [...resolvedThemes.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveThemeByName(themes: InkTheme[], themeName?: string): InkTheme {
  if (themeName) {
    const matchingTheme = themes.find((theme) => theme.name === themeName);

    if (matchingTheme) {
      return matchingTheme;
    }
  }

  return themes.find((theme) => theme.name === defaultThemeName) ?? themes[0] ?? defaultTheme;
}

export function hasTheme(themes: InkTheme[], themeName: string): boolean {
  return themes.some((theme) => theme.name === themeName);
}

export function listThemeNames(themes: InkTheme[]): string[] {
  return [...themes].map((theme) => theme.name).sort();
}
