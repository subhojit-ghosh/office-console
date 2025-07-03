import type { Metadata } from "next";
import { env } from "~/env";

export const metadata: Metadata = {
  title: `Time - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function TimePage() {
  return "Under Development";
}
