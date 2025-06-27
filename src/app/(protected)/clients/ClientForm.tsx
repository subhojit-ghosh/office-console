"use client";

import { Button, Input } from "@mantine/core";
import { useState } from "react";

import { api } from "~/trpc/react";

export default function ClientForm() {
  const utils = api.useUtils();
  const [name, setName] = useState("");

  const createClient = api.clients.create.useMutation({
    onSuccess: async () => {
      await utils.clients.getAll.invalidate();
      setName("");
    },
    onError: (error) => {
      alert(error.message || "Failed to create client");
    },
  });

  return (
    <div>
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        onClick={() => createClient.mutate({ name })}
        loading={createClient.isPending}
      >
        Submit
      </Button>
    </div>
  );
}
