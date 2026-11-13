"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Grid, Input, Radio, Typography } from "antd";
import { DeleteOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import PageHeader from "../../../../_components/PageHeader";
import { useThemeMode } from "../../../../_components/ThemeModeProvider";
import SourceTag from "./SourceTag";
import SaveBar, { barButtonClass, type SaveTone } from "./SaveBar";
import SetupEditor, { CardTitle, FieldMessage } from "./SetupEditor";
import { ApiError, api, useSession } from "../../../../_lib/api";
import { confirmLeave, useLeaveGuard } from "../../../../_lib/leave-guard";
import {
  PLATFORM_TENANT_ID,
  emptyDraft,
  mapServerFields,
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

  // --- Render ----------------------------------------------------------------

  const title = create ? "New category" : draft.name.trim() || category.name;
  const canEditThis = !readOnly;
  const isPlatform = session?.tenantId === PLATFORM_TENANT_ID;

  const statusTone: SaveTone = saveError || (problems > 0 && (dirty || create)) ? "error" : dirty && !create ? "dirty" : "muted";
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

        <SetupEditor value={draft} onChange={(fn) => edit((x) => ({ ...x, ...fn(x) }))} issues={issues} readOnly={readOnly} />

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
        <SaveBar tone={statusTone} status={status}>
          {create ? (
            <>
              <Button onClick={() => leave(LIST_PATH)} className={barButtonClass(mobile)}>
                Cancel
              </Button>
              <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={barButtonClass(mobile)}>
                {saving ? "Creating…" : saveError ? "Try again" : "Create category"}
              </Button>
            </>
          ) : (
            <>
              <Button disabled={!dirty || saving} onClick={() => edit(() => initial)} className={barButtonClass(mobile)}>
                Discard
              </Button>
              <Button type="primary" loading={saving} disabled={saveDisabled} onClick={save} className={barButtonClass(mobile)}>
                {saving ? "Saving…" : saveError ? "Try again" : "Save changes"}
              </Button>
            </>
          )}
        </SaveBar>
      )}
    </div>
  );
}
