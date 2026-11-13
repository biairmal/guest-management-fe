"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, DatePicker, Form, Grid, Input, Select, Switch, Tag, Typography } from "antd";
import { DeleteOutlined, LockOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import SaveBar, { barButtonClass, type SaveTone } from "../configuration/categories/_components/SaveBar";
import { CardTitle } from "../configuration/categories/_components/SetupEditor";
import DeleteEventModal from "./DeleteEventModal";
import { useThemeMode } from "../../_components/ThemeModeProvider";
import { ApiError, api, type Page } from "../../_lib/api";
import { hasTemplateSet, type Category, type CategorySummary } from "../../_lib/categories";
import { confirmLeave, useLeaveGuard } from "../../_lib/leave-guard";
import type { Event } from "../../_lib/events";

export const LIST_PATH = "/events";

type Props =
  | { mode: "create"; event?: undefined; categoryName?: undefined; onSaved: (e: Event) => void }
  | { mode: "edit"; event: Event; categoryName: string; onSaved: (e: Event) => void };

type Values = { name: string; categoryId: string | null; start: Dayjs | null; end: Dayjs | null; description: string; rsvp: boolean };
type Field = "name" | "category_id" | "start_date" | "end_date";

const fromEvent = (e?: Event): Values => ({
  name: e?.name ?? "",
  categoryId: e?.category_id ?? null,
  start: e ? dayjs(e.start_date) : null,
  end: e ? dayjs(e.end_date) : null,
  description: e?.description ?? "",
  rsvp: e?.rsvp_required ?? true,
});
const sameTime = (x: Dayjs | null, y: Dayjs | null) => (x && y ? x.isSame(y) : x === y);
const same = (a: Values, b: Values) =>
  a.name === b.name &&
  a.description === b.description &&
  a.rsvp === b.rsvp &&
  a.categoryId === b.categoryId &&
  sameTime(a.start, b.start) &&
  sameTime(a.end, b.end);

const TIME_FORMAT = "D MMM YYYY HH:mm";
const zone = () => `${Intl.DateTimeFormat().resolvedOptions().timeZone}, UTC${dayjs().format("Z")}`;

// Details of an event (design canvas "Event management"): the whole create
// page, and the Details tab of an existing event. Category is picked once, at
// creation — changing it later would not re-copy steps or ticket types.
export default function EventForm({ mode, event, categoryName, onSaved }: Props) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const mobile = !Grid.useBreakpoint().md;
  const { mode: themeMode } = useThemeMode();
  const create = mode === "create";

  const initial = useMemo(() => fromEvent(event), [event]);
  const [v, setV] = useState<Values>(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverFields, setServerFields] = useState<Partial<Record<Field, string>>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const set = (patch: Partial<Values>) => {
    setV((x) => ({ ...x, ...patch }));
    setTouched(true);
    setSaveError(null);
    setServerFields({});
  };

  // --- Category picker + preview (create only) --------------------------------
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [preview, setPreview] = useState<Category | null>(null);
  useEffect(() => {
    if (!create) return;
    api<Page<CategorySummary>>("/event-categories?page=1&size=100&sort=name,ASC")
      .then((p) => setCategories(p.items))
      .catch((e: Error) => message.error(`Couldn’t load categories: ${e.message}`));
  }, [create, message]);
  useEffect(() => {
    if (!create || !v.categoryId) return;
    let cancelled = false;
    api<CategorySummary>(`/event-categories/${v.categoryId}`)
      .then((c) => !cancelled && setPreview(hasTemplateSet(c) ? c : null))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [create, v.categoryId]);

  // --- Validation ---------------------------------------------------------------
  const dirty = !same(v, initial);
  const errors: Partial<Record<Field, string>> = { ...serverFields };
  if (touched && !v.name.trim()) errors.name ??= "Enter an event name.";
  if (v.start && v.end && !v.end.isAfter(v.start)) errors.end_date ??= "The end must be after the start.";
  const problems = Object.keys(errors).length;
  const incomplete = !v.name.trim() || !v.start || !v.end || (create && !v.categoryId);

  const askLeave = useCallback(
    () =>
      new Promise<boolean>((resolve) =>
        modal.confirm({
          title: "Discard unsaved changes?",
          content: `You changed ${v.name.trim() || "this event"} but haven’t saved. If you leave now, those changes are lost.`,
          okText: "Discard changes",
          okButtonProps: { danger: true },
          cancelText: "Keep editing",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      ),
    [modal, v.name],
  );
  useLeaveGuard(dirty && !saving, askLeave);
  const leave = async (path: string) => {
    if (await confirmLeave()) router.push(path);
  };

  // --- Save -----------------------------------------------------------------------
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setServerFields({});
    const body = {
      name: v.name.trim(),
      description: v.description.trim(),
      start_date: v.start!.toISOString(),
      end_date: v.end!.toISOString(),
      rsvp_required: v.rsvp,
    };
    try {
      const saved = create
        ? await api<Event>("/events", { method: "POST", body: JSON.stringify({ ...body, category_id: v.categoryId }) })
        : await api<Event>(`/events/${event.id}`, { method: "PUT", body: JSON.stringify(body) });
      message.success(create ? "Event created" : "Changes saved");
      onSaved(saved);
    } catch (e) {
      const err = e as Error;
      if (err instanceof ApiError && err.status === 403) {
        setSaveError("You don’t have permission to manage events.");
      } else if (err instanceof ApiError && err.status === 400 && err.fields) {
        const known: Partial<Record<Field, string>> = {};
        const rest: string[] = [];
        for (const [k, msg] of Object.entries(err.fields)) {
          if (k === "name" || k === "category_id" || k === "start_date" || k === "end_date") known[k] = msg;
          else rest.push(msg);
        }
        setServerFields(known);
        if (rest.length || !Object.keys(known).length) setSaveError(rest.join(" ") || err.message);
      } else {
        setSaveError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Render -----------------------------------------------------------------------
  const item = (field: Field) => (errors[field] ? { validateStatus: "error" as const, help: errors[field] } : {});

  const dates = mobile ? (
    <div className="flex flex-col gap-3">
      <Form.Item label="Starts" required {...item("start_date")} style={{ margin: 0 }}>
        <DatePicker showTime={{ format: "HH:mm" }} format={TIME_FORMAT} value={v.start} onChange={(d) => set({ start: d })} className="w-full" />
      </Form.Item>
      <Form.Item label="Ends" required {...item("end_date")} style={{ margin: 0 }}>
        <DatePicker showTime={{ format: "HH:mm" }} format={TIME_FORMAT} value={v.end} onChange={(d) => set({ end: d })} className="w-full" />
      </Form.Item>
    </div>
  ) : (
    <Form.Item
      label="Date and time"
      required
      validateStatus={errors.start_date || errors.end_date ? "error" : undefined}
      help={errors.start_date || errors.end_date}
      extra={`Times are in your local time zone (${zone()}).`}
    >
      <DatePicker.RangePicker
        showTime={{ format: "HH:mm" }}
        format={TIME_FORMAT}
        value={[v.start, v.end]}
        placeholder={["Start date", "End date"]}
        allowEmpty={[true, true]}
        onChange={(r) => set({ start: r?.[0] ?? null, end: r?.[1] ?? null })}
        style={{ maxWidth: 460, width: "100%" }}
      />
    </Form.Item>
  );

  const details = (
    <Card title={<CardTitle label="Details" />}>
      <Form layout="vertical" component="div">
        <Form.Item label="Event name" required {...item("name")}>
          <Input
            value={v.name}
            maxLength={200}
            placeholder="e.g. Ana & Budi’s wedding"
            onChange={(e) => set({ name: e.target.value })}
            style={{ maxWidth: 460 }}
            autoFocus={create}
          />
        </Form.Item>
        {create ? (
          <Form.Item label="Category" required {...item("category_id")} extra="The event starts with this category’s workflow steps and ticket types. You can change them after creating it.">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Pick a category"
              value={v.categoryId}
              onChange={(id) => {
                setPreview(null);
                set({ categoryId: id });
              }}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              style={{ maxWidth: 460 }}
            />
            {preview && v.categoryId === preview.id && <CategoryPreview category={preview} />}
          </Form.Item>
        ) : (
          <Form.Item label="Category" extra="Set when the event was created. Its steps and ticket types were copied then — edit them on the Steps & tickets tab.">
            <span className="flex items-center gap-2">
              <LockOutlined aria-hidden style={{ color: "var(--color-text-muted)" }} />
              {categoryName}
            </span>
          </Form.Item>
        )}
        {dates}
        {mobile && (
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, margin: "-8px 0 16px" }}>
            Times are in your local time zone ({zone()}).
          </Typography.Text>
        )}
        <Form.Item label="Description (optional)" style={{ marginBottom: 0 }}>
          <Input.TextArea
            value={v.description}
            rows={3}
            maxLength={2000}
            placeholder="Venue, dress code, anything staff should know"
            onChange={(e) => set({ description: e.target.value })}
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const invitations = (
    <Card title={<CardTitle label="Invitations" />}>
      <label className="flex cursor-pointer items-center gap-3">
        <Switch checked={v.rsvp} onChange={(rsvp) => set({ rsvp })} />
        <span className="font-medium">Guests must confirm (RSVP)</span>
      </label>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 8 }}>
        {v.rsvp
          ? "On: a guest gets their QR ticket after they confirm the invitation."
          : "Off: a guest gets their QR ticket as soon as the invitation is sent, whether or not they reply."}
      </Typography.Text>
    </Card>
  );

  const tone: SaveTone = saveError || problems > 0 ? "error" : !create && dirty ? "dirty" : "muted";
  const status = saving
    ? "Saving…"
    : saveError
      ? `Couldn’t save: ${saveError} Your changes are still here — try again.`
      : problems > 0
        ? `Fix ${problems} ${problems === 1 ? "problem" : "problems"} ${create ? "before creating the event" : "before saving"}`
        : create
          ? "Nothing is saved until you create the event."
          : dirty
            ? "You have unsaved changes"
            : "No unsaved changes";
  const saveDisabled = saving || problems > 0 || incomplete || (!create && !dirty);

  return (
    <div className="flex min-h-full flex-col">
      <div
        aria-busy={saving}
        className={`grid grid-cols-1 items-start gap-6 ${create ? "max-w-[860px]" : "lg:grid-cols-[2fr_1fr]"}`}
        style={saving ? { opacity: 0.6, pointerEvents: "none" } : undefined}
      >
        <div className="flex flex-col gap-6">
          {details}
          {invitations}
        </div>
        {!create && (
          <Card style={{ borderColor: "var(--color-danger)" }}>
            <div className="font-semibold">Danger zone</div>
            <Typography.Paragraph type="secondary">
              Delete this event, its guest list, tickets, staff assignments and check-in history.
            </Typography.Paragraph>
            {/* DESIGN_SYSTEM.md §1: danger is solid in light, outlined in dark. */}
            <Button danger type={themeMode === "dark" ? "default" : "primary"} icon={<DeleteOutlined />} onClick={() => setDeleteOpen(true)} block={mobile} style={mobile ? { height: 44 } : undefined}>
              Delete event
            </Button>
          </Card>
        )}
      </div>

      <SaveBar tone={tone} status={status}>
        {create ? (
          <>
            <Button onClick={() => leave(LIST_PATH)} className={barButtonClass(mobile)}>
              Cancel
            </Button>
            <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={barButtonClass(mobile)}>
              {saving ? "Creating…" : saveError ? "Try again" : "Create event"}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={!dirty || saving} onClick={() => { setV(initial); setTouched(false); setSaveError(null); setServerFields({}); }} className={barButtonClass(mobile)}>
              Discard
            </Button>
            <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={barButtonClass(mobile)}>
              {saving ? "Saving…" : saveError ? "Try again" : "Save changes"}
            </Button>
          </>
        )}
      </SaveBar>

      {!create && (
        <DeleteEventModal event={event} open={deleteOpen} onCancel={() => setDeleteOpen(false)} onDeleted={() => router.push(LIST_PATH)} />
      )}
    </div>
  );
}

// What a new event starts with: GET /event-categories/{id} embeds the template set.
function CategoryPreview({ category }: { category: Category }) {
  const tags = (names: string[]) => (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {names.map((n, i) => (
        <Tag key={i} bordered={false} style={{ margin: 0 }}>
          {n}
        </Tag>
      ))}
    </div>
  );
  return (
    <div className="mt-3 rounded-md p-3" style={{ background: "var(--color-pop)", border: "1px solid var(--color-border)", maxWidth: 460 }}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        This event will start with:
      </Typography.Text>
      <div className="mt-2 text-[13px] font-medium">{category.workflow_steps.length} steps</div>
      {tags(category.workflow_steps.map((s, i) => `${i + 1}. ${s.name}`))}
      <div className="mt-2 text-[13px] font-medium">{category.ticket_types.length} ticket types</div>
      {tags(category.ticket_types.map((t) => t.name))}
    </div>
  );
}
