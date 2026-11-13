// Events and their own setup — guest-management-be DEVELOPMENT_PLAN.md B16.
// An event's workflow steps, ticket types and step access are loaded with
// GET /events/{id}/setup and saved whole, in one transaction, with
// PUT /events/{id}/setup. Unlike a category save, rows keep their ids (guests,
// tickets and scan logs point at them), so the payload sends them back.

import dayjs from "dayjs";
import type { CategoryStep, CategoryTicketType, SetupDraft } from "./categories";
import type { FilterCondition } from "./list-query";

export type Event = {
  id: string;
  tenant_id: string;
  category_id: string;
  category_template_version: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_multi_day: boolean;
  rsvp_required: boolean;
  created_at: string;
  updated_at: string;
};

// A row of GET /events (B16 R5).
export type EventListItem = Event & { guest_count: number; confirmed_count: number };

// Same shape as a category's template set: steps are indexes into workflow_steps.
export type EventSetup = { workflow_steps: CategoryStep[]; ticket_types: CategoryTicketType[] };

// --- Status (no API field: derived from the dates) ---------------------------

export type EventStatus = "upcoming" | "live" | "ended";

export function statusOf(e: Pick<Event, "start_date" | "end_date">, now = dayjs()): EventStatus {
  if (now.isBefore(e.start_date)) return "upcoming";
  if (now.isAfter(e.end_date)) return "ended";
  return "live";
}

// A "status" filter condition becomes date range filters (B16 R3), so each
// status is one server-side query. Other conditions pass through.
export function expandStatusFilter(conditions: FilterCondition[], now = new Date()): FilterCondition[] {
  const ts = now.toISOString();
  return conditions.flatMap((c): FilterCondition[] => {
    if (c.field !== "status") return [c];
    const at = (field: string, operator: FilterCondition["operator"]) => ({ id: `${c.id}-${field}`, field, operator, value: ts });
    if (c.value === "upcoming") return [at("start_date", "gt")];
    if (c.value === "ended") return [at("end_date", "lt")];
    if (c.value === "live") return [at("start_date", "lte"), at("end_date", "gte")];
    return [];
  });
}

// "Sat 17 Oct 2026, 16:00–22:00" on one day, otherwise both ends in full.
export function formatWhen(e: Pick<Event, "start_date" | "end_date">): string {
  const s = dayjs(e.start_date);
  const t = dayjs(e.end_date);
  return s.isSame(t, "day")
    ? `${s.format("ddd D MMM YYYY, HH:mm")}–${t.format("HH:mm")}`
    : `${s.format("ddd D MMM YYYY, HH:mm")} – ${t.format("ddd D MMM YYYY, HH:mm")}`;
}

// Calendar days the event touches, for the "N days" tag.
export const dayCount = (e: Pick<Event, "start_date" | "end_date">) =>
  dayjs(e.end_date).startOf("day").diff(dayjs(e.start_date).startOf("day"), "day") + 1;

// --- Setup payload -------------------------------------------------------------

export function toSetupPayload(d: SetupDraft) {
  const index = new Map(d.steps.map((s, i) => [s.key, i]));
  return {
    workflow_steps: d.steps.map((s) => ({ ...(s.id && { id: s.id }), name: s.name.trim(), allows_multiple: s.allowsMultiple })),
    ticket_types: d.ticketTypes.map((t) => ({
      ...(t.id && { id: t.id }),
      name: t.name.trim(),
      rules: t.rules ?? {},
      steps: t.stepKeys.map((k) => index.get(k)).filter((i): i is number => i !== undefined),
    })),
  };
}
