// Shared types for the User List's Filter/Sort toolbar (DESIGN_SYSTEM.md §4
// generic pattern, §7 applied to the User List fields). Kept users-local
// (not app/_components/) since no other list exists yet to justify a shared
// abstraction — promote if/when a second list needs it.
// No Name field: the backend User has no name, so email stands in for it.

export type UserField = "email" | "role" | "createdAt" | "updatedAt";

export const FIELDS: UserField[] = ["email", "role", "createdAt", "updatedAt"];

export const FIELD_LABELS: Record<UserField, string> = {
  email: "Email",
  role: "Role",
  createdAt: "Created date",
  updatedAt: "Updated date",
};

export type FieldKind = "text" | "enum" | "date";

export const FIELD_KIND: Record<UserField, FieldKind> = {
  email: "text",
  role: "enum",
  createdAt: "date",
  updatedAt: "date",
};

export type Operator = "contains" | "is" | "is_not" | "gt" | "lt" | "between";

export const OPERATORS_FOR: Record<FieldKind, { value: Operator; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "is", label: "is" },
  ],
  enum: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  date: [
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "between", label: "between" },
  ],
};

export type FilterCondition = {
  id: string;
  field: UserField;
  operator: Operator;
  value: string; // date "between"'s start value when operator === "between"
  value2?: string; // date "between"'s end value
};

export type SortKey = {
  id: string;
  field: UserField;
  direction: "asc" | "desc";
};

let nextId = 0;
export function newId(prefix: string): string {
  nextId += 1;
  return `${prefix}${nextId}`;
}
