"use client";

import React, { useState } from "react";
import { App, Input, Modal, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { api } from "../../_lib/api";
import type { Event } from "../../_lib/events";

type Props = { event: Pick<Event, "id" | "name">; open: boolean; onCancel: () => void; onDeleted: () => void };

// Type-the-name confirmation: deleting an event takes its guests, tickets, staff
// assignments and scan history with it, and voids the QR codes guests hold.
export default function DeleteEventModal({ event, open, onCancel, onDeleted }: Props) {
  const { message } = App.useApp();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await api(`/events/${event.id}`, { method: "DELETE" });
      message.success(`Deleted ${event.name}`);
      onDeleted();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span className="flex items-center gap-2">
          <WarningOutlined style={{ color: "var(--color-danger)" }} />
          Delete “{event.name}”?
        </span>
      }
      okText="Delete event"
      okButtonProps={{ danger: true, disabled: typed !== event.name, loading: deleting }}
      onOk={confirm}
      onCancel={onCancel}
      afterClose={() => setTyped("")}
    >
      <Typography.Paragraph>
        Its guest list, tickets, staff assignments and check-in history are removed from the app. Guests’ QR tickets stop
        working. This can’t be undone here.
      </Typography.Paragraph>
      <label htmlFor="delete-event-name" className="mb-2 block font-medium">
        Type the event name to confirm
      </label>
      <Input id="delete-event-name" value={typed} placeholder={event.name} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
    </Modal>
  );
}
