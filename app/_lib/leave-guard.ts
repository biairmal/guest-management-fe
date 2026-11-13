"use client";

import { useEffect } from "react";

// One page at a time can hold unsaved work. While it does, in-app navigation
// that goes through confirmLeave (AppShell's sidebar, the page's own back/
// cancel/breadcrumb) asks first, and closing or reloading the tab gets the
// browser's native prompt.
// ponytail: browser back/forward (popstate) isn't intercepted — the App
// Router has no navigation-blocking API; add a history guard if it matters.

// A stack, not a slot: a page can hold more than one draft (the event page's
// Details and Steps & tickets tabs), and saving one must not unguard the other.
// The most recent dirty draft asks.
type Ask = () => Promise<boolean>;
const asks: Ask[] = [];

export function confirmLeave(): Promise<boolean> {
  const ask = asks.at(-1);
  return ask ? ask() : Promise.resolve(true);
}

export function useLeaveGuard(dirty: boolean, askUser: Ask) {
  useEffect(() => {
    if (!dirty) return;
    asks.push(askUser);
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      asks.splice(asks.lastIndexOf(askUser), 1);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, askUser]);
}
