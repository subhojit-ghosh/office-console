"use client";

import {
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { UserRole, type Project } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  createProjectSchema,
  updateProjectSchema,
} from "~/schemas/project.schema";
import { api } from "~/trpc/react";

const statusOptions = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On Hold" },
];

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  initialData?: Project | null;
}

export default function ProjectForm({
  mode,
  opened,
  close,
  initialData,
}: Props) {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const clientsQuery = api.clients.getAll.useQuery({ page: 1, pageSize: 100 });

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      description: "",
      status: "ONGOING",
      clientId: "",
      timeDisplayMultiplier: null as number | null,
    },
    validate: zodResolver(
      mode === "add" ? createProjectSchema : updateProjectSchema,
    ),
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
      if (session?.user.clientId) {
        form.setFieldValue("clientId", session.user.clientId);
      }
    }
    if (mode === "edit" && initialData) {
      form.setValues({
        id: initialData.id,
        name: initialData.name,
        description: initialData.description ?? "",
        status: initialData.status,
        clientId: initialData.clientId ?? "",
        timeDisplayMultiplier: initialData.timeDisplayMultiplier
          ? Number(initialData.timeDisplayMultiplier)
          : null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, opened]);

  const createProject = api.projects.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Project has been created successfully.",
        color: "green",
      });
      await utils.projects.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
      setLoading(false);
    },
  });

  const updateProject = api.projects.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Project has been updated successfully.",
        color: "green",
      });
      await utils.projects.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
      setLoading(false);
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    setLoading(true);
    if (mode === "add") {
      createProject.mutate({
        name: values.name,
        description: values.description,
        status: values.status as Project["status"],
        clientId: values.clientId ?? undefined,
        timeDisplayMultiplier: values.timeDisplayMultiplier,
      });
    } else if (mode === "edit" && initialData) {
      updateProject.mutate({
        id: values.id,
        name: values.name,
        description: values.description,
        status: values.status as Project["status"],
        clientId: values.clientId ?? undefined,
        timeDisplayMultiplier: values.timeDisplayMultiplier,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={mode === "add" ? "Add Project" : "Edit Project"}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              {...form.getInputProps("name")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Description"
              {...form.getInputProps("description")}
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Status"
              data={statusOptions}
              {...form.getInputProps("status")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          {session?.user.role !== UserRole.CLIENT && (
            <>
              <Grid.Col span={12}>
                <Select
                  label="Client"
                  data={
                    clientsQuery.data?.clients.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })) ?? []
                  }
                  {...form.getInputProps("clientId")}
                  disabled={loading || clientsQuery.isLoading}
                  searchable
                  clearable
                  placeholder={
                    clientsQuery.isLoading
                      ? "Loading clients..."
                      : "Select client"
                  }
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <NumberInput
                  label="Time Display Multiplier (Leave empty to inherit)"
                  description="This multiplier adjusts how tracked time is shown in the client view. For example: 1 shows the actual time, 2 doubles it, 0.5 shows half, and 3 triples it."
                  decimalScale={2}
                  {...form.getInputProps("timeDisplayMultiplier")}
                />
              </Grid.Col>
            </>
          )}
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
