import { Suspense } from "react";
import ClientForm from "./ClientForm";
import ClientsList from "./ClientsList";

import { api } from "~/trpc/server";

export default async function ClientsPage() {
  const clients = await api.clients.getAll();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsList initialData={clients} />
      <ClientForm />
    </Suspense>
  );
}
