// Event categories and their template sets — guest-management-be
// DEVELOPMENT_PLAN.md B15. A category's workflow steps, ticket types and step
// access are one document: loaded with GET /event-categories/{id}, saved whole
// with POST /event-categories or PUT /event-categories/{id}.

import type { Session } from "./api";

// Seeded platform tenant (migration 000014): only it may write app categories.
export const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// Backend cap per array (query.DefaultMaxSize).
export const MAX_ITEMS = 100;

export type CategorySource = "app" | "tenant";

// A row of GET /event-categories (the list endpoint carries no template set).
export type CategorySummary = {
  id: string;
  source: CategorySource;
  tenant_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CategoryStep = { id: string; name: string; allows_multiple: boolean };
// steps = indexes into Category.workflow_steps.
export type CategoryTicketType = { id: string; name: string; rules: unknown; steps: number[] };

export type Category = CategorySummary & {
  template_version: number;
  workflow_steps: CategoryStep[];
  ticket_types: CategoryTicketType[];
};

// Old backends (before B15) return a category without its template set;
// saving against one would silently drop the steps and ticket types.
export function hasTemplateSet(c: CategorySummary): c is Category {
  const x = c as Partial<Category>;
  return typeof x.template_version === "number" && Array.isArray(x.workflow_steps) && Array.isArray(x.ticket_types);
}

// Server enforces this too; the UI only uses it to show the read-only view.
export function canEdit(c: Pick<CategorySummary, "source" | "tenant_id">, session: Session | null): boolean {
  if (!session) return false;
  return c.source === "app" ? session.tenantId === PLATFORM_TENANT_ID : c.tenant_id === session.tenantId;
}

// --- Draft -----------------------------------------------------------------
// Rows carry a local key so ticks follow the step through reorder/remove;
// keys become array indexes only in toPayload.

export type DraftStep = { key: string; name: string; allowsMultiple: boolean };
export type DraftTicketType = { key: string; name: string; rules: unknown; stepKeys: string[] };
export type Draft = { name: string; steps: DraftStep[]; ticketTypes: DraftTicketType[] };

let seq = 0;
export function newKey(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export const emptyDraft = (): Draft => ({ name: "", steps: [], ticketTypes: [] });

export function toDraft(c: Category): Draft {
  const steps = c.workflow_steps.map((s) => ({ key: newKey("s"), name: s.name, allowsMultiple: s.allows_multiple }));
  return {
    name: c.name,
    steps,
    ticketTypes: c.ticket_types.map((t) => ({
      key: newKey("t"),
      name: t.name,
      rules: t.rules,
      stepKeys: t.steps.map((i) => steps[i]?.key).filter((k): k is string => !!k),
    })),
  };
}

export function toPayload(d: Draft) {
  const index = new Map(d.steps.map((s, i) => [s.key, i]));
  return {
    name: d.name.trim(),
    workflow_steps: d.steps.map((s) => ({ name: s.name.trim(), allows_multiple: s.allowsMultiple })),
    ticket_types: d.ticketTypes.map((t) => ({
      name: t.name.trim(),
      rules: t.rules ?? {},
      steps: t.stepKeys.map((k) => index.get(k)).filter((i): i is number => i !== undefined),
    })),
  };
}

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// --- Validation (same rules as the server) ----------------------------------

export type DraftIssues = {
  name?: string;
  steps: Record<string, string>; // by step key
  ticketTypes: Record<string, string>; // by ticket type key
  count: number;
};

export function validate(d: Draft): DraftIssues {
  const issues: DraftIssues = { steps: {}, ticketTypes: {}, count: 0 };
  if (!d.name.trim()) issues.name = "Enter a category name.";
  d.steps.forEach((s) => {
    if (!s.name.trim()) issues.steps[s.key] = "Enter a step name.";
  });
  d.ticketTypes.forEach((t, i) => {
    if (!t.name.trim()) issues.ticketTypes[t.key] = "Enter a ticket type name.";
    else if (d.ticketTypes.findIndex((o) => sameName(o.name, t.name)) !== i) {
      issues.ticketTypes[t.key] = `Another ticket type is already called ${t.name.trim()}. Rename or remove one.`;
    }
  });
  issues.count = (issues.name ? 1 : 0) + Object.keys(issues.steps).length + Object.keys(issues.ticketTypes).length;
  return issues;
}

// Maps a 400's meta.fields (JSON-path keys like "ticket_types[1].name") onto
// draft rows. Keys that don't map (e.g. a bare field name from the boundary
// validator) are returned as leftovers for the save bar.
export function mapServerFields(d: Draft, fields: Record<string, string>) {
  const issues: DraftIssues = { steps: {}, ticketTypes: {}, count: 0 };
  const leftovers: string[] = [];
  for (const [path, msg] of Object.entries(fields)) {
    const m = /^(workflow_steps|ticket_types)\[(\d+)\]/.exec(path);
    const row = m && (m[1] === "workflow_steps" ? d.steps : d.ticketTypes)[Number(m[2])];
    if (path === "name") issues.name = msg;
    else if (m && row) (m[1] === "workflow_steps" ? issues.steps : issues.ticketTypes)[row.key] = msg;
    else leftovers.push(msg);
  }
  issues.count = (issues.name ? 1 : 0) + Object.keys(issues.steps).length + Object.keys(issues.ticketTypes).length;
  return { issues, leftovers };
}
