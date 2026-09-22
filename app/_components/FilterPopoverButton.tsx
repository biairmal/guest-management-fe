"use client";

import React, { useState } from "react";
import { Popover, Button, Select, Input, Badge } from "antd";
import { FilterOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
import {
  OPERATOR_LABELS,
  newId,
  type FilterCondition,
  type FilterField,
} from "../_lib/list-query";

type Props = {
  fields: FilterField[]; // the page's filterable fields and their allowed operators
  conditions: FilterCondition[];
  onApply: (conditions: FilterCondition[]) => void;
};

function conditionFor(field: FilterField): Omit<FilterCondition, "id"> {
  return { field: field.key, operator: field.operators[0], value: "" };
}

// Filter builder — Popover + custom addable/removable condition rows,
// implicitly ANDed ("Where" / "And"), over whatever fields the page passes
// (DESIGN_SYSTEM.md §4/§7, FilterPanelOpen.dc.html). Deliberately not
// Table's own per-column filter dropdown — see §4's rationale. Each field
// appears in at most one row, since list endpoints take one value per field.
export default function FilterPopoverButton({ fields, conditions, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterCondition[]>(conditions);

  const fieldOf = (key: string) => fields.find((f) => f.key === key) ?? fields[0];
  const unusedFields = fields.filter((f) => !draft.some((r) => r.field === f.key));

  const openPanel = (next: boolean) => {
    if (next) setDraft(conditions);
    setOpen(next);
  };

  const updateRow = (id: string, patch: Partial<FilterCondition>) =>
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setDraft((rows) => rows.filter((r) => r.id !== id));
  const addRow = () =>
    setDraft((rows) => [...rows, { id: newId("f"), ...conditionFor(unusedFields[0]) }]);

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
    const { options } = fieldOf(row.field);
    if (options) {
      return (
        <Select
          style={{ flex: 1 }}
          value={row.value || undefined}
          placeholder="Value"
          options={options}
          onChange={(v) => updateRow(row.id, { value: v })}
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
            options={fields.map((f) => ({
              value: f.key,
              label: f.label,
              disabled: f.key !== row.field && draft.some((r) => r.field === f.key),
            }))}
            onChange={(key: string) => updateRow(row.id, conditionFor(fieldOf(key)))}
          />
          <Select
            style={{ width: 110 }}
            value={row.operator}
            disabled={fieldOf(row.field).operators.length === 1}
            options={fieldOf(row.field).operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
            onChange={(operator) => updateRow(row.id, { operator })}
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
        disabled={unusedFields.length === 0}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Add condition
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
