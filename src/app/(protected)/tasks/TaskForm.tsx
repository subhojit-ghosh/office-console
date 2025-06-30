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
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import type { Task } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { zodResolver } from "mantine-form-zod-resolver";
import { useEffect, useState } from "react";
import { createTaskSchema, updateTaskSchema } from "~/schemas/task.schema";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";

type TasksResponse = inferRouterOutputs<AppRouter>["tasks"]["getAll"];

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  initialData?: TasksResponse["tasks"][0] | null;
}

export default function TaskForm({ mode, opened, close, initialData }: Props) {
  const utils = api.useUtils();
  const [loading, setLoading] = useState(false);
  const projectsQuery = api.projects.getAll.useQuery({
    page: 1,
    pageSize: 100,
  });
  const modulesQuery = api.modules.getAll.useQuery({ page: 1, pageSize: 100 });
  const usersQuery = api.users.getAll.useQuery({ page: 1, pageSize: 100 });

  const form = useForm({
    initialValues: {
      id: "",
      title: "",
      description: "",
      status: "PENDING",
      priority: "MEDIUM",
      projectId: "",
      moduleId: "",
      assigneeIds: [],
      dueDate: undefined,
    },
    validate: zodResolver(mode === "add" ? createTaskSchema : updateTaskSchema),
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
    }
    if (mode === "edit" && initialData) {
      form.setValues({
        id: initialData.id,
        title: initialData.title,
        description: initialData.description ?? "",
        status: initialData.status ?? "PENDING",
        priority: initialData.priority ?? "MEDIUM",
        projectId: initialData.projectId,
        moduleId: initialData.moduleId ?? "",
        assigneeIds: (initialData.assignees.map((u) => u.id) as never[]) ?? [],
        dueDate: initialData.dueDate as never,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, opened]);

  const createTask = api.tasks.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Task has been created successfully.",
        color: "green",
      });
      await utils.tasks.getAll.invalidate();
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

  const updateTask = api.tasks.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Task has been updated successfully.",
        color: "green",
      });
      await utils.tasks.getAll.invalidate();
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
      createTask.mutate({
        title: values.title,
        description: values.description,
        status: values.status as Task["status"],
        priority: values.priority as Task["priority"],
        projectId: values.projectId,
        moduleId: values.moduleId,
        assigneeIds: values.assigneeIds,
        dueDate: values.dueDate,
      });
    } else if (mode === "edit" && initialData) {
      updateTask.mutate({
        id: values.id,
        title: values.title,
        description: values.description,
        status: values.status as Task["status"],
        priority: values.priority as Task["priority"],
        projectId: values.projectId,
        moduleId: values.moduleId,
        assigneeIds: values.assigneeIds,
        dueDate: values.dueDate,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={mode === "add" ? "Create Task" : "Edit Task"}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Title"
              {...form.getInputProps("title")}
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
              data={[
                { value: "PENDING", label: "Pending" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "BLOCKED", label: "Blocked" },
                { value: "REVIEW", label: "Review" },
              ]}
              {...form.getInputProps("status")}
              disabled={loading}
              withAsterisk
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Priority"
              data={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
              {...form.getInputProps("priority")}
              disabled={loading}
              withAsterisk
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
          <Grid.Col span={12}>
            <Select
              label="Module"
              data={
                modulesQuery.data?.modules.map((m) => ({
                  value: m.id,
                  label: m.name,
                })) ?? []
              }
              {...form.getInputProps("moduleId")}
              disabled={loading || modulesQuery.isLoading}
              searchable
              placeholder={
                modulesQuery.isLoading ? "Loading modules..." : "Select module"
              }
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Assignees"
              data={
                usersQuery.data?.users.map((u) => ({
                  value: u.id,
                  label: u.name,
                })) ?? []
              }
              {...form.getInputProps("assigneeIds")}
              disabled={loading || usersQuery.isLoading}
              searchable
              multiple
              placeholder={
                usersQuery.isLoading ? "Loading users..." : "Select assignees"
              }
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <DateInput
              label="Due Date"
              valueFormat="DD MMM YYYY"
              {...form.getInputProps("dueDate")}
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Group justify="space-between">
              <Button variant="subtle" onClick={close} type="button">
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
