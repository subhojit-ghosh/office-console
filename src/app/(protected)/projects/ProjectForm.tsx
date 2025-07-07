"use client";

import {
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
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
import { api, apiClient } from "~/trpc/react";

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
  id?: string | null;
}

export default function ProjectForm({ mode, opened, close, id }: Props) {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [editDataLoading, setEditDataLoading] = useState(false);

  const clientsQuery = api.clients.getAll.useQuery({ page: 1, pageSize: 100 });
  const membersQuery = api.users.getAll.useQuery({ page: 1, pageSize: 100 });

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      description: "",
      status: "ONGOING",
      clientId: "",
      timeDisplayMultiplier: null as number | null,
      memberIds: [] as string[],
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
      if (session?.user.id) {
        form.setFieldValue("memberIds", [session.user.id]);
      }
    }
    if (mode === "edit") {
      form.reset();
      void loadDataForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, opened]);

  const loadDataForEdit = async () => {
    if (!id) return;
    try {
      setEditDataLoading(true);
      const projectDetail = await apiClient.projects.getById.query({ id });
      if (projectDetail) {
        form.setValues({
          id: projectDetail.id,
          name: projectDetail.name,
          description: projectDetail.description ?? "",
          status: projectDetail.status,
          clientId: projectDetail.clientId ?? "",
          timeDisplayMultiplier: projectDetail.timeDisplayMultiplier
            ? Number(projectDetail.timeDisplayMultiplier)
            : null,
          memberIds: projectDetail.members.map((member) => member.id) ?? [],
        });
      }
    } catch (error) {
      console.error("Error loading project details:", error);
      notifications.show({
        message: "Failed to load project details.",
        color: "red",
      });
    } finally {
      setEditDataLoading(false);
    }
  };

  const createProject = api.projects.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Project has been created successfully.",
        color: "green",
      });
      void utils.projects.getAll.invalidate();
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
      void utils.projects.getAll.invalidate();
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
        memberIds: values.memberIds,
      });
    } else if (mode === "edit" && id) {
      updateProject.mutate({
        id: values.id,
        name: values.name,
        description: values.description,
        status: values.status as Project["status"],
        clientId: values.clientId ?? undefined,
        timeDisplayMultiplier: values.timeDisplayMultiplier,
        memberIds: values.memberIds,
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
      title={mode === "add" ? "Add Project" : "Edit Project"}
    >
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              withAsterisk
              disabled={loading}
              {...form.getInputProps("name")}
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
          <Grid.Col span={12}>
            <MultiSelect
              label="Members"
              data={
                membersQuery.data?.users.map((user) => ({
                  value: user.id,
                  label: user.name,
                })) ?? []
              }
              value={form.values.memberIds}
              onChange={(value) => form.setFieldValue("memberIds", value)}
              disabled={loading}
            />
          </Grid.Col>
          {session?.user.role === UserRole.ADMIN && (
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
