"use client";

import {
  Button,
  Grid,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { UserRole, type Task } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { EditableBadgeDropdown } from "~/components/EditableBadgeDropdown";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "~/constants/task.constant";
import { createTaskSchema, updateTaskSchema } from "~/schemas/task.schema";
import { api, apiClient } from "~/trpc/react";

const AppRichTextEditor = dynamic(
  () => import("~/components/AppRichTextEditor"),
  {
    ssr: false,
  },
);

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  id?: string | null;
}

export default function TaskForm({ mode, opened, close, id }: Props) {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [editDataLoading, setEditDataLoading] = useState(false);

  const form = useForm({
    initialValues: {
      id: "",
      title: "",
      description: "",
      status: "PENDING",
      priority: "MEDIUM",
      projectId: null as string | null,
      moduleId: null as string | null,
      assigneeIds: [] as string[],
      dueDate: undefined,
    },
    validate: zodResolver(mode === "add" ? createTaskSchema : updateTaskSchema),
  });

  const projectsQuery = api.projects.getAll.useQuery({
    page: 1,
    pageSize: 100,
  });
  const modulesQuery = api.modules.getAll.useQuery({
    page: 1,
    pageSize: 100,
    projectId: form.values.projectId,
  });
  const usersQuery = api.users.getAll.useQuery({ page: 1, pageSize: 100 });

  const shouldHideAssignees = useMemo(() => {
    return (
      session?.user.role === UserRole.CLIENT &&
      !session?.user.client?.showAssignees
    );
  }, [session?.user]);

  useEffect(() => {
    if (mode === "add") {
      form.reset();
      form.setFieldValue("status", "TODO");
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
      const taskDetail = await apiClient.tasks.getById.query({ id });
      if (taskDetail) {
        form.setValues({
          id: taskDetail.id,
          title: taskDetail.title,
          description: taskDetail.description ?? "",
          status: taskDetail.status ?? "PENDING",
          priority: taskDetail.priority ?? "MEDIUM",
          projectId: taskDetail.projectId,
          moduleId: taskDetail.moduleId ?? "",
          assigneeIds: Array.isArray(taskDetail.assignees)
            ? taskDetail.assignees.map((u: { id: string }) => u.id)
            : [],
          dueDate: taskDetail.dueDate as never,
        });
      }
    } catch (error) {
      console.error("Error loading task details:", error);
      notifications.show({
        message: "Failed to load task details.",
        color: "red",
      });
    } finally {
      setEditDataLoading(false);
    }
  };

  const createTask = api.tasks.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Task has been created successfully.",
        color: "green",
      });
      setLoading(false);
      close();
      void utils.tasks.getAll.invalidate();
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
      void utils.tasks.getAll.invalidate();
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
    } else if (mode === "edit" && id) {
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
      centered
      size="90%"
      withCloseButton={false}
    >
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={9}>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  placeholder="Title"
                  {...form.getInputProps("title")}
                  withAsterisk
                  disabled={loading}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <AppRichTextEditor
                  content={form.values.description}
                  onUpdate={(content) =>
                    form.setFieldValue("description", content)
                  }
                />
              </Grid.Col>
            </Grid>
          </Grid.Col>
          <Grid.Col span={3}>
            <Grid>
              <Grid.Col span={6}>
                <EditableBadgeDropdown
                  value={form.values.status}
                  options={TASK_STATUS_OPTIONS}
                  onChange={(value) => form.setFieldValue("status", value)}
                  compact={false}
                  hoverEffect={false}
                  fullWidth={true}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <EditableBadgeDropdown
                  value={form.values.priority}
                  options={TASK_PRIORITY_OPTIONS}
                  onChange={(value) => form.setFieldValue("priority", value)}
                  compact={false}
                  hoverEffect={false}
                  fullWidth={true}
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
                  onChange={(value) => {
                    form.setFieldValue("moduleId", null);
                    form.setFieldValue("projectId", value);
                  }}
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
                  // searchable
                  placeholder={
                    modulesQuery.isLoading
                      ? "Loading modules..."
                      : modulesQuery.data?.modules.length
                        ? "Select module"
                        : "No modules available"
                  }
                />
              </Grid.Col>
              {!shouldHideAssignees && (
                <Grid.Col span={12}>
                  <MultiSelect
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
                    placeholder={
                      usersQuery.isLoading
                        ? "Loading users..."
                        : "Select assignees"
                    }
                  />
                </Grid.Col>
              )}
              <Grid.Col span={12}>
                <DateInput
                  label="Due Date"
                  valueFormat="DD MMM YYYY"
                  {...form.getInputProps("dueDate")}
                  disabled={loading}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Button
                  variant="default"
                  onClick={close}
                  type="button"
                  fullWidth
                >
                  Close
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Button loading={loading} type="submit" fullWidth>
                  Save
                </Button>
              </Grid.Col>
            </Grid>
          </Grid.Col>
        </Grid>
      </form>
    </Modal>
  );
}
