"use client";

import {
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Switch,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import type { Client } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useEffect, useState } from "react";

import {
  createClientSchema,
  updateClientSchema,
} from "~/schemas/client.schema";
import { api } from "~/trpc/react";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  initialData?: Client | null;
}

export default function ClientForm({
  mode,
  opened,
  close,
  initialData,
}: Props) {
  const utils = api.useUtils();

  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      timeDisplayMultiplier: 1,
      showAssignees: true,
    },
    validate: zodResolver(
      mode === "add" ? createClientSchema : updateClientSchema,
    ),
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
    }

    if (mode === "edit" && initialData) {
      form.setValues({
        id: initialData.id,
        name: initialData.name,
        timeDisplayMultiplier: Number(initialData.timeDisplayMultiplier),
        showAssignees: initialData.showAssignees,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, mode, opened]);

  const createClient = api.clients.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Client has been created successfully.",
        color: "green",
      });
      await utils.clients.getAll.invalidate();
      form.reset();
      close();
    },
    onError: (error) => {
      form.setFieldError("name", error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const updateClient = api.clients.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Client has been updated successfully.",
        color: "green",
      });
      await utils.clients.getAll.invalidate();
      form.reset();
      close();
    },
    onError: (error) => {
      form.setFieldError("name", error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const submitHandler = () => {
    setLoading(true);
    if (mode === "add") {
      createClient.mutate({
        name: form.values.name,
        timeDisplayMultiplier: form.values.timeDisplayMultiplier,
        showAssignees: form.values.showAssignees,
      });
    } else if (mode === "edit" && initialData) {
      updateClient.mutate({
        id: form.values.id,
        name: form.values.name,
        timeDisplayMultiplier: form.values.timeDisplayMultiplier,
        showAssignees: form.values.showAssignees,
      });
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={mode === "add" ? "Add Client" : "Edit Client"}
    >
      <form onSubmit={form.onSubmit(submitHandler)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              withAsterisk
              {...form.getInputProps("name")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <NumberInput
              label="Time Display Multiplier"
              description="This multiplier adjusts how tracked time is shown for this client. For example: 1 shows the actual time, 2 doubles it, 0.5 shows half, and 3 triples it."
              decimalScale={2}
              {...form.getInputProps("timeDisplayMultiplier")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Switch
              defaultChecked
              label="Show Assignees"
              {...form.getInputProps("showAssignees", { type: "checkbox" })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Group justify="space-between">
              <Button variant="subtle" onClick={() => close()}>
                Cancel
              </Button>
              <Button loading={loading} type="submit">
                Save
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </form>
    </Modal>
  );
}
