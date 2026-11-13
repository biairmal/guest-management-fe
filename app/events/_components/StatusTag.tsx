"use client";

import React from "react";
import { Tag } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { statusOf, type Event, type EventStatus } from "../../_lib/events";

// Icon + label on every status, never colour alone.
const LOOK: Record<EventStatus, { label: string; color: string; icon: React.ReactNode }> = {
  upcoming: { label: "Upcoming", color: "processing", icon: <ClockCircleOutlined /> },
  live: { label: "Live", color: "success", icon: <PlayCircleOutlined /> },
  ended: { label: "Ended", color: "default", icon: <CheckCircleOutlined /> },
};

export const STATUS_OPTIONS = (Object.keys(LOOK) as EventStatus[]).map((value) => ({ value, label: LOOK[value].label }));

export default function StatusTag({ event }: { event: Pick<Event, "start_date" | "end_date"> }) {
  const look = LOOK[statusOf(event)];
  return (
    <Tag color={look.color} icon={look.icon} style={{ margin: 0 }}>
      {look.label}
    </Tag>
  );
}
