import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import type { TaskLinkType } from "@prisma/client";
import {
  IconCheck,
  IconLink,
  IconLinkPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  TASK_LINK_DIRECTIONAL_OPTIONS,
  TASK_STATUS_FILTERS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "~/constants/task.constant";
import { createTaskLinkSchema } from "~/schemas/task.schema";
import { api } from "~/trpc/react";

export interface TaskTemporaryLink {
  id: string;
  type: TaskLinkType;
  targetId: string;
  title: string;
  status: string;
  taskType: string;
}

export interface TaskLinksProps {
  taskId: string | null;
  projectId?: string | null;
  temporaryLinks?: TaskTemporaryLink[];
  onAddTemporaryLink?: (link: TaskTemporaryLink) => void;
  onRemoveTemporaryLink?: (linkId: string) => void;
  onCountChange?: (count: number) => void;
}

export default function TaskLinks({
  taskId,
  projectId,
  temporaryLinks = [],
  onAddTemporaryLink,
  onRemoveTemporaryLink,
  onCountChange,
}: TaskLinksProps) {
  const theme = useMantineTheme();
  const { data: links, refetch } = api.tasks.getLinks.useQuery(
    {
      taskId: taskId!,
    },
    { enabled: !!taskId },
  );
  const { outgoingLinks = [], incomingLinks = [] } = links ?? {};
  const { data: tasks } = api.tasks.getAllMinimal.useQuery(
    {
      statuses: TASK_STATUS_FILTERS.PENDING,
      projectId,
    },
    {
      enabled: !!projectId,
    },
  );
  const [opened, { toggle }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (outgoingLinks && incomingLinks && onCountChange) {
      onCountChange(incomingLinks.length + outgoingLinks.length);
    }
  }, [outgoingLinks, incomingLinks, onCountChange]);

  const form = useForm({
    initialValues: {
      directionType: null as string | null,
      type: "",
      sourceId: taskId ?? crypto.randomUUID(),
      targetId: null as string | null,
    },
    validate: zodResolver(createTaskLinkSchema),
  });

  useEffect(() => {
    form.setFieldValue("type", form.values.directionType?.split(":")[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.directionType]);

  const createLink = api.tasks.createLink.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      void refetch();
      notifications.show({
        message: "Link created successfully",
        color: "green",
      });
      form.reset();
      toggle();
    },
    onError: (error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const deleteLink = api.tasks.deleteLink.useMutation({
    onSuccess: async () => {
      void refetch();
      notifications.show({
        message: "Link deleted successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    form.validate();

    if (!form.isValid()) return;

    const [type, direction] = form.values.directionType?.split(":") as [
      TaskLinkType,
      "incoming" | "outgoing",
    ];

    const newLink = {
      id: crypto.randomUUID(),
      type,
      sourceId: direction === "outgoing" ? taskId! : form.values.targetId!,
      targetId: direction === "outgoing" ? form.values.targetId! : taskId!,
    };

    if (taskId) {
      createLink.mutate(newLink);
    } else if (onAddTemporaryLink) {
      const task = tasks?.find((t) => t.id === form.values.targetId);

      if (!task) {
        notifications.show({
          message: "Target task not found",
          color: "red",
        });
        return;
      }

      onAddTemporaryLink({
        ...newLink,
        status: task.status,
        title: task.title,
        taskType: task.type,
      });

      form.reset();
      toggle();
    }
  };

  const remove = (id: string) => {
    if (taskId) {
      modals.openConfirmModal({
        title: "Delete Link",
        children: (
          <Box>Are you sure you want to delete? This cannot be undone.</Box>
        ),
        labels: { confirm: "Delete", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: () => {
          deleteLink.mutate({ id });
        },
      });
    } else if (onRemoveTemporaryLink) {
      onRemoveTemporaryLink(id);
    }
  };

  return (
    <>
      <Group justify="space-between" gap="xs" mb="md">
        <Badge
          leftSection={<IconLink size={14} />}
          variant="light"
          color={
            incomingLinks.some((l) => l.type === "BLOCKS")
              ? "red"
              : incomingLinks.length > 0
                ? "orange"
                : "blue"
          }
          style={{ textTransform: "none" }}
        >
          {incomingLinks.length} Incoming • {outgoingLinks.length} Outgoing
        </Badge>
        <Button
          variant="subtle"
          size="xs"
          leftSection={
            opened ? <IconX size={14} /> : <IconLinkPlus size={14} />
          }
          onClick={() => toggle()}
          color={opened ? "red" : "blue"}
        >
          {opened ? "Cancel" : "Add"}
        </Button>
      </Group>

      <Collapse in={opened}>
        <Paper withBorder p="sm" mb="md">
          <Grid>
            <Grid.Col span={11}>
              <Grid>
                <Grid.Col span={3}>
                  <Select
                    placeholder="Select Link Type"
                    data={TASK_LINK_DIRECTIONAL_OPTIONS}
                    {...form.getInputProps("directionType")}
                    comboboxProps={{ withinPortal: false }}
                  />
                </Grid.Col>
                <Grid.Col span={9}>
                  <Select
                    placeholder="Select Target Task"
                    data={[
                      {
                        group: "Pending Tasks",
                        items:
                          tasks
                            ?.filter((task) => task.id !== taskId)
                            .map((task) => ({
                              value: task.id,
                              label: task.title,
                            })) ?? [],
                      },
                    ]}
                    {...form.getInputProps("targetId")}
                    comboboxProps={{ withinPortal: false }}
                    searchable
                    renderOption={({ option }) => {
                      const task = tasks?.find((t) => t.id === option.value);

                      const status = TASK_STATUS_OPTIONS.find(
                        (p) => p.value === task?.status,
                      );
                      const type = TASK_TYPE_OPTIONS.find(
                        (t) => t.value === task?.type,
                      );

                      return (
                        <Group gap="xs" align="center" wrap="nowrap">
                          {type && (
                            <type.icon
                              size={18}
                              color={theme.colors[type.color][4]}
                            />
                          )}
                          <Text
                            size="sm"
                            fw={500}
                            c={status?.color}
                            lineClamp={2}
                            style={{ flex: 1 }}
                          >
                            {option.label}
                          </Text>
                        </Group>
                      );
                    }}
                  />
                </Grid.Col>
              </Grid>
            </Grid.Col>
            <Grid.Col span={1}>
              <Tooltip label="Submit" withArrow>
                <ActionIcon
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  variant="light"
                  color="blue"
                  size="lg"
                  w={"100%"}
                  h={"100%"}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              </Tooltip>
            </Grid.Col>
          </Grid>
        </Paper>
      </Collapse>

      {(incomingLinks.length > 0 ||
        outgoingLinks.length > 0 ||
        temporaryLinks.length > 0) && (
        <Stack gap="xs" mt="md">
          {incomingLinks.length > 0 && (
            <>
              {incomingLinks.map((link) => (
                <RenderLinkCard
                  key={link.id}
                  taskId={link.source.id}
                  taskTitle={link.source.title}
                  taskStatus={link.source.status}
                  taskType={link.source.type}
                  type={link.type}
                  direction="incoming"
                  onDelete={() => remove(link.id)}
                />
              ))}
              <Divider />
            </>
          )}

          {outgoingLinks.length > 0 && (
            <>
              {outgoingLinks.map((link) => (
                <RenderLinkCard
                  key={link.id}
                  taskId={link.target.id}
                  taskTitle={link.target.title}
                  taskStatus={link.target.status}
                  taskType={link.target.type}
                  type={link.type}
                  direction="outgoing"
                  onDelete={() => remove(link.id)}
                />
              ))}
            </>
          )}

          {temporaryLinks.length > 0 && (
            <>
              {temporaryLinks.map((link) => (
                <RenderLinkCard
                  key={link.id}
                  taskId={link.targetId}
                  taskTitle={link.title}
                  taskStatus={link.status}
                  taskType={link.taskType}
                  type={link.type}
                  direction="outgoing"
                  onDelete={() => remove(link.id)}
                  isTaskCliclkable={false}
                />
              ))}
            </>
          )}
        </Stack>
      )}
    </>
  );
}

const RenderLinkCard = ({
  taskId,
  taskTitle,
  taskStatus,
  taskType,
  type,
  direction,
  onDelete,
  isTaskCliclkable = true,
}: {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskType: string;
  type: TaskLinkType;
  direction: "incoming" | "outgoing";
  onDelete: () => void;
  isTaskCliclkable?: boolean;
}) => {
  const theme = useMantineTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const badgeText =
    type === "BLOCKS"
      ? direction === "incoming"
        ? "Is Blocked By"
        : "Blocks"
      : direction === "incoming"
        ? "Is Required By"
        : "Depends On";

  const badgeColor =
    type === "BLOCKS"
      ? direction === "incoming"
        ? "red"
        : "blue"
      : direction === "incoming"
        ? "orange"
        : "yellow";

  const taskStatusOption = TASK_STATUS_OPTIONS.find(
    (p) => p.value === taskStatus,
  );
  const taskTypeOption = TASK_TYPE_OPTIONS.find((t) => t.value === taskType);

  return (
    <Paper withBorder px={4} py={1} mb="xs">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group
          gap="xs"
          align="center"
          wrap="nowrap"
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Badge color={badgeColor} variant="light" radius="sm">
            {badgeText}
          </Badge>

          {taskTypeOption && (
            <taskTypeOption.icon
              size={18}
              color={theme.colors[taskTypeOption.color][4]}
            />
          )}

          <Text
            size="sm"
            fw={500}
            c={taskStatusOption?.color}
            lineClamp={2}
            style={{ flex: 1, minWidth: 0 }}
            className={isTaskCliclkable ? "button-hover-underline" : ""}
            onClick={() => {
              if (!isTaskCliclkable) return;

              const params = new URLSearchParams(searchParams);
              params.set("selectedTask", taskId);
              router.push(`?${params.toString()}`);
            }}
          >
            {taskTitle}
          </Text>

          <Badge
            color={taskStatusOption?.color ?? "gray"}
            variant="outline"
            size="xs"
            radius="sm"
          >
            {taskStatusOption?.label}
          </Badge>
        </Group>

        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onDelete}
          title="Remove Link"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
