"use client";

import React from "react";
import { Breadcrumb, Button, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

export type Crumb = {
  label: string;
  onClick?: () => void; // omit on the last/current crumb (not a link)
};

type Props = {
  crumbs: Crumb[]; // last entry renders bold as the current page
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
};

// Reusable back-button + breadcrumb + title-row pattern (DESIGN_SYSTEM.md
// §3 / BreadcrumbPattern.dc.html) — every inner/detail page uses this one
// component instead of inventing its own back-nav header.
export default function PageHeader({ crumbs, title, onBack, actions }: Props) {
  // onClick (not href) so ancestor crumbs use Next.js client-side
  // navigation (router.push) instead of a full-page anchor reload.
  const items = crumbs.map((c, i) => ({
    title:
      i === crumbs.length - 1 ? (
        <b>{c.label}</b>
      ) : (
        <span style={{ cursor: "pointer" }} onClick={c.onClick}>
          {c.label}
        </span>
      ),
  }));

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <Button
          type="default"
          shape="circle"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          aria-label="Back"
        />
        <Breadcrumb items={items} style={{ fontSize: 13 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}
