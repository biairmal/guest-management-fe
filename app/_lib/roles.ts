// System-scope roles seeded by backend migration 000014. Hardcoded because
// the API has no roles endpoint — keep in sync with the seed.
// manageUsers mirrors the seeded role_permissions (manage_users); the backend
// still enforces it with a 403, this only hides UI the role can't use.
export const ROLES = [
  { id: "00000000-0000-0000-0000-000000000101", name: "Super Admin", manageUsers: true },
  { id: "00000000-0000-0000-0000-000000000102", name: "Tenant Admin", manageUsers: true },
  { id: "00000000-0000-0000-0000-000000000103", name: "Tenant Staff", manageUsers: false },
];

export function roleName(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.name ?? roleId;
}

export function canManageUsers(roleId: string | undefined): boolean {
  return ROLES.some((r) => r.id === roleId && r.manageUsers);
}
