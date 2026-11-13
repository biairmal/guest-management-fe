"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../_components/AppShell";
import PageHeader from "../../_components/PageHeader";
import EventForm, { LIST_PATH } from "../_components/EventForm";
import { confirmLeave } from "../../_lib/leave-guard";

// POST /api/v1/events (tenant from the JWT); on success the new event's
// Details tab takes over.
export default function NewEventPage() {
  const router = useRouter();
  const back = async () => {
    if (await confirmLeave()) router.push(LIST_PATH);
  };
  return (
    <AppShell>
      <PageHeader crumbs={[{ label: "Events" }, { label: "All events", onClick: back }, { label: "New event" }]} title="New event" onBack={back} />
      <EventForm mode="create" onSaved={(e) => router.replace(`/events/${e.id}`)} />
    </AppShell>
  );
}
