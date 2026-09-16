"use client";

import React from "react";
import Link from "next/link";
import { Button, Typography } from "antd";

// Public/unauthenticated layout shell — DESIGN_SYSTEM.md §6 /
// PublicLayoutShell.dc.html: navbar + content + footer, placeholder hero
// only. No marketing copy/sections beyond this are designed yet — content
// is a separate, later pass, not a gap in this one.
//
// ponytail: a plain `app/marketing/page.tsx` segment rather than a
// `(marketing)` route group — a route group adds no path segment, so
// `(marketing)/page.tsx` would collide with the existing `app/page.tsx` at
// `/` (the authenticated dashboard). Least-invasive alternative: its own
// `/marketing` segment, no route-group indirection, no change to existing
// routes.
export default function MarketingPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-canvas)", color: "var(--color-text)" }}
    >
      <header
        className="flex h-16 shrink-0 items-center justify-between px-8"
        style={{ background: "var(--color-chrome)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="text-lg font-semibold">Guest Management</div>
        <nav className="flex items-center gap-7 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <span>Product</span>
          <span>Pricing</span>
          <span>Docs</span>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm" style={{ color: "var(--color-text)" }}>
            Log in
          </Link>
          <Button type="primary">Sign up</Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-10">
        <div className="flex max-w-[640px] flex-col items-center gap-5 text-center">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-primary-text)", letterSpacing: "0.06em" }}
          >
            Placeholder — content not decided
          </span>
          <Typography.Title level={1} style={{ margin: 0 }}>
            Hero headline goes here
          </Typography.Title>
          <Typography.Text style={{ color: "var(--color-text-muted)", maxWidth: 480 }}>
            One line of placeholder subtext. Real marketing copy/sections are out of scope until
            product decides what this page is for.
          </Typography.Text>
          <div className="mt-1 flex gap-3">
            <Button type="primary" size="large">
              Primary CTA
            </Button>
            <Button size="large">Secondary</Button>
          </div>
          <div
            className="mt-4 flex h-[280px] w-[600px] items-center justify-center rounded-xl text-sm"
            style={{
              background: "var(--color-pop)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              boxShadow: "var(--shadow-elevation)",
            }}
          >
            [ hero image / product screenshot placeholder ]
          </div>
        </div>
      </main>

      <footer
        className="flex shrink-0 items-center justify-between px-8 py-5 text-sm"
        style={{
          background: "var(--color-chrome)",
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <span>© Guest Management</span>
        <div className="flex gap-5">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
}
