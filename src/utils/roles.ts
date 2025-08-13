export type UserRoleLike = string;

// NOTE: Keep legacy "CLIENT" check temporarily to support existing sessions/data during migration.
export function isClientRole(role: UserRoleLike | null | undefined): boolean {
  if (!role) return false;
  return role === "CLIENT_USER" || role === "CLIENT_ADMIN" || role === "CLIENT";
}

export function isClientAdmin(role: UserRoleLike | null | undefined): boolean {
  return role === "CLIENT_ADMIN";
}


