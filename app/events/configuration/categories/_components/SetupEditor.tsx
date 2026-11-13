"use client";

import React, { useState } from "react";
import { Button, Card, Checkbox, Collapse, Dropdown, Grid, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  RetweetOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import StepModal, { type StepValues } from "./StepModal";
import TicketTypeModal from "./TicketTypeModal";
import { MAX_ITEMS, newKey, type DraftIssues, type SetupDraft } from "../../../../_lib/categories";

type Props = {
  value: SetupDraft;
  // Functional update, so consecutive edits never read a stale draft.
  onChange: (next: (d: SetupDraft) => SetupDraft) => void;
  issues: Pick<DraftIssues, "steps" | "ticketTypes">;
  readOnly?: boolean;
  accessHint?: string;
};

// The workflow steps / ticket types / step access cards (design canvas "Event
// categories"), shared by a category's template set and an event's own setup.
// It only edits the draft; saving is the page's job.
export default function SetupEditor({ value: draft, onChange: edit, issues, readOnly = false, accessHint }: Props) {
  const mobile = !Grid.useBreakpoint().md;
  const [stepModal, setStepModal] = useState<{ key?: string } | null>(null);
  const [typeModal, setTypeModal] = useState<{ key?: string } | null>(null);
  const canEditThis = !readOnly;

  const move = (i: number, d: -1 | 1) =>
    edit((x) => {
      const steps = [...x.steps];
      [steps[i], steps[i + d]] = [steps[i + d], steps[i]];
      return { ...x, steps };
    });
  const removeStep = (key: string) =>
    edit((x) => ({
      ...x,
      steps: x.steps.filter((s) => s.key !== key),
      ticketTypes: x.ticketTypes.map((t) => ({ ...t, stepKeys: t.stepKeys.filter((k) => k !== key) })),
    }));
  const removeType = (key: string) => edit((x) => ({ ...x, ticketTypes: x.ticketTypes.filter((o) => o.key !== key) }));
  const saveStep = (v: StepValues) => {
    const key = stepModal?.key;
    edit((x) =>
      key
        ? { ...x, steps: x.steps.map((s) => (s.key === key ? { ...s, ...v } : s)) }
        : (() => {
            // A new step starts included in every ticket type (fail open).
            const step = { key: newKey("s"), ...v };
            return {
              ...x,
              steps: [...x.steps, step],
              ticketTypes: x.ticketTypes.map((t) => ({ ...t, stepKeys: [...t.stepKeys, step.key] })),
            };
          })(),
    );
    setStepModal(null);
  };
  const saveType = (name: string) => {
    const key = typeModal?.key;
    edit((x) =>
      key
        ? { ...x, ticketTypes: x.ticketTypes.map((t) => (t.key === key ? { ...t, name } : t)) }
        : { ...x, ticketTypes: [...x.ticketTypes, { key: newKey("t"), name, rules: {}, stepKeys: x.steps.map((s) => s.key) }] },
    );
    setTypeModal(null);
  };
  const toggle = (typeKey: string, stepKey: string) =>
    edit((x) => ({
      ...x,
      ticketTypes: x.ticketTypes.map((t) =>
        t.key !== typeKey
          ? t
          : { ...t, stepKeys: t.stepKeys.includes(stepKey) ? t.stepKeys.filter((k) => k !== stepKey) : [...t.stepKeys, stepKey] },
      ),
    }));

  const summary = (stepKeys: string[]) => {
    const n = draft.steps.filter((s) => stepKeys.includes(s.key)).length;
    if (!draft.steps.length) return "";
    return n === draft.steps.length ? `All ${n} steps` : `${n} of ${draft.steps.length} steps`;
  };
  const editingStep = draft.steps.find((s) => s.key === stepModal?.key);
  const editingType = draft.ticketTypes.find((t) => t.key === typeModal?.key);

  const iconButton = (label: string, icon: React.ReactNode, onClick: () => void, opts: { disabled?: boolean; danger?: boolean } = {}) => (
    <Button type="text" size="small" aria-label={label} icon={icon} onClick={onClick} {...opts} />
  );

  const stepsCard = (
    <Card
      title={<CardTitle label="Workflow steps" count={draft.steps.length} />}
      extra={
        canEditThis && !mobile && (
          <Button icon={<PlusOutlined />} onClick={() => setStepModal({})} disabled={draft.steps.length >= MAX_ITEMS}>
            Add step
          </Button>
        )
      }
      styles={{ body: { padding: "8px 12px 12px" } }}
    >
      {draft.steps.length === 0 ? (
        <EmptyHint title="No steps yet" text="Add the stations guests pass through, in order — for example Check-in, Photo booth, Checkout." />
      ) : (
        <>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, padding: "4px 8px 8px" }}>
            Guests go through these steps in this order.
          </Typography.Text>
          <ol className="m-0 list-none p-0">
            {draft.steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 px-2 py-2" style={{ borderBottom: "1px solid var(--color-border)", minHeight: 52 }}>
                <span
                  aria-label={`Step ${i + 1}`}
                  className="font-mono-tech flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ background: "var(--color-pop)", border: "1px solid var(--color-border)" }}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.allowsMultiple && (
                    <Tag icon={<RetweetOutlined />} bordered={false} style={{ background: "var(--color-primary-tint)", color: "var(--color-primary-text)" }}>
                      Repeatable
                    </Tag>
                  )}
                  {issues.steps[s.key] && <FieldMessage tone="error" text={issues.steps[s.key]} />}
                </div>
                {canEditThis &&
                  (mobile ? (
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          { key: "up", label: "Move up", icon: <ArrowUpOutlined />, disabled: i === 0, onClick: () => move(i, -1) },
                          { key: "down", label: "Move down", icon: <ArrowDownOutlined />, disabled: i === draft.steps.length - 1, onClick: () => move(i, 1) },
                          { key: "edit", label: "Edit", icon: <EditOutlined />, onClick: () => setStepModal({ key: s.key }) },
                          { key: "remove", label: "Remove", icon: <DeleteOutlined />, danger: true, onClick: () => removeStep(s.key) },
                        ],
                      }}
                    >
                      <Button type="text" aria-label={`Actions for ${s.name}`} icon={<MoreOutlined />} style={{ width: 44, height: 44 }} />
                    </Dropdown>
                  ) : (
                    <div className="flex gap-0.5">
                      {iconButton(`Move ${s.name} up`, <ArrowUpOutlined />, () => move(i, -1), { disabled: i === 0 })}
                      {iconButton(`Move ${s.name} down`, <ArrowDownOutlined />, () => move(i, 1), { disabled: i === draft.steps.length - 1 })}
                      {iconButton(`Edit ${s.name}`, <EditOutlined />, () => setStepModal({ key: s.key }))}
                      {iconButton(`Remove ${s.name}`, <DeleteOutlined />, () => removeStep(s.key), { danger: true })}
                    </div>
                  ))}
              </li>
            ))}
          </ol>
        </>
      )}
      {canEditThis && mobile && (
        <Button block icon={<PlusOutlined />} style={{ height: 44, marginTop: 12 }} onClick={() => setStepModal({})}>
          Add step
        </Button>
      )}
    </Card>
  );

  const typesCard = (
    <Card
      title={<CardTitle label="Ticket types" count={draft.ticketTypes.length} />}
      extra={
        canEditThis && !mobile && (
          <Button icon={<PlusOutlined />} onClick={() => setTypeModal({})} disabled={draft.ticketTypes.length >= MAX_ITEMS}>
            Add ticket type
          </Button>
        )
      }
      styles={{ body: { padding: "8px 12px 12px" } }}
    >
      {draft.ticketTypes.length === 0 ? (
        <EmptyHint title="No ticket types yet" text="Add the kinds of ticket guests can hold — for example VIP and Regular." />
      ) : (
        <>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, padding: "4px 8px 8px" }}>
            Each guest gets one ticket type. It decides which steps they can do.
          </Typography.Text>
          <ul className="m-0 list-none p-0">
            {draft.ticketTypes.map((t) => {
              const noSteps = draft.steps.length > 0 && !draft.steps.some((s) => t.stepKeys.includes(s.key));
              return (
                <li key={t.key} className="px-2 py-2" style={{ borderBottom: "1px solid var(--color-border)", minHeight: 52 }}>
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
                      <span className="font-medium">{t.name}</span>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {summary(t.stepKeys)}
                      </Typography.Text>
                    </div>
                    {canEditThis &&
                      (mobile ? (
                        <Dropdown
                          trigger={["click"]}
                          menu={{
                            items: [
                              { key: "rename", label: "Rename", icon: <EditOutlined />, onClick: () => setTypeModal({ key: t.key }) },
                              { key: "remove", label: "Remove", icon: <DeleteOutlined />, danger: true, onClick: () => removeType(t.key) },
                            ],
                          }}
                        >
                          <Button type="text" aria-label={`Actions for ${t.name}`} icon={<MoreOutlined />} style={{ width: 44, height: 44 }} />
                        </Dropdown>
                      ) : (
                        <div className="flex gap-0.5">
                          {iconButton(`Rename ${t.name}`, <EditOutlined />, () => setTypeModal({ key: t.key }))}
                          {iconButton(`Remove ${t.name}`, <DeleteOutlined />, () => removeType(t.key), { danger: true })}
                        </div>
                      ))}
                  </div>
                  {issues.ticketTypes[t.key] && <FieldMessage tone="error" text={issues.ticketTypes[t.key]} />}
                  {noSteps && <FieldMessage tone="warning" text={`Includes no steps. Guests with ${t.name} can’t check in anywhere.`} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {canEditThis && mobile && (
        <Button block icon={<PlusOutlined />} style={{ height: 44, marginTop: 12 }} onClick={() => setTypeModal({})}>
          Add ticket type
        </Button>
      )}
    </Card>
  );

  const accessColumns: TableColumnsType<(typeof draft.steps)[number] & { n: number }> = [
    {
      title: "Step",
      key: "step",
      fixed: "left",
      render: (_, s) => (
        <span className="flex items-center gap-2.5">
          <span className="font-mono-tech text-xs" style={{ color: "var(--color-text-muted)" }}>{s.n}</span>
          {s.name}
        </span>
      ),
    },
    ...draft.ticketTypes.map((t) => ({
      title: t.name,
      key: t.key,
      align: "center" as const,
      width: 140,
      render: (_: unknown, s: { key: string; name: string }) => (
        <Checkbox
          checked={t.stepKeys.includes(s.key)}
          disabled={!canEditThis}
          onChange={() => toggle(t.key, s.key)}
          aria-label={`${t.name} includes ${s.name}`}
        />
      ),
    })),
  ];

  const accessCard = (
    <Card title={<CardTitle label="Step access" />}>
      {draft.steps.length === 0 || draft.ticketTypes.length === 0 ? (
        <Typography.Text type="secondary">
          Add at least one step and one ticket type, then choose which steps each ticket type includes.
        </Typography.Text>
      ) : (
        <>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginBottom: 12 }}>
            {accessHint ?? "Tick the steps each ticket type includes. A new ticket type or step starts with everything ticked."}
          </Typography.Text>
          {mobile ? (
            <Collapse
              accordion
              items={draft.ticketTypes.map((t) => ({
                key: t.key,
                label: t.name,
                extra: <Typography.Text type="secondary" style={{ fontSize: 13 }}>{summary(t.stepKeys)}</Typography.Text>,
                children: draft.steps.map((s, i) => (
                  <label key={s.key} className="flex min-h-[44px] cursor-pointer items-center gap-3">
                    <Checkbox checked={t.stepKeys.includes(s.key)} disabled={!canEditThis} onChange={() => toggle(t.key, s.key)} />
                    <span className="font-mono-tech text-xs" style={{ color: "var(--color-text-muted)" }}>{i + 1}</span>
                    {s.name}
                  </label>
                )),
              }))}
            />
          ) : (
            <Table
              rowKey="key"
              size="small"
              bordered
              pagination={false}
              scroll={{ x: "max-content" }}
              columns={accessColumns}
              dataSource={draft.steps.map((s, i) => ({ ...s, n: i + 1 }))}
            />
          )}
        </>
      )}
    </Card>
  );

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
        {stepsCard}
        {typesCard}
      </div>
      {accessCard}

      <StepModal
        open={!!stepModal}
        initial={editingStep && { name: editingStep.name, allowsMultiple: editingStep.allowsMultiple }}
        position={draft.steps.length + 1}
        onCancel={() => setStepModal(null)}
        onOk={saveStep}
      />
      <TicketTypeModal
        open={!!typeModal}
        initialName={editingType?.name}
        takenNames={draft.ticketTypes.filter((t) => t.key !== typeModal?.key).map((t) => t.name)}
        onCancel={() => setTypeModal(null)}
        onOk={saveType}
      />
    </>
  );
}

export function CardTitle({ label, count }: { label: string; count?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span style={{ fontSize: 16 }}>{label}</span>
      {count !== undefined && (
        <Tag bordered={false} style={{ margin: 0, borderRadius: 11, color: "var(--color-text-muted)" }}>
          {count}
        </Tag>
      )}
    </span>
  );
}

function EmptyHint({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-8 text-center">
      <span className="font-medium">{title}</span>
      <Typography.Text type="secondary" style={{ fontSize: 13, maxWidth: 320 }}>
        {text}
      </Typography.Text>
    </div>
  );
}

// Icon + text so the state never relies on colour alone.
export function FieldMessage({ tone, text }: { tone: "error" | "warning"; text: string }) {
  return (
    <span
      className="mt-1 flex items-center gap-1.5 text-[13px]"
      style={{ color: tone === "error" ? "var(--color-danger-text)" : "var(--color-warning-text)" }}
    >
      {tone === "error" ? <ExclamationCircleOutlined aria-hidden /> : <WarningOutlined aria-hidden />}
      {text}
    </span>
  );
}
