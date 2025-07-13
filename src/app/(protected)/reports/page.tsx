import type { Metadata } from "next";
import { env } from "~/env";

export const metadata: Metadata = {
  title: `Reporting - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function ReportingPage() {
  return "Under Development";
}
