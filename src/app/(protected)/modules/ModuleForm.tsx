"use client";

import {
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { UserRole } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  createModuleSchema,
  updateModuleSchema,
} from "~/schemas/module.schema";
import { api } from "~/trpc/react";
import { apiClient } from "~/trpc/react";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  id?: string | null;
}

export default function ModuleForm({ mode, opened, close, id }: Props) {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [editDataLoading, setEditDataLoading] = useState(false);

  const projectsQuery = api.projects.getAll.useQuery({
    page: 1,
    pageSize: 100,
  });

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      description: "",
      projectId: "",
      timeDisplayMultiplier: null as number | null,
    },
    validate: zodResolver(
      mode === "add" ? createModuleSchema : updateModuleSchema,
    ),
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
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
      const moduleDetail = await apiClient.modules.getById.query({ id });
      if (moduleDetail) {
        form.setValues({
          id: moduleDetail.id,
          name: moduleDetail.name,
          description: moduleDetail.description ?? "",
          projectId: moduleDetail.projectId ?? "",
          timeDisplayMultiplier: moduleDetail.timeDisplayMultiplier
            ? Number(moduleDetail.timeDisplayMultiplier)
            : null,
        });
      }
    } catch (error) {
      console.error("Error loading module details:", error);
      notifications.show({
        message: "Failed to load module details.",
        color: "red",
      });
    } finally {
      setEditDataLoading(false);
    }
  };

  const createModule = api.modules.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Module has been created successfully.",
        color: "green",
      });
      void utils.modules.getAll.invalidate();
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

  const updateModule = api.modules.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Module has been updated successfully.",
        color: "green",
      });
      void utils.modules.getAll.invalidate();
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
      createModule.mutate({
        name: values.name,
        description: values.description,
        projectId: values.projectId,
        timeDisplayMultiplier: values.timeDisplayMultiplier,
      });
    } else if (mode === "edit" && id) {
      updateModule.mutate({
        id: values.id,
        name: values.name,
        description: values.description,
        projectId: values.projectId,
        timeDisplayMultiplier: values.timeDisplayMultiplier,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={mode === "add" ? "Add Module" : "Edit Module"}
      centered
    >
      <LoadingOverlay visible={editDataLoading} />
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
              label="Project"
              data={
                projectsQuery.data?.projects.map((p) => ({
                  value: p.id,
                  label: p.name,
                })) ?? []
              }
              {...form.getInputProps("projectId")}
              disabled={loading || projectsQuery.isLoading}
              searchable
              withAsterisk
              placeholder={
                projectsQuery.isLoading
                  ? "Loading projects..."
                  : "Select project"
              }
            />
          </Grid.Col>
          {session?.user.role === UserRole.ADMIN && (
            <Grid.Col span={12}>
              <NumberInput
                label="Time Display Multiplier (Leave empty to inherit)"
                description="This multiplier adjusts how tracked time is shown in the client view. For example: 1 shows the actual time, 2 doubles it, 0.5 shows half, and 3 triples it."
                decimalScale={2}
                {...form.getInputProps("timeDisplayMultiplier")}
              />
            </Grid.Col>
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
