import type { Metadata } from "next";

import ClientsList from "./ClientsList";
import { env } from "~/env";

export const metadata: Metadata = {
  title: `Clients - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function ClientsPage() {
  return <ClientsList />;
}
