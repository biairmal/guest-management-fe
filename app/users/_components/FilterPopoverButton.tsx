"use client";

import React, { useState } from "react";
import { Popover, Button, Select, Input, DatePicker, Badge } from "antd";
import { FilterOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  FIELDS,
  FIELD_LABELS,
  FIELD_KIND,
  OPERATORS_FOR,
  newId,
  type FilterCondition,
  type UserField,
} from "./filter-sort-types";

type Props = {
  conditions: FilterCondition[];
  onApply: (conditions: FilterCondition[]) => void;
  roleOptions: { value: string; label: string }[];
};

function newCondition(): FilterCondition {
  return { id: newId("f"), field: "email", operator: "contains", value: "" };
}

// Filter builder — Popover + custom addable/removable condition rows,
// implicitly ANDed ("Where" / "And"), scoped to the 5 User List fields
// (DESIGN_SYSTEM.md §4/§7, FilterPanelOpen.dc.html). Deliberately not
// Table's own per-column filter dropdown — see §4's rationale.
export default function FilterPopoverButton({ conditions, onApply, roleOptions }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterCondition[]>(conditions);

  const openPanel = (next: boolean) => {
    if (next) setDraft(conditions);
    setOpen(next);
  };

  const updateRow = (id: string, patch: Partial<FilterCondition>) =>
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setDraft((rows) => rows.filter((r) => r.id !== id));
  const addRow = () => setDraft((rows) => [...rows, newCondition()]);

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const clearAll = () => {
    setDraft([]);
    onApply([]);
    setOpen(false);
  };

  const valueInput = (row: FilterCondition) => {
    const kind = FIELD_KIND[row.field];
    if (kind === "enum") {
      return (
        <Select
          style={{ flex: 1 }}
          value={row.value || undefined}
          placeholder="Value"
          options={roleOptions}
          onChange={(v) => updateRow(row.id, { value: v })}
        />
      );
    }
    if (kind === "date") {
      if (row.operator === "between") {
        return (
          <DatePicker.RangePicker
            style={{ flex: 1 }}
            value={[row.value ? dayjs(row.value) : null, row.value2 ? dayjs(row.value2) : null]}
            onChange={(vals) =>
              updateRow(row.id, {
                value: vals?.[0] ? vals[0].format("YYYY-MM-DD") : "",
                value2: vals?.[1] ? vals[1].format("YYYY-MM-DD") : "",
              })
            }
          />
        );
      }
      return (
        <DatePicker
          style={{ flex: 1 }}
          value={row.value ? dayjs(row.value) : null}
          onChange={(v) => updateRow(row.id, { value: v ? v.format("YYYY-MM-DD") : "" })}
        />
      );
    }
    return (
      <Input
        style={{ flex: 1 }}
        placeholder="Value"
        value={row.value}
        onChange={(e) => updateRow(row.id, { value: e.target.value })}
      />
    );
  };

  const panel = (
    <div style={{ width: 480 }}>
      {draft.map((row, i) => (
        <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 46, fontSize: 13, color: "var(--color-text-muted)", flexShrink: 0 }}>
            {i === 0 ? "Where" : "And"}
          </span>
          <Select
            style={{ width: 140 }}
            value={row.field}
            options={FIELDS.map((f) => ({ value: f, label: FIELD_LABELS[f] }))}
            onChange={(field: UserField) =>
              updateRow(row.id, {
                field,
                operator: OPERATORS_FOR[FIELD_KIND[field]][0].value,
                value: "",
                value2: undefined,
              })
            }
          />
          <Select
            style={{ width: 110 }}
            value={row.operator}
            options={OPERATORS_FOR[FIELD_KIND[row.field]]}
            onChange={(operator) => updateRow(row.id, { operator, value: "", value2: undefined })}
          />
          {valueInput(row)}
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => removeRow(row.id)}
            aria-label="Remove condition"
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
        Add condition
      </Button>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 10 }}>
        Field options: Email, Role, Created date, Updated date — operator set depends on
        field type (contains/is for Email/Role, &gt;/&lt;/between for the two date fields).
      </div>
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
      <Badge count={conditions.length} size="small" offset={[-4, 4]}>
        <Button
          icon={<FilterOutlined />}
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
          Filter
        </Button>
      </Badge>
    </Popover>
  );
}
