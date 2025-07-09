"use client";

import {
  Button,
  Grid,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  Tabs,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { UserRole, type Task } from "@prisma/client";
import { IconActivity } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import AppRichTextEditor from "~/components/AppRichTextEditor";
import { EditableBadgeDropdown } from "~/components/EditableBadgeDropdown";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "~/constants/task.constant";
import { createTaskSchema, updateTaskSchema } from "~/schemas/task.schema";
import type { AppRouter } from "~/server/api/root";
import { api, apiClient } from "~/trpc/react";
import { TaskActivityFeed } from "./TaskActivityFeed";

type TaskGetByIdResponse = inferRouterOutputs<AppRouter>["tasks"]["getById"];

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
  const [activities, setActivities] = useState<
    NonNullable<TaskGetByIdResponse>["activities"]
  >([]);

  const form = useForm({
    initialValues: {
      id: "",
      title: "",
      description: "",
      type: "TASK",
      status: "PENDING",
      priority: "MEDIUM",
      projectId: null as string | null,
      moduleId: null as string | null,
      assigneeIds: [] as string[],
      dueDate: undefined,
    },
    validate: zodResolver(mode === "add" ? createTaskSchema : updateTaskSchema),
  });

  const projectsQuery = api.projects.getAllMinimal.useQuery();
  const modulesQuery = api.modules.getAllMinimal.useQuery({
    projectId: form.values.projectId,
  });
  const projectMembersQuery = api.projects.getById.useQuery(
    {
      id: form.values.projectId!,
    },
    {
      enabled: !!form.values.projectId,
    },
  );

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
      setActivities([]);
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
          type: taskDetail.type,
          status: taskDetail.status,
          priority: taskDetail.priority,
          projectId: taskDetail.projectId,
          moduleId: taskDetail.moduleId ?? "",
          assigneeIds: Array.isArray(taskDetail.assignees)
            ? taskDetail.assignees.map((u: { id: string }) => u.id)
            : [],
          dueDate: taskDetail.dueDate as never,
        });
        setActivities(taskDetail.activities);
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
        type: values.type as Task["type"],
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
        type: values.type as Task["type"],
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
          <Grid.Col span={9} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  placeholder="Title"
                  {...form.getInputProps("title")}
                  withAsterisk
                  disabled={loading}
                  leftSectionWidth={70}
                  leftSection={
                    <EditableBadgeDropdown
                      value={form.values.type}
                      options={TASK_TYPE_OPTIONS}
                      onChange={(value) => form.setFieldValue("type", value)}
                      compact={false}
                      hoverEffect={false}
                      fullWidth={true}
                      position="bottom-start"
                      isIconVariant={true}
                      variant="subtle"
                    />
                  }
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <AppRichTextEditor
                  id={form.values.id}
                  content={form.values.description}
                  onUpdate={(content) =>
                    form.setFieldValue("description", content)
                  }
                />
              </Grid.Col>
              {mode == "edit" && (
                <Grid.Col span={12}>
                  <Tabs variant="outline" defaultValue="activities">
                    <Tabs.List>
                      <Tabs.Tab
                        value="activities"
                        leftSection={<IconActivity size={12} />}
                      >
                        Activities
                      </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="activities" pt="md">
                      <TaskActivityFeed activities={activities} />
                    </Tabs.Panel>
                  </Tabs>
                </Grid.Col>
              )}
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
                    projectsQuery.data?.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })) ?? []
                  }
                  {...form.getInputProps("projectId")}
                  onChange={(value) => {
                    form.setFieldValue("moduleId", null);
                    form.setFieldValue("assigneeIds", []);
                    form.setFieldValue("projectId", value);
                  }}
                  disabled={loading || projectsQuery.isLoading}
                  searchable
                  withAsterisk
                  placeholder={
                    projectsQuery.isLoading
                      ? "Loading projects..."
                      : projectsQuery.data?.length
                        ? "Select project"
                        : "No projects available"
                  }
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select
                  label="Module"
                  data={
                    modulesQuery.data?.map((m) => ({
                      value: m.id,
                      label: m.name,
                    })) ?? []
                  }
                  {...form.getInputProps("moduleId")}
                  disabled={loading || modulesQuery.isLoading}
                  searchable
                  placeholder={
                    modulesQuery.isLoading
                      ? "Loading modules..."
                      : modulesQuery.data?.length
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
                      projectMembersQuery.data?.members.map((member) => ({
                        value: member.id,
                        label: member.name,
                      })) ?? []
                    }
                    {...form.getInputProps("assigneeIds")}
                    disabled={loading || projectMembersQuery.isLoading}
                    searchable
                    placeholder={
                      projectMembersQuery.isLoading
                        ? "Loading project members..."
                        : projectMembersQuery.data?.members.length
                          ? "Select assignees"
                          : "No project members available"
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
