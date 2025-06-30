"use client";

import {
  Button,
  Grid,
  Group,
  Modal,
  Select,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import type { Module } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useEffect, useState } from "react";
import {
  createModuleSchema,
  updateModuleSchema,
} from "~/schemas/module.schema";
import { api } from "~/trpc/react";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  initialData?: Module | null;
}

export default function ModuleForm({
  mode,
  opened,
  close,
  initialData,
}: Props) {
  const utils = api.useUtils();
  const [loading, setLoading] = useState(false);

  const projectsQuery = api.projects.getAll.useQuery({ page: 1, pageSize: 100 });

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      description: "",
      projectId: "",
    },
    validate: zodResolver(
      mode === "add" ? createModuleSchema : updateModuleSchema,
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
        description: initialData.description ?? "",
        projectId: initialData.projectId ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, opened]);

  const createModule = api.modules.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Module has been created successfully.",
        color: "green",
      });
      await utils.modules.getAll.invalidate();
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
      await utils.modules.getAll.invalidate();
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
      });
    } else if (mode === "edit" && initialData) {
      updateModule.mutate({
        id: values.id,
        name: values.name,
        description: values.description,
        projectId: values.projectId,
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
                projectsQuery.isLoading ? "Loading projects..." : "Select project"
              }
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
