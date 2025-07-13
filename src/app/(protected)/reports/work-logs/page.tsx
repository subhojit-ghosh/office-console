import type { Metadata } from "next";
import { env } from "~/env";
import WorkLogs from "./WorkLogs";

export const metadata: Metadata = {
  title: `Work Logs - Reports - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function WorkLogsPage() {
  return <WorkLogs />;
}
