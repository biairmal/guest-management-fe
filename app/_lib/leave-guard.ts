"use client";

import { useEffect } from "react";

// One page at a time can hold unsaved work. While it does, in-app navigation
// that goes through confirmLeave (AppShell's sidebar, the page's own back/
// cancel/breadcrumb) asks first, and closing or reloading the tab gets the
// browser's native prompt.
// ponytail: browser back/forward (popstate) isn't intercepted — the App
// Router has no navigation-blocking API; add a history guard if it matters.

type Ask = () => Promise<boolean>;
let ask: Ask | null = null;

export function confirmLeave(): Promise<boolean> {
  return ask ? ask() : Promise.resolve(true);
}

export function useLeaveGuard(dirty: boolean, askUser: Ask) {
  useEffect(() => {
    if (!dirty) return;
    ask = askUser;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      if (ask === askUser) ask = null;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, askUser]);
}
