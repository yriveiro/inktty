import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultTheme, type InkTheme, listThemeNames, resolveThemeByName } from "../../lib/theme";

interface ReaderThemeController {
  cycleTheme: (step: number) => void;
  theme: InkTheme;
  themeNames: string[];
}

export function useReaderTheme(
  themes: InkTheme[],
  initialThemeName?: string,
): ReaderThemeController {
  const availableThemes = useMemo(() => (themes.length > 0 ? themes : [defaultTheme]), [themes]);
  const themeNames = useMemo(() => listThemeNames(availableThemes), [availableThemes]);
  const [activeThemeName, setActiveThemeName] = useState(
    () => resolveThemeByName(availableThemes, initialThemeName).name,
  );
  const theme = useMemo(
    () => resolveThemeByName(availableThemes, activeThemeName),
    [activeThemeName, availableThemes],
  );

  useEffect(() => {
    setActiveThemeName(
      (currentThemeName) => resolveThemeByName(availableThemes, currentThemeName).name,
    );
  }, [availableThemes]);

  const cycleTheme = useCallback(
    (step: number): void => {
      if (themeNames.length < 2) {
        return;
      }

      setActiveThemeName((currentThemeName) => {
        const currentIndex = themeNames.indexOf(currentThemeName);
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + step + themeNames.length) % themeNames.length;

        return themeNames[nextIndex] ?? currentThemeName;
      });
    },
    [themeNames],
  );

  return {
    cycleTheme,
    theme,
    themeNames,
  };
}
