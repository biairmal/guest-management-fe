"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import { antdThemeConfig, type ThemeMode } from "../_lib/theme";

const STORAGE_KEY = "gm-theme-mode";

const ThemeModeContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: "light",
  toggle: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

// Matches whatever the no-flash inline script (see layout.tsx's
// beforeInteractive next/script) already set on <html data-theme> before
// hydration — reading it back here means the client's first render agrees
// with the server-rendered default, no mismatch/flash.
function readInitialMode(): ThemeMode {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return "dark";
  }
  return "light";
}

export default function ThemeModeProvider({ children }: React.PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ponytail: localStorage can throw (private browsing quota etc.) —
      // theme just won't persist across reloads, not worth a fallback store.
    }
  }, [mode]);

  const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider theme={antdThemeConfig(mode)}>{children}</ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
