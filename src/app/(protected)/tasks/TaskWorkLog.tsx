import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Collapse,
  Grid,
  Group,
  Paper,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { DateTimePicker, getTimeRange } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClockHour4,
  IconClockPlus,
  IconHourglassEmpty,
  IconHourglassLow,
  IconInfoCircle,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { createWotkLogSchema } from "~/schemas/work-log.schema";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";

dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

const minDate = dayjs()
  .subtract(1, "week")
  .startOf("day")
  .format("YYYY-MM-DD HH:mm:ss");
const maxDate = dayjs().format("YYYY-MM-DD HH:mm:ss");
const presets = [
  {
    label: "Morning",
    values: getTimeRange({
      startTime: "10:00:00",
      endTime: "11:30:00",
      interval: "00:30:00",
    }),
  },
  {
    label: "Afternoon",
    values: getTimeRange({
      startTime: "12:00:00",
      endTime: "16:30:00",
      interval: "00:30:00",
    }),
  },
  {
    label: "Evening",
    values: getTimeRange({
      startTime: "17:00:00",
      endTime: "19:30:00",
      interval: "00:30:00",
    }),
  },
];

function formatStartEndTime(start: Date, end: Date): string {
  const startDay = dayjs(start);
  const endDay = dayjs(end);

  if (startDay.isSame(endDay, "day")) {
    return `${startDay.format("MMM D, YYYY")} @ ${startDay.format("h:mm A")} → ${endDay.format("h:mm A")}`;
  } else {
    return `${startDay.format("MMM D, YYYY @ h:mm A")} → ${endDay.format("MMM D, YYYY @ h:mm A")}`;
  }
}

interface TaskWorkLogProps {
  taskId: string;
}

export default function TaskWorkLog({ taskId }: TaskWorkLogProps) {
  const { data: session } = useSession();
  const { data: workLogs, refetch } = api.workLogs.getByTaskId.useQuery(
    {
      taskId,
    },
    { enabled: !!taskId },
  );
  const [opened, { toggle }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      taskId,
      startTime: undefined,
      endTime: undefined,
      note: "",
    },
    validate: zodResolver(createWotkLogSchema),
  });

  useEffect(() => {
    form.setFieldValue("endTime", form.values.startTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.startTime]);

  const totalDuration = useMemo(() => {
    if (!workLogs || workLogs.length === 0) return 0;

    return workLogs.reduce((total, log) => {
      return total + log.durationMin;
    }, 0);
  }, [workLogs]);

  const createWorkLog = api.workLogs.create.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      void refetch();
      notifications.show({
        message: "Work log created successfully",
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

  const deleteWorkLog = api.workLogs.delete.useMutation({
    onSuccess: async () => {
      void refetch();
      notifications.show({
        message: "Work log deleted successfully",
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

    const { startTime, endTime } = form.values;
    const now = dayjs();

    if (!startTime || !endTime) return;

    const start = dayjs(startTime);
    const end = dayjs(endTime);

    if (end.isSameOrBefore(start)) {
      form.setFieldError("date", "End time must be after start time.");
      return;
    }

    if (start.isAfter(now) || end.isAfter(now)) {
      form.setFieldError("date", "Start and end time cannot be in the future.");
      return;
    }

    if (!form.isValid()) return;

    createWorkLog.mutate({
      taskId,
      startTime: startTime,
      endTime: endTime,
      note: form.values.note,
    });
  };

  const remove = (id: string) => {
    modals.openConfirmModal({
      title: "Delete Work Log",
      children: (
        <Box>Are you sure you want to delete? This cannot be undone.</Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteWorkLog.mutate({ id });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" gap="xs" mb="md">
        <Badge
          leftSection={
            totalDuration ? (
              <IconHourglassLow size={14} />
            ) : (
              <IconHourglassEmpty size={14} />
            )
          }
          variant="light"
          color={totalDuration ? "green" : "red"}
          style={{ textTransform: "none" }}
        >
          {totalDuration ? formatDurationFromMinutes(totalDuration) : "--"}
        </Badge>
        <Button
          variant="subtle"
          size="xs"
          leftSection={
            opened ? <IconX size={14} /> : <IconClockPlus size={14} />
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
                <Grid.Col span={5}>
                  <DateTimePicker
                    placeholder="Start Date & Time"
                    minDate={minDate}
                    maxDate={maxDate}
                    valueFormat="MMM D, YYYY @ h:mm A"
                    timePickerProps={{
                      format: "12h",
                      withDropdown: true,
                      popoverProps: {
                        withinPortal: false,
                        position: "top-start",
                        withArrow: true,
                      },
                      presets,
                    }}
                    {...form.getInputProps("startTime")}
                  />
                </Grid.Col>
                <Grid.Col span={5}>
                  <DateTimePicker
                    placeholder="End Date & Time"
                    minDate={minDate}
                    maxDate={maxDate}
                    valueFormat="MMM D, YYYY @ h:mm A"
                    timePickerProps={{
                      format: "12h",
                      withDropdown: true,
                      popoverProps: {
                        withinPortal: false,
                        position: "top-start",
                        withArrow: true,
                      },
                      presets,
                    }}
                    {...form.getInputProps("endTime")}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <Badge
                    color="gray"
                    variant="light"
                    leftSection={<IconHourglassLow size={12} />}
                    style={{ textTransform: "none" }}
                    mt={8}
                  >
                    {form.values.startTime && form.values.startTime
                      ? formatDurationFromMinutes(
                          dayjs(form.values.endTime).diff(
                            dayjs(form.values.startTime),
                            "minutes",
                          ),
                        )
                      : "--"}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea
                    placeholder="Optional Note"
                    w="100%"
                    {...form.getInputProps("note")}
                    autosize
                    maxRows={4}
                  />
                </Grid.Col>
                {!!form.errors.date && (
                  <Grid.Col span={12}>
                    <Alert
                      variant="light"
                      color="red"
                      title={form.errors.date}
                      icon={<IconInfoCircle />}
                    />
                  </Grid.Col>
                )}
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

      {workLogs?.map((workLog) => (
        <Grid key={workLog.id} mb="md" align="flex-start">
          <Grid.Col span="content">
            <Avatar size="sm" name={workLog.user.name} />
          </Grid.Col>

          <Grid.Col span="auto">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {workLog.user.name}
              </Text>

              {session?.user.id === workLog.user.id && (
                <Tooltip label="Delete" withArrow>
                  <ActionIcon
                    size="sm"
                    color="gray"
                    variant="subtle"
                    onClick={() => remove(workLog.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>

            <Group gap="xs" mt={2}>
              <Text size="sm" c="dimmed">
                <IconClockHour4 size={14} style={{ marginBottom: -2 }} />{" "}
                {formatStartEndTime(workLog.startTime, workLog.endTime)}
              </Text>

              <Badge
                size="sm"
                color="gray"
                variant="light"
                leftSection={<IconHourglassLow size={12} />}
                style={{ textTransform: "none" }}
              >
                {formatDurationFromMinutes(workLog.durationMin)}
              </Badge>
            </Group>

            {workLog.note && (
              <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>
                {workLog.note}
              </Text>
            )}
          </Grid.Col>
        </Grid>
      ))}
    </>
  );
}
