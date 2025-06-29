import type { Metadata } from "next";

import ClientsList from "./ClientsList";

export const metadata: Metadata = {
  title: "Clients - Office Console",
};

export default async function ClientsPage() {
  return <ClientsList />;
}
