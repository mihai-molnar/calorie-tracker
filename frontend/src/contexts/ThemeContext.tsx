import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    const applyThemeColor = (dark: boolean) => {
      const color = dark ? "#030712" : "#f9fafb";
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((el) => {
        el.setAttribute("content", color);
      });
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const update = () => {
        setIsDark(media.matches);
        root.classList.toggle("dark", media.matches);
        applyThemeColor(media.matches);
      };
      update();
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    } else {
      const dark = theme === "dark";
      setIsDark(dark);
      root.classList.toggle("dark", dark);
      applyThemeColor(dark);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
