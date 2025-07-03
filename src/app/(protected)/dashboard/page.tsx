import type { Metadata } from "next";
import { env } from "~/env";
import DashboardStats from "./DashboardStats";

export const metadata: Metadata = {
  title: `Dashboard - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function DashboardPage() {
  return <DashboardStats />;
}
