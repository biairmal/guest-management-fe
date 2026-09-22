// Shared config + query building for list pages' Filter/Sort toolbars
// (DESIGN_SYSTEM.md §4 generic pattern). Each page declares its own
// FilterField[] / SortField[] against its endpoint's allow-lists; the
// popovers render from that config, and toListQuery turns the applied
// state into the backend's list query (guest-management-be
// internal/core/query: page, size, repeatable sort=field,DIR, and
// field=value[;operator] with operators eq | like).

// eq = exact match (the backend default); like = contains-style match.
export type Operator = "eq" | "like";

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq: "is",
  like: "contains",
};

export type FilterField = {
  key: string; // query param name, must be in the endpoint's AllowedFilterFields
  label: string;
  operators: Operator[]; // first one is the default for a new condition
  options?: { value: string; label: string }[]; // fixed values → Select instead of text Input
};

export type SortField = {
  key: string; // must be in the endpoint's AllowedSortFields
  label: string;
};

export type FilterCondition = {
  id: string;
  field: string;
  operator: Operator;
  value: string;
};

export type SortKey = {
  id: string;
  field: string;
  direction: "asc" | "desc";
};

let nextId = 0;
export function newId(prefix: string): string {
  nextId += 1;
  return `${prefix}${nextId}`;
}

// The backend reads one value per filter field, so the filter popover never
// offers a field twice; empty values are skipped.
export function toListQuery(
  page: number,
  size: number,
  conditions: FilterCondition[],
  sortKeys: SortKey[],
): string {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  for (const s of sortKeys) q.append("sort", `${s.field},${s.direction.toUpperCase()}`);
  for (const c of conditions) {
    const value = c.value.trim();
    if (value) q.set(c.field, c.operator === "eq" ? value : `${value};${c.operator}`);
  }
  return q.toString();
}
