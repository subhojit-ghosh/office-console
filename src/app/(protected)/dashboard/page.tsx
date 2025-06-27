import { api } from "~/trpc/server";

export default async function DashboardPage() {
  const stats = await api.dashboard.stats();

  return <code>{JSON.stringify(stats)}</code>;
}
