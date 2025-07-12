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
  IconX
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  TASK_LINK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "~/constants/task.constant";
import { createTaskLinkSchema } from "~/schemas/task.schema";
import { api } from "~/trpc/react";

interface TaskLinksProps {
  taskId: string;
}

export default function TaskLinks({ taskId }: TaskLinksProps) {
  const { data: session } = useSession();
  const { data: links, refetch } = api.tasks.getLinks.useQuery(
    {
      taskId,
    },
    { enabled: !!taskId },
  );
  const { outgoingLinks = [], incomingLinks = [] } = links ?? {};
  const { data: tasks } = api.tasks.getAll.useQuery({});
  const [opened, { toggle }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      type: null,
      sourceId: taskId,
      targetId: "",
    },
    validate: zodResolver(createTaskLinkSchema),
  });

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

    createLink.mutate({
      type: form.values.type!,
      sourceId: form.values.sourceId,
      targetId: form.values.targetId,
    });
  };

  const remove = (id: string) => {
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
                    data={TASK_LINK_TYPE_OPTIONS}
                    {...form.getInputProps("type")}
                  />
                </Grid.Col>
                <Grid.Col span={9}>
                  <Select
                    placeholder="Select Target Task"
                    data={tasks?.tasks.map((task) => ({
                      value: task.id,
                      label: task.title,
                    }))}
                    {...form.getInputProps("targetId")}
                    searchable
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

      {(incomingLinks.length > 0 || outgoingLinks.length > 0) && (
        <Stack gap="xs" mt="md">
          {incomingLinks.length > 0 && (
            <>
              {incomingLinks.map((link) => (
                <RenderLinkCard
                  key={link.id}
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
        </Stack>
      )}
    </>
  );
}

const RenderLinkCard = ({
  taskTitle,
  taskStatus,
  taskType,
  type,
  direction,
  onDelete,
}: {
  taskTitle: string;
  taskStatus: string;
  taskType: string;
  type: TaskLinkType;
  direction: "incoming" | "outgoing";
  onDelete: () => void;
}) => {
  const theme = useMantineTheme();
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
            className="button-hover-underline"
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
