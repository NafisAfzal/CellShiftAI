"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch { /* Theme still works when persistence is unavailable. */ }
    setTheme(next);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const isDark = context.theme === "dark";
  return <button type="button" className="icon-button theme-toggle" onClick={context.toggle} aria-label={`Switch to ${isDark ? "light" : "dark"} theme`} title={`Switch to ${isDark ? "light" : "dark"} theme`}>{isDark ? <Sun size={17} /> : <Moon size={17} />}<span>{isDark ? "Light" : "Dark"}</span></button>;
}
