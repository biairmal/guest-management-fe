export type Role = {
  id: string;
  name: string;
};

// No GET /roles endpoint exists, so this is the seeded system-scope catalog
// (guest-management-be migration 000014, STAFFING_RBAC.md §3).
export const ROLES: Role[] = [
  { id: "00000000-0000-0000-0000-000000000101", name: "Super Admin" },
  { id: "00000000-0000-0000-0000-000000000102", name: "Tenant Admin" },
  { id: "00000000-0000-0000-0000-000000000103", name: "Tenant Staff" },
];

// users.User from GET /api/v1/users[/{id}].
export type User = {
  id: string;
  tenant_id: string;
  email: string;
  role_id: string;
  is_tenant_master: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export function roleName(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.name ?? roleId;
}

export function initials(email: string): string {
  return email.slice(0, 1).toUpperCase();
}
