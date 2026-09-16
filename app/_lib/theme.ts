// Light/dark theme tokens — DESIGN_SYSTEM.md §1 ("Direction D — Full Dark
// Elevated"). Canonical light/dark hex pairs live here (consumed by antd's
// ConfigProvider) and are mirrored as CSS custom properties in globals.css
// (consumed by our own inline styles/Tailwind classes) — antd's
// light/dark algorithm has no concept of the app's 3-step canvas/chrome/pop
// elevation system, so it's layered on top via component-level token
// overrides below, not derived from the algorithm.
import { theme as antdTheme, type ThemeConfig } from "antd";

export type ThemeMode = "light" | "dark";

export const PALETTE = {
  light: {
    canvas: "#EEEFF5",
    chrome: "#F8F8FC",
    pop: "#FFFFFF",
    border: "#E2E2EC",
    text: "#17171F",
    textMuted: "#6B6B78",
    primary: "#4F46E5",
    primaryText: "#4338CA",
    primaryTint: "rgba(79,70,229,0.08)",
    accent: "#0F766E",
    accentTint: "rgba(15,118,110,0.10)",
    danger: "#FF4D4F",
    warning: "#D48806",
    shadow: "0 12px 28px rgba(16,24,40,0.14)",
    navHoverBg: "#F0F0F5",
  },
  dark: {
    canvas: "#111116",
    chrome: "#1A1A22",
    pop: "#212129",
    border: "#2A2A34",
    text: "#F1F1F5",
    textMuted: "#93939F",
    primary: "#4F46E5",
    primaryText: "#A5B4FC",
    primaryTint: "rgba(129,140,248,0.16)",
    accent: "#2DD4BF",
    accentTint: "rgba(45,212,191,0.14)",
    danger: "#FF7875",
    warning: "#E8B339",
    shadow: "0 12px 28px rgba(0,0,0,0.45)",
    navHoverBg: "rgba(255,255,255,0.04)",
  },
} as const;

export function antdThemeConfig(mode: ThemeMode): ThemeConfig {
  const p = PALETTE[mode];
  return {
    algorithm: mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorInfo: p.primary,
      colorLink: p.primary,
      colorBgLayout: p.canvas,
      colorBgContainer: p.chrome,
      // Floating/overlay surfaces (Modal, Popover, Dropdown, Select popup) —
      // ComponentsSheet.dc.html's Modal legend *and* UserListDark's concrete
      // Filter/Sort popover both agree: light floating surface = Pop, dark
      // floating surface = Chrome (not Pop) — an asymmetric pair, not a
      // single hex reused across themes. See DESIGN_SYSTEM.md §1's note that
      // pairs don't always share a role across themes.
      colorBgElevated: mode === "dark" ? p.chrome : p.pop,
      colorBorder: p.border,
      colorBorderSecondary: p.border,
      colorText: p.text,
      colorTextSecondary: p.textMuted,
      colorTextTertiary: p.textMuted,
      colorError: p.danger,
      colorWarning: p.warning,
      fontFamily:
        "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      borderRadius: 8,
    },
    components: {
      Layout: {
        headerBg: p.chrome,
        bodyBg: p.canvas,
        footerBg: p.chrome,
        siderBg: p.chrome,
        lightSiderBg: p.chrome,
        headerColor: p.text,
      },
      Menu: {
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        itemColor: p.textMuted,
        itemHoverColor: p.text,
        itemHoverBg: p.navHoverBg,
        itemSelectedBg: p.primaryTint,
        itemSelectedColor: p.primaryText,
      },
      Table: {
        headerBg: p.pop,
        headerColor: p.textMuted,
      },
      Input: { colorBgContainer: p.pop },
      Select: { colorBgContainer: p.pop },
    },
  };
}
