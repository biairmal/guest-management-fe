"use client";

import React from "react";
import { Grid } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export type SaveTone = "muted" | "dirty" | "error";

// The pinned bottom bar of every draft editor (category form, event details,
// event setup): a live status line on the left, the page's buttons on the right.
export default function SaveBar({ tone, status, children }: React.PropsWithChildren<{ tone: SaveTone; status: string }>) {
  const mobile = !Grid.useBreakpoint().md;
  return (
    <div
      role="region"
      aria-label="Save changes"
      className={`sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex gap-3 px-6 py-3 ${mobile ? "flex-col" : "items-center"}`}
      style={{ background: "var(--color-chrome)", borderTop: "1px solid var(--color-border)" }}
    >
      <span
        aria-live="polite"
        className="flex flex-1 items-center gap-2"
        style={{ color: tone === "error" ? "var(--color-danger-text)" : tone === "dirty" ? "var(--color-text)" : "var(--color-text-muted)" }}
      >
        {tone === "dirty" && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "var(--color-warning)" }} />}
        {tone === "error" && <ExclamationCircleOutlined aria-hidden />}
        {status}
      </span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

// Buttons in the bar go full height and share the width on mobile.
export const barButtonClass = (mobile: boolean) => (mobile ? "h-11 flex-1" : undefined);
