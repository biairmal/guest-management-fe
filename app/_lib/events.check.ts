// Self-check for event status, status filters and the setup payload. Run: bun app/_lib/events.check.ts
import assert from "node:assert/strict";
import dayjs from "dayjs";
import { newKey, toSetupDraft } from "./categories";
import { dayCount, expandStatusFilter, statusOf, toSetupPayload, type EventSetup } from "./events";

const ev = { start_date: "2026-10-17T16:00:00Z", end_date: "2026-10-17T22:00:00Z" };
assert.equal(statusOf(ev, dayjs("2026-10-17T15:59:00Z")), "upcoming");
assert.equal(statusOf(ev, dayjs("2026-10-17T18:00:00Z")), "live");
assert.equal(statusOf(ev, dayjs("2026-10-17T22:01:00Z")), "ended");
assert.equal(dayCount({ start_date: "2026-10-17T10:00:00", end_date: "2026-10-19T09:00:00" }), 3);

// Status becomes date range filters; other conditions pass through untouched.
const now = new Date("2026-10-17T18:00:00Z");
const ts = now.toISOString();
const name = { id: "n", field: "name", operator: "like" as const, value: "gala" };
assert.deepEqual(
  expandStatusFilter([name, { id: "s", field: "status", operator: "eq", value: "live" }], now).map((c) => [c.field, c.operator, c.value]),
  [["name", "like", "gala"], ["start_date", "lte", ts], ["end_date", "gte", ts]],
);
assert.deepEqual(expandStatusFilter([{ id: "s", field: "status", operator: "eq", value: "upcoming" }], now).map((c) => c.field + c.operator), ["start_dategt"]);
assert.deepEqual(expandStatusFilter([{ id: "s", field: "status", operator: "eq", value: "ended" }], now).map((c) => c.field + c.operator), ["end_datelt"]);

// Saved rows keep their ids, new rows have none, ticks follow the step on reorder.
const setup: EventSetup = {
  workflow_steps: [
    { id: "a", name: "Check-in", allows_multiple: false },
    { id: "b", name: "VIP lounge", allows_multiple: false },
  ],
  ticket_types: [{ id: "x", name: "Regular", rules: {}, steps: [0] }],
};
const d = toSetupDraft(setup);
const added = { key: newKey("s"), name: " Photo booth ", allowsMultiple: true };
const edited = { ...d, steps: [d.steps[1], added, d.steps[0]] };
assert.deepEqual(toSetupPayload(edited), {
  workflow_steps: [
    { id: "b", name: "VIP lounge", allows_multiple: false },
    { name: "Photo booth", allows_multiple: true },
    { id: "a", name: "Check-in", allows_multiple: false },
  ],
  ticket_types: [{ id: "x", name: "Regular", rules: {}, steps: [2] }],
});

console.log("events.check: ok");
