"use client";

import React, { useCallback, useMemo, useState } from "react";
import { App, Button, Grid, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import SaveBar, { barButtonClass, type SaveTone } from "../configuration/categories/_components/SaveBar";
import SetupEditor from "../configuration/categories/_components/SetupEditor";
import { ApiError, api } from "../../_lib/api";
import { mapServerFields, toSetupDraft, validateSetup, type DraftIssues, type SetupDraft } from "../../_lib/categories";
import { useLeaveGuard } from "../../_lib/leave-guard";
import { toSetupPayload, type EventSetup } from "../../_lib/events";

type Props = { eventId: string; eventName: string; categoryName: string; setup: EventSetup; onSaved: (s: EventSetup) => void };

// Steps & tickets tab: the event's own copy of its steps and ticket types,
// saved whole with PUT /events/{id}/setup in one transaction (B16 R1) — so a
// save either lands completely or changes nothing. The parent re-keys this
// component on save, so the draft resets from the response.
export default function EventSetupTab({ eventId, eventName, categoryName, setup, onSaved }: Props) {
  const { modal, message } = App.useApp();
  const mobile = !Grid.useBreakpoint().md;
  const initial = useMemo(() => toSetupDraft(setup), [setup]);
  const [draft, setDraft] = useState<SetupDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<DraftIssues | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(toSetupPayload(draft)) !== JSON.stringify(toSetupPayload(initial)),
    [draft, initial],
  );
  const issues = serverIssues ?? validateSetup(draft);

  const edit = (fn: (d: SetupDraft) => SetupDraft) => {
    setDraft(fn);
    setServerIssues(null);
    setSaveError(null);
  };

  const askLeave = useCallback(
    () =>
      new Promise<boolean>((resolve) =>
        modal.confirm({
          title: "Discard unsaved changes?",
          content: `You changed the steps or ticket types of ${eventName} but haven’t saved. If you leave now, those changes are lost.`,
          okText: "Discard changes",
          okButtonProps: { danger: true },
          cancelText: "Keep editing",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      ),
    [modal, eventName],
  );
  useLeaveGuard(dirty && !saving, askLeave);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setServerIssues(null);
    try {
      const saved = await api<EventSetup>(`/events/${eventId}/setup`, { method: "PUT", body: JSON.stringify(toSetupPayload(draft)) });
      message.success("Changes saved");
      onSaved(saved);
    } catch (e) {
      const err = e as Error;
      if (err instanceof ApiError && err.status === 403) {
        setSaveError("You don’t have permission to manage events.");
      } else if (err instanceof ApiError && err.status === 400 && err.fields) {
        // Row errors land on the row; the rest (e.g. "VIP is held by 12 guests")
        // goes to the save bar.
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

  const problems = issues.count;
  const tone: SaveTone = saveError || problems > 0 ? "error" : dirty ? "dirty" : "muted";
  const status = saving
    ? "Saving…"
    : saveError
      ? `Couldn’t save: ${saveError} Your changes are still here — try again.`
      : problems > 0
        ? `Fix ${problems} ${problems === 1 ? "problem" : "problems"} before saving`
        : dirty
          ? "You have unsaved changes"
          : "No unsaved changes";

  return (
    <div className="flex min-h-full flex-col">
      <Typography.Paragraph type="secondary">
        <InfoCircleOutlined style={{ marginRight: 8 }} />
        These are this event’s own steps and ticket types, copied from the category “{categoryName}”. Changes here
        don’t affect the category or other events.
      </Typography.Paragraph>
      <div aria-busy={saving} className="flex flex-col gap-6" style={saving ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
        <SetupEditor
          value={draft}
          onChange={edit}
          issues={issues}
          accessHint="Tick the steps each ticket type includes. Scans at a step a guest’s ticket doesn’t include are rejected at the door."
        />
      </div>
      <SaveBar tone={tone} status={status}>
        <Button disabled={!dirty || saving} onClick={() => edit(() => initial)} className={barButtonClass(mobile)}>
          Discard
        </Button>
        <Button type="primary" loading={saving} disabled={saving || problems > 0 || !dirty} onClick={save} className={barButtonClass(mobile)}>
          {saving ? "Saving…" : saveError ? "Try again" : "Save changes"}
        </Button>
      </SaveBar>
    </div>
  );
}
