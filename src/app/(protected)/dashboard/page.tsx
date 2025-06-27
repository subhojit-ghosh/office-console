import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();
  return <code>{JSON.stringify(session, null, 4)}</code>;
}
