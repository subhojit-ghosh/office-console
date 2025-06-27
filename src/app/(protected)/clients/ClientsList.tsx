"use client";

import type { Client } from "@prisma/client";
import { api } from "~/trpc/react";

interface Props {
  initialData: Client[];
}

export default function ClientsList({ initialData }: Props) {
  const { data: clients, isPending } = api.clients.getAll.useQuery(undefined, {
    initialData,
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {JSON.stringify(
        clients.map((v) => v.name),
        null,
        4,
      )}
    </div>
  );
}
