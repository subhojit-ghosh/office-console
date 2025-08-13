import { UserRole } from "@prisma/client";

// NOTE: Keep legacy "CLIENT" check temporarily to support existing sessions/data during migration.
export function isClientRole(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return role === UserRole.CLIENT_USER || role === UserRole.CLIENT_ADMIN;
}

export function isClientAdmin(role: UserRole | null | undefined): boolean {
  return role === UserRole.CLIENT_ADMIN;
}


