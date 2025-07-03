import type { Metadata } from "next";

import { env } from "~/env";

import UsersList from "./UsersList";

export const metadata: Metadata = {
  title: `Users - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function UsersPage() {
  return <UsersList />;
}
