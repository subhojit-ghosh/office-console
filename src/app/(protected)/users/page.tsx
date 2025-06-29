import type { Metadata } from "next";

import UsersList from "./UsersList";

export const metadata: Metadata = {
  title: "Users - Office Console",
};

export default async function UsersPage() {
  return <UsersList />;
}
