import type { Metadata } from "next";
import DashboardStats from "./DashboardStats";

export const metadata: Metadata = {
  title: "Dashboard - Office Console",
};

export default async function DashboardPage() {
  return <DashboardStats />;
}
