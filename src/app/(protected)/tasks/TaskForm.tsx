"use client";

import {
  Badge,
  Button,
  Grid,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  Tabs,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { type Task } from "@prisma/generated/browser";
import {
  IconActivity,
  IconClockHour4,
  IconLink,
  IconMessage,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { zod4Resolver } from "mantine-form-zod-resolver";
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
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import { isClientRole } from "~/utils/roles";
import { TaskActivityFeed } from "./TaskActivityFeed";
import TaskComments from "./TaskComments";
import TaskLinks, { type TaskTemporaryLink } from "./TaskLinks";
import TaskWorkLogs from "./TaskWorkLogs";

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
  const [commentsCount, setCommentsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const [totalWorkLogMinutes, setTotalWorkLogMinutes] = useState(0);
  const [temporaryLinks, setTemporaryLinks] = useState<TaskTemporaryLink[]>([]);

  const handleAddTemporaryLink = (link: TaskTemporaryLink) => {
    setTemporaryLinks((prev) => [...prev, link]);
  };

  const handleRemoveTemporaryLink = (linkId: string) => {
    setTemporaryLinks((prev) => prev.filter((link) => link.id !== linkId));
  };

  const form = useForm({
    initialValues: {
      id: "",
      title: "",
      description: "",
      crId: "",
      type: "TASK",
      status: "PENDING",
      priority: "MEDIUM",
      projectId: null as string | null,
      moduleId: null as string | null,
      assigneeIds: [] as string[],
      dueDate: undefined,
      links: [], // Add links for schema validation
    },
    validate: zod4Resolver(
      mode === "add" ? createTaskSchema : updateTaskSchema,
    ),
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
      select: (data) => {
        if (!data) return data;
        return {
          ...data,
          client: data.client
            ? {
                id: data.client.id,
                name: data.client.name,
                crIdMandatoryTaskTypes: data.client.crIdMandatoryTaskTypes,
                moduleMandatoryForTasks: data.client.moduleMandatoryForTasks,
              }
            : null,
        };
      },
    },
  );

  const shouldHideAssignees = useMemo(() => {
    return (
      isClientRole(session?.user.role) && !session?.user.client?.showAssignees
    );
  }, [session?.user]);

  const isCrIdRequired = useMemo(() => {
    const crIdMandatoryTypes =
      projectMembersQuery.data?.client?.crIdMandatoryTaskTypes || [];
    const currentTaskType = form.values.type || "TASK";
    return crIdMandatoryTypes.includes(currentTaskType);
  }, [
    projectMembersQuery.data?.client?.crIdMandatoryTaskTypes,
    form.values.type,
  ]);

  const isModuleRequired = useMemo(() => {
    return projectMembersQuery.data?.client?.moduleMandatoryForTasks || false;
  }, [projectMembersQuery.data?.client?.moduleMandatoryForTasks]);

  useEffect(() => {
    if (mode === "add") {
      form.reset();
      form.setFieldValue("status", "TODO");
    }
    if (mode === "edit") {
      form.reset();
      setActivities([]);
      setCommentsCount(0);
      setLinksCount(0);
      setTotalWorkLogMinutes(0);
      setTemporaryLinks([]);
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
          crId: taskDetail.crId ?? "",
          type: taskDetail.type,
          status: taskDetail.status,
          priority: taskDetail.priority,
          projectId: taskDetail.projectId,
          moduleId: taskDetail.moduleId ?? null,
          assigneeIds: Array.isArray(taskDetail.assignees)
            ? taskDetail.assignees.map((u: { id: string }) => u.id)
            : [],
          dueDate: taskDetail.dueDate as never,
          links: [],
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
    // Ensure array fields are always arrays for zod validation
    const safeValues = {
      ...values,
      assigneeIds: values.assigneeIds || [],
      links: values.links || [],
    };

    // Zod validation is handled by the form resolver
    // If we reach here, zod validation passed, now do custom validation

    // Frontend validation for CR ID and module requirements
    const clientSettings = projectMembersQuery.data?.client;

    // Only validate CR ID and module requirements if we have project data
    if (projectMembersQuery.data && safeValues.projectId) {
      // Check CR ID requirement
      if (
        clientSettings?.crIdMandatoryTaskTypes?.includes(
          safeValues.type as Task["type"],
        )
      ) {
        if (!safeValues.crId || safeValues.crId.trim() === "") {
          notifications.show({
            title: "Validation Error",
            message: `CR ID is required for ${safeValues.type} tasks`,
            color: "red",
          });
          return;
        }
      }

      // Check module requirement
      if (clientSettings?.moduleMandatoryForTasks) {
        if (!safeValues.moduleId) {
          notifications.show({
            title: "Validation Error",
            message: "Module selection is required for tasks",
            color: "red",
          });
          return;
        }
      }
    }

    setLoading(true);
    if (mode === "add") {
      createTask.mutate({
        title: safeValues.title,
        description: safeValues.description,
        crId: safeValues.crId,
        type: safeValues.type as Task["type"],
        status: safeValues.status as Task["status"],
        priority: safeValues.priority as Task["priority"],
        projectId: safeValues.projectId!,
        moduleId: safeValues.moduleId,
        assigneeIds: safeValues.assigneeIds,
        dueDate: safeValues.dueDate,
        links: temporaryLinks,
      });
    } else if (mode === "edit" && id) {
      updateTask.mutate({
        id: safeValues.id,
        title: safeValues.title,
        description: safeValues.description,
        crId: safeValues.crId,
        type: safeValues.type as Task["type"],
        status: safeValues.status as Task["status"],
        priority: safeValues.priority as Task["priority"],
        projectId: safeValues.projectId!,
        moduleId: safeValues.moduleId,
        assigneeIds: safeValues.assigneeIds,
        dueDate: safeValues.dueDate,
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
                <Textarea
                  placeholder="Title"
                  {...form.getInputProps("title")}
                  withAsterisk
                  disabled={loading}
                  autosize
                  minRows={1}
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
                  styles={{
                    input: {
                      paddingTop: 5,
                    },
                  }}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <AppRichTextEditor
                  id={form.values.id}
                  content={form.values.description}
                  onUpdate={(content) =>
                    form.setFieldValue("description", content)
                  }
                  placeholder="Add description..."
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Tabs
                  variant="default"
                  defaultValue={
                    mode === "add" || isClientRole(session?.user.role)
                      ? "links"
                      : "comments"
                  }
                >
                  <Tabs.List>
                    {mode === "edit" && !isClientRole(session?.user.role) && (
                      <Tabs.Tab
                        value="comments"
                        leftSection={<IconMessage size={16} />}
                      >
                        Comments
                        {!!commentsCount && (
                          <Badge
                            variant="light"
                            ml="xs"
                            style={{
                              textTransform: "none",
                              cursor: "pointer",
                            }}
                          >
                            {commentsCount}
                          </Badge>
                        )}
                      </Tabs.Tab>
                    )}

                    <Tabs.Tab
                      value="links"
                      leftSection={<IconLink size={16} />}
                    >
                      Links
                      {!!linksCount && (
                        <Badge
                          variant="light"
                          ml="xs"
                          style={{ textTransform: "none", cursor: "pointer" }}
                        >
                          {linksCount}
                        </Badge>
                      )}
                    </Tabs.Tab>

                    {mode === "edit" && !isClientRole(session?.user.role) && (
                      <>
                        <Tabs.Tab
                          value="work-logs"
                          leftSection={<IconClockHour4 size={16} />}
                        >
                          Work Logs
                          {!!totalWorkLogMinutes && (
                            <Badge
                              variant="light"
                              ml="xs"
                              style={{
                                textTransform: "none",
                                cursor: "pointer",
                              }}
                            >
                              {formatDurationFromMinutes(totalWorkLogMinutes)}
                            </Badge>
                          )}
                        </Tabs.Tab>
                        <Tabs.Tab
                          value="activities"
                          leftSection={<IconActivity size={16} />}
                        >
                          Activities
                        </Tabs.Tab>
                      </>
                    )}
                  </Tabs.List>

                  <Tabs.Panel value="links" pt="md">
                    {mode === "edit" ? (
                      <TaskLinks
                        taskId={id!}
                        projectId={form.values.projectId}
                        onCountChange={setLinksCount}
                      />
                    ) : (
                      <TaskLinks
                        taskId={null}
                        projectId={form.values.projectId}
                        onCountChange={setLinksCount}
                        temporaryLinks={temporaryLinks}
                        onAddTemporaryLink={handleAddTemporaryLink}
                        onRemoveTemporaryLink={handleRemoveTemporaryLink}
                      />
                    )}
                  </Tabs.Panel>
                  {mode === "edit" && !isClientRole(session?.user.role) && (
                    <Tabs.Panel value="comments" pt="md">
                      <TaskComments
                        taskId={id!}
                        onCountChange={setCommentsCount}
                      />
                    </Tabs.Panel>
                  )}
                  {mode === "edit" && !isClientRole(session?.user.role) && (
                    <>
                      <Tabs.Panel value="work-logs" pt="md">
                        <TaskWorkLogs
                          taskId={id!}
                          onMinutesChange={setTotalWorkLogMinutes}
                        />
                      </Tabs.Panel>
                      <Tabs.Panel value="activities" pt="md">
                        <TaskActivityFeed activities={activities} />
                      </Tabs.Panel>
                    </>
                  )}
                </Tabs>
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
                  readOnly={mode === "edit"}
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
                  withAsterisk={isModuleRequired}
                  data={
                    modulesQuery.data?.map((m) => ({
                      value: m.id,
                      label: m.name,
                    })) ?? []
                  }
                  {...form.getInputProps("moduleId")}
                  disabled={
                    loading || modulesQuery.isLoading || !form.values.projectId
                  }
                  searchable
                  placeholder={
                    !form.values.projectId
                      ? "Select a project first"
                      : modulesQuery.isLoading
                        ? "Loading modules..."
                        : modulesQuery.data?.length
                          ? "Select module"
                          : "No modules available"
                  }
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="CR ID"
                  placeholder="Enter Change Request ID"
                  withAsterisk={isCrIdRequired}
                  {...form.getInputProps("crId")}
                  disabled={loading}
                />
              </Grid.Col>
              {!shouldHideAssignees && (
                <Grid.Col span={12}>
                  <MultiSelect
                    label="Assignees"
                    data={
                      projectMembersQuery.data?.members?.map((member) => ({
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
                        : projectMembersQuery.data?.members?.length
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
