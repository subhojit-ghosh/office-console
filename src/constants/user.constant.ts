import { UserRole } from "@prisma/client";

export const userRoleOptions = [
  { value: UserRole.ADMIN, label: "Admin" },
  { value: UserRole.STAFF, label: "Staff" },
  { value: UserRole.CLIENT_ADMIN, label: "Client Admin" },
  { value: UserRole.CLIENT_USER, label: "Client User" },
];
