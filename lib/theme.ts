export type Theme = "light" | "dark";
export const THEME_COOKIE = "cellshift-theme";
export function resolveTheme(value: unknown): Theme { return value === "light" ? "light" : "dark"; }
