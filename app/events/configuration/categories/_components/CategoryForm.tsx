"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Checkbox, Collapse, Dropdown, Grid, Input, Radio, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  RetweetOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import PageHeader from "../../../../_components/PageHeader";
import { useThemeMode } from "../../../../_components/ThemeModeProvider";
import SourceTag from "./SourceTag";
import StepModal, { type StepValues } from "./StepModal";
import TicketTypeModal from "./TicketTypeModal";
import { ApiError, api, useSession } from "../../../../_lib/api";
import { confirmLeave, useLeaveGuard } from "../../../../_lib/leave-guard";
import {
  MAX_ITEMS,
  PLATFORM_TENANT_ID,
  emptyDraft,
  mapServerFields,
  newKey,
  toDraft,
  toPayload,
  validate,
  type Category,
  type CategorySource,
  type Draft,
  type DraftIssues,
} from "../../../../_lib/categories";

const LIST_PATH = "/events/configuration/categories";

type Props =
  | { mode: "create"; category?: undefined; readOnly?: false; onSaved: (c: Category) => void; onReload?: undefined }
  | { mode: "edit"; category: Category; readOnly: boolean; onSaved: (c: Category) => void; onReload: () => void };

// One form for /new and /[id] (design canvas "Event categories"): every change
// edits a local draft; Save sends the whole template set in one request.
export default function CategoryForm({ mode, category, readOnly = false, onSaved, onReload }: Props) {
  const router = useRouter();
  const session = useSession();
  const { modal, message } = App.useApp();
  const mobile = !Grid.useBreakpoint().md;
  const { mode: themeMode } = useThemeMode();
  const create = mode === "create";

  const initial = useMemo(() => (category ? toDraft(category) : emptyDraft()), [category]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [source, setSource] = useState<CategorySource>("tenant");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<DraftIssues | null>(null);
  const [stepModal, setStepModal] = useState<{ key?: string } | null>(null);
  const [typeModal, setTypeModal] = useState<{ key?: string } | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(initial)),
    [draft, initial],
  );
  const client = validate(draft);
  // The name error waits until the user has changed something, so an empty
  // create form doesn't open in an error state.
  const issues: DraftIssues = serverIssues ?? { ...client, name: dirty ? client.name : undefined };
  const problems = serverIssues ? serverIssues.count : client.count - (client.name && !dirty ? 1 : 0);

  const edit = (next: (d: Draft) => Draft) => {
    setDraft(next);
    setServerIssues(null);
    setSaveError(null);
  };

  const askLeave = useCallback(
    () =>
      new Promise<boolean>((resolve) =>
        modal.confirm({
          title: "Discard unsaved changes?",
          content: `You changed ${draft.name.trim() || "this category"} but haven’t saved. If you leave now, those changes are lost.`,
          okText: "Discard changes",
          okButtonProps: { danger: true },
          cancelText: "Keep editing",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      ),
    [modal, draft.name],
  );
  useLeaveGuard(dirty && !saving, askLeave);
  const leave = async (path: string) => {
    if (await confirmLeave()) router.push(path);
  };

  // --- Save ------------------------------------------------------------------

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setServerIssues(null);
    try {
      const payload = toPayload(draft);
      const saved = create
        ? await api<Category>("/event-categories", { method: "POST", body: JSON.stringify({ source, ...payload }) })
        : await api<Category>(`/event-categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...payload, template_version: category.template_version }),
          });
      message.success(create ? "Category created" : "Changes saved");
      onSaved(saved);
    } catch (e) {
      const err = e as Error;
      if (err instanceof ApiError && err.status === 409 && !create) {
        modal.confirm({
          title: "Someone else changed this category",
          icon: <WarningOutlined style={{ color: "var(--color-warning)" }} />,
          content: `${draft.name.trim() || "This category"} was saved by someone else after you opened it, so your changes weren’t saved. Reload to see the latest version. Your unsaved changes will be lost.`,
          okText: "Reload latest version",
          cancelText: "Not now",
          onOk: onReload,
        });
      } else if (err instanceof ApiError && err.status === 400 && err.fields) {
        const { issues: mapped, leftovers } = mapServerFields(draft, err.fields);
        if (mapped.count) setServerIssues(mapped);
        if (leftovers.length || !mapped.count) setSaveError(leftovers.join(" ") || err.message);
      } else {
        setSaveError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    modal.confirm({
      title: `Delete “${category?.name}”?`,
      icon: <WarningOutlined style={{ color: "var(--color-danger)" }} />,
      content: `New events can’t use this category any more. Its ${category?.workflow_steps.length} workflow steps and ${category?.ticket_types.length} ticket types are deleted with it. Events already created from it keep their own steps and ticket types.`,
      okText: "Delete category",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api(`/event-categories/${category?.id}`, { method: "DELETE" });
        } catch (e) {
          message.error((e as Error).message);
          throw e; // keeps the dialog open
        }
        message.success(`Deleted ${category?.name}`);
        router.push(LIST_PATH);
      },
    });

  // --- Draft edits -----------------------------------------------------------

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

  // --- Render ----------------------------------------------------------------

  const title = create ? "New category" : draft.name.trim() || category.name;
  const canEditThis = !readOnly;
  const isPlatform = session?.tenantId === PLATFORM_TENANT_ID;

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
                              { key: "remove", label: "Remove", icon: <DeleteOutlined />, danger: true, onClick: () => edit((x) => ({ ...x, ticketTypes: x.ticketTypes.filter((o) => o.key !== t.key) })) },
                            ],
                          }}
                        >
                          <Button type="text" aria-label={`Actions for ${t.name}`} icon={<MoreOutlined />} style={{ width: 44, height: 44 }} />
                        </Dropdown>
                      ) : (
                        <div className="flex gap-0.5">
                          {iconButton(`Rename ${t.name}`, <EditOutlined />, () => setTypeModal({ key: t.key }))}
                          {iconButton(`Remove ${t.name}`, <DeleteOutlined />, () => edit((x) => ({ ...x, ticketTypes: x.ticketTypes.filter((o) => o.key !== t.key) })), { danger: true })}
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
            Tick the steps each ticket type includes. A new ticket type or step starts with everything ticked.
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

  const statusTone = saveError || (problems > 0 && (dirty || create)) ? "error" : dirty && !create ? "dirty" : "muted";
  const status = saving
    ? "Saving…"
    : saveError
      ? `Couldn’t save: ${saveError} Your changes are still here — try again.`
      : problems > 0 && (dirty || create)
        ? `Fix ${problems} ${problems === 1 ? "problem" : "problems"} before saving`
        : create
          ? "Nothing is saved until you create the category."
          : dirty
            ? "You have unsaved changes"
            : "No unsaved changes";
  const saveDisabled = saving || problems > 0 || (!create && !dirty) || (create && !draft.name.trim());

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[
          { label: "Events" },
          { label: "Configuration" },
          { label: "Categories", onClick: () => leave(LIST_PATH) },
          { label: title },
        ]}
        title={title}
        onBack={() => leave(LIST_PATH)}
        actions={category && <SourceTag source={category.source} />}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        <InfoCircleOutlined style={{ marginRight: 8 }} />
        {create
          ? "Set up the steps and ticket types every new event in this category starts with. You can change them later."
          : readOnly
            ? category.source === "app"
              ? "This is an app default, shared by every organisation. Only a super admin can change it."
              : "You don’t have permission to change this category."
            : "Changes apply to events created from now on. Existing events keep their own steps and ticket types."}
      </Typography.Paragraph>

      <div
        aria-busy={saving}
        className="flex flex-col gap-6"
        style={saving ? { opacity: 0.6, pointerEvents: "none" } : undefined}
      >
        {canEditThis && (
          <Card title={<CardTitle label="Details" />}>
            <label htmlFor="category-name" className="mb-2 block font-medium">
              Category name <span style={{ color: "var(--color-danger)" }} aria-hidden="true">*</span>
            </label>
            <Input
              id="category-name"
              value={draft.name}
              maxLength={200}
              placeholder="e.g. Wedding, Conference"
              status={issues.name ? "error" : undefined}
              aria-invalid={!!issues.name}
              aria-describedby="category-name-msg"
              onChange={(e) => edit((x) => ({ ...x, name: e.target.value }))}
              style={{ maxWidth: 420 }}
              autoFocus={create}
            />
            <div id="category-name-msg" className="mt-2">
              {issues.name ? (
                <FieldMessage tone="error" text={issues.name} />
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Shown when someone picks a category for a new event.
                </Typography.Text>
              )}
            </div>
            {create && isPlatform && (
              <div className="mt-4">
                <div className="mb-2 font-medium">Source</div>
                <Radio.Group
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  options={[
                    { value: "tenant", label: "This organisation only" },
                    { value: "app", label: "App default (every organisation)" },
                  ]}
                />
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
          {stepsCard}
          {typesCard}
        </div>
        {accessCard}

        {!create && canEditThis && (
          <Card style={{ borderColor: "var(--color-danger)" }}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[240px] flex-1">
                <div className="font-semibold">Danger zone</div>
                <Typography.Text type="secondary">
                  Delete this category. New events can’t use it any more; existing events are not affected.
                </Typography.Text>
              </div>
              {/* DESIGN_SYSTEM.md §1: danger is solid in light, outlined in dark. */}
              <Button danger type={themeMode === "dark" ? "default" : "primary"} icon={<DeleteOutlined />} onClick={remove} block={mobile} style={mobile ? { height: 44 } : undefined}>
                Delete category
              </Button>
            </div>
          </Card>
        )}
      </div>

      {canEditThis && (
        <div
          role="region"
          aria-label="Save changes"
          className={`sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex gap-3 px-6 py-3 ${mobile ? "flex-col" : "items-center"}`}
          style={{ background: "var(--color-chrome)", borderTop: "1px solid var(--color-border)" }}
        >
          <span
            aria-live="polite"
            className="flex flex-1 items-center gap-2"
            style={{ color: statusTone === "error" ? "var(--color-danger-text)" : statusTone === "dirty" ? "var(--color-text)" : "var(--color-text-muted)" }}
          >
            {statusTone === "dirty" && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "var(--color-warning)" }} />}
            {statusTone === "error" && <ExclamationCircleOutlined aria-hidden />}
            {status}
          </span>
          <div className="flex gap-2">
            {create ? (
              <>
                <Button onClick={() => leave(LIST_PATH)} className={mobile ? "h-11 flex-1" : undefined}>
                  Cancel
                </Button>
                <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={mobile ? "h-11 flex-1" : undefined}>
                  {saving ? "Creating…" : saveError ? "Try again" : "Create category"}
                </Button>
              </>
            ) : (
              <>
                <Button disabled={!dirty || saving} onClick={() => edit(() => initial)} className={mobile ? "h-11 flex-1" : undefined}>
                  Discard
                </Button>
                <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={mobile ? "h-11 flex-1" : undefined}>
                  {saving ? "Saving…" : saveError ? "Try again" : "Save changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}

function CardTitle({ label, count }: { label: string; count?: number }) {
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
function FieldMessage({ tone, text }: { tone: "error" | "warning"; text: string }) {
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
