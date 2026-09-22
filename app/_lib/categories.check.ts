// Self-check for the draft <-> payload logic. Run: bun app/_lib/categories.check.ts
import assert from "node:assert/strict";
import { mapServerFields, toDraft, toPayload, validate, type Category } from "./categories";

const category: Category = {
  id: "c1",
  source: "tenant",
  tenant_id: "t1",
  name: "Wedding",
  created_at: "",
  updated_at: "",
  template_version: 3,
  workflow_steps: [
    { id: "a", name: "Check-in", allows_multiple: false },
    { id: "b", name: "Photo booth", allows_multiple: true },
    { id: "c", name: "VIP lounge", allows_multiple: false },
  ],
  ticket_types: [
    { id: "x", name: "VIP", rules: {}, steps: [0, 1, 2] },
    { id: "y", name: "Regular", rules: { max: 1 }, steps: [0, 1] },
  ],
};

// Round trip keeps order, flags, rules and access.
const draft = toDraft(category);
assert.deepEqual(toPayload(draft), {
  name: "Wedding",
  workflow_steps: [
    { name: "Check-in", allows_multiple: false },
    { name: "Photo booth", allows_multiple: true },
    { name: "VIP lounge", allows_multiple: false },
  ],
  ticket_types: [
    { name: "VIP", rules: {}, steps: [0, 1, 2] },
    { name: "Regular", rules: { max: 1 }, steps: [0, 1] },
  ],
});

// Reordering steps moves ticks with the step, not with the position:
// VIP lounge moved to the top must stay out of Regular.
const reordered = { ...draft, steps: [draft.steps[2], draft.steps[0], draft.steps[1]] };
assert.deepEqual(toPayload(reordered).ticket_types[1].steps, [1, 2]);

// Removing a step drops it from every ticket type and re-indexes the rest.
const removed = { ...draft, steps: draft.steps.filter((s) => s.name !== "Check-in") };
assert.deepEqual(toPayload(removed).ticket_types[0].steps, [0, 1]);

// Validation: empty name + case-insensitive duplicate ticket type.
const bad = { ...draft, name: " ", ticketTypes: [...draft.ticketTypes, { ...draft.ticketTypes[0], key: "t-dup", name: "vip" }] };
const issues = validate(bad);
assert.equal(issues.count, 2);
assert.ok(issues.name);
assert.ok(issues.ticketTypes["t-dup"]);
assert.equal(validate(draft).count, 0);

// Server field paths map to rows; unmappable keys come back as leftovers.
const mapped = mapServerFields(draft, { "ticket_types[1].name": "taken", Name: "required" });
assert.equal(mapped.issues.ticketTypes[draft.ticketTypes[1].key], "taken");
assert.deepEqual(mapped.leftovers, ["required"]);

console.log("categories.check: ok");
