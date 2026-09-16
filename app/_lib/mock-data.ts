// Static/mock data for the UI-only login + user-management pass (B11).
// ponytail: no fetch calls anywhere in this file — swap for real
// GET /api/v1/users, GET /api/v1/users/{id} etc. in the API-integration pass.

export type Role = {
  id: string;
  name: string;
};

// Hardcoded seeded system-scope catalog (STAFFING_RBAC.md §3) — no GET /roles
// endpoint exists yet, per DEVELOPMENT_PLAN.md B11's API-grounding note.
export const ROLES: Role[] = [
  { id: "role-super-admin", name: "Super Admin" },
  { id: "role-tenant-admin", name: "Tenant Admin" },
  { id: "role-tenant-staff", name: "Tenant Staff" },
];

export type MockUser = {
  id: string;
  // ponytail: `name` does not exist on the backend User entity/API yet
  // (DEVELOPMENT_PLAN.md B11 UX Design's flagged gap) — mock-only field so
  // the User List's Name column has something to render/sort/filter against
  // until solutions-architect/backend-developer add it for real.
  name: string;
  email: string;
  roleId: string;
  isTenantMaster: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "9f4f2b1a-0001-4a4a-9c1a-000000000001",
    name: "Jane Doe",
    email: "jane@acme.com",
    roleId: "role-tenant-admin",
    isTenantMaster: true,
    mustChangePassword: false,
    createdAt: "2026-01-12",
    updatedAt: "2026-01-12",
  },
  {
    id: "9f4f2b1a-0001-4a4a-9c1a-000000000002",
    name: "Marco Ionescu",
    email: "marco@acme.com",
    roleId: "role-tenant-staff",
    isTenantMaster: false,
    mustChangePassword: true,
    createdAt: "2026-02-03",
    updatedAt: "2026-02-03",
  },
  {
    id: "9f4f2b1a-0001-4a4a-9c1a-000000000003",
    name: "Priya Nair",
    email: "priya@acme.com",
    roleId: "role-tenant-staff",
    isTenantMaster: false,
    mustChangePassword: false,
    createdAt: "2026-03-21",
    updatedAt: "2026-03-30",
  },
];

// The signed-in user for this mock pass — matches the "jane@acme.com" identity
// used throughout the mockups' header/avatar. Swap for the decoded JWT
// `user_id` once auth/session plumbing lands.
export const CURRENT_USER: MockUser = MOCK_USERS[0];

export function roleName(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.name ?? roleId;
}

export function initials(email: string): string {
  return email.slice(0, 1).toUpperCase();
}
