"use client";

import React, { useState } from "react";
import { Popover, Button, Select, Badge, Tooltip } from "antd";
import {
  SwapOutlined,
  PlusOutlined,
  CloseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { FIELDS, FIELD_LABELS, newId, type SortKey, type UserField } from "./filter-sort-types";

type Props = {
  sortKeys: SortKey[];
  onApply: (sortKeys: SortKey[]) => void;
};

function newSortKey(): SortKey {
  return { id: newId("s"), field: "email", direction: "asc" };
}

// Multi-sort builder — Popover + custom addable/removable/reorderable rows,
// row order = evaluation priority (DESIGN_SYSTEM.md §4/§7,
// SortPanelOpen.dc.html). Deliberately not Table's own single-column sorter.
// ponytail: reorder is up/down buttons, not real drag-and-drop — no DnD lib
// is installed for this UI-only pass; the drag-handle icon is shown for
// visual fidelity to the mock but isn't wired to pointer events. Swap in
// a proper DnD (e.g. dnd-kit) if this needs real dragging later.
export default function SortPopoverButton({ sortKeys, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SortKey[]>(sortKeys);

  const openPanel = (next: boolean) => {
    if (next) setDraft(sortKeys);
    setOpen(next);
  };

  const updateRow = (id: string, patch: Partial<SortKey>) =>
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setDraft((rows) => rows.filter((r) => r.id !== id));
  const addRow = () => setDraft((rows) => [...rows, newSortKey()]);

  const move = (index: number, dir: -1 | 1) =>
    setDraft((rows) => {
      const next = [...rows];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const clearAll = () => {
    setDraft([]);
    onApply([]);
    setOpen(false);
  };

  const panel = (
    <div style={{ width: 400 }}>
      {draft.map((row, i) => (
        <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined style={{ fontSize: 10 }} />}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label="Move up"
              style={{ height: 14, width: 20 }}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined style={{ fontSize: 10 }} />}
              disabled={i === draft.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Move down"
              style={{ height: 14, width: 20 }}
            />
          </div>
          <HolderOutlined style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "var(--color-primary-tint)",
              color: "var(--color-primary-text)",
              fontSize: 10.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <Select
            style={{ flex: 1 }}
            value={row.field}
            options={FIELDS.map((f) => ({ value: f, label: FIELD_LABELS[f] }))}
            onChange={(field: UserField) => updateRow(row.id, { field })}
          />
          <Tooltip title="Ascending">
            <Button
              type={row.direction === "asc" ? "default" : "text"}
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => updateRow(row.id, { direction: "asc" })}
              style={
                row.direction === "asc"
                  ? { background: "var(--color-primary-tint)", color: "var(--color-primary-text)" }
                  : undefined
              }
            />
          </Tooltip>
          <Tooltip title="Descending">
            <Button
              type={row.direction === "desc" ? "default" : "text"}
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => updateRow(row.id, { direction: "desc" })}
              style={
                row.direction === "desc"
                  ? { background: "var(--color-primary-tint)", color: "var(--color-primary-text)" }
                  : undefined
              }
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => removeRow(row.id)}
            aria-label="Remove sort key"
          />
        </div>
      ))}
      <Button
        type="link"
        size="small"
        icon={<PlusOutlined />}
        onClick={addRow}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Add sort
      </Button>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid var(--color-border)",
          paddingTop: 10,
        }}
      >
        <Button type="link" size="small" onClick={clearAll} style={{ paddingLeft: 0 }}>
          Clear all
        </Button>
        <Button type="primary" size="small" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );

  return (
    <Popover content={panel} trigger="click" open={open} onOpenChange={openPanel} placement="bottomLeft">
      <Badge count={sortKeys.length} size="small" offset={[-4, 4]}>
        <Button
          icon={<SwapOutlined rotate={90} />}
          style={
            open
              ? {
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary-text)",
                  background: "var(--color-primary-tint)",
                }
              : undefined
          }
        >
          Sort
        </Button>
      </Badge>
    </Popover>
  );
}
