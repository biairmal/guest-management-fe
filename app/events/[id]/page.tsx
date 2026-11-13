"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Tabs, Tag, Typography } from "antd";
import AppShell from "../../_components/AppShell";
import PageHeader from "../../_components/PageHeader";
import EventForm, { LIST_PATH } from "../_components/EventForm";
import EventSetupTab from "../_components/EventSetupTab";
import StatusTag from "../_components/StatusTag";
import { ApiError, api } from "../../_lib/api";
import type { CategorySummary } from "../../_lib/categories";
import { confirmLeave } from "../../_lib/leave-guard";
import { formatWhen, type Event, type EventSetup } from "../../_lib/events";

type Tab = "details" | "setup";

// One event: Details tab (PUT /events/{id}) and Steps & tickets tab
// (PUT /events/{id}/setup), each with its own draft and save bar. The tab is in
// the URL (?tab=setup). Another tenant's event is a 404 from the API.
export default function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const initialTab: Tab = use(searchParams).tab === "setup" ? "setup" : "details";
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [event, setEvent] = useState<Event | null>(null);
  const [setup, setSetup] = useState<EventSetup | null>(null);
  const [setupRev, setSetupRev] = useState(0);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<{ message: string; notFound?: boolean } | null>(null);

  const load = useCallback(() => {
    Promise.all([api<Event>(`/events/${id}`), api<EventSetup>(`/events/${id}/setup`)])
      .then(([e, s]) => {
        setEvent(e);
        setSetup(s);
        // The category may since have been deleted; the event keeps its own copy.
        api<CategorySummary>(`/event-categories/${e.category_id}`)
          .then((c) => setCategoryName(c.name))
          .catch(() => setCategoryName("Deleted category"));
      })
      .catch((e: Error) => setError({ message: e.message, notFound: e instanceof ApiError && e.status === 404 }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = async () => {
    if (await confirmLeave()) router.push(LIST_PATH);
  };
  const switchTab = (key: string) => {
    setTab(key as Tab);
    router.replace(key === "setup" ? `/events/${id}?tab=setup` : `/events/${id}`, { scroll: false });
  };

  if (error || !event || !setup) {
    return (
      <AppShell>
        {error ? (
          <Alert
            type="error"
            showIcon
            title={error.notFound ? "Event not found" : error.message}
            action={
              <Button
                size="small"
                onClick={() => {
                  if (error.notFound) return router.push(LIST_PATH);
                  setError(null);
                  load();
                }}
              >
                {error.notFound ? "Back to events" : "Retry"}
              </Button>
            }
          />
        ) : (
          <Card loading />
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        crumbs={[{ label: "Events" }, { label: "All events", onClick: back }, { label: event.name }]}
        title={event.name}
        onBack={back}
        actions={<StatusTag event={event} />}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        {[formatWhen(event), categoryName, event.rsvp_required ? "RSVP required" : "No RSVP"]
          .filter(Boolean)
          .join(" · ")}
      </Typography.Paragraph>
      <Tabs
        activeKey={tab}
        onChange={switchTab}
        items={[
          {
            key: "details",
            label: "Details",
            children: <EventForm key={event.updated_at} mode="edit" event={event} categoryName={categoryName} onSaved={setEvent} />,
          },
          {
            key: "setup",
            label: (
              <span className="flex items-center gap-2">
                Steps &amp; tickets
                <Tag bordered={false} style={{ margin: 0, borderRadius: 11, color: "var(--color-text-muted)" }}>
                  {setup.workflow_steps.length} · {setup.ticket_types.length}
                </Tag>
              </span>
            ),
            children: (
              <EventSetupTab
                key={setupRev}
                eventId={event.id}
                eventName={event.name}
                categoryName={categoryName}
                setup={setup}
                onSaved={(s) => {
                  setSetup(s);
                  setSetupRev((r) => r + 1);
                }}
              />
            ),
          },
        ]}
      />
    </AppShell>
  );
}
