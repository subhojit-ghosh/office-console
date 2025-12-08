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
import { DatePickerInput, TimePicker, getTimeRange } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClockHour4,
  IconClockPlus,
  IconHourglassLow,
  IconInfoCircle,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { createWotkLogSchema } from "~/schemas/work-log.schema";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";

dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

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
      endTime: "20:00:00",
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
  onMinutesChange?: (minutes: number) => void;
}

export default function TaskWorkLogs({
  taskId,
  onMinutesChange,
}: TaskWorkLogProps) {
  const { data: session } = useSession();
  const { data: workLogs, refetch } = api.workLogs.getAll.useQuery(
    {
      taskId,
    },
    { enabled: !!taskId },
  );
  const [opened, { toggle }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const contributorDurations = useMemo(() => {
    if (!workLogs) return [];

    const map = new Map<string, { name: string; minutes: number }>();

    for (const log of workLogs) {
      const prev = map.get(log.user.id);
      if (prev) {
        prev.minutes += log.durationMin;
      } else {
        map.set(log.user.id, {
          name: log.user.name,
          minutes: log.durationMin,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [workLogs]);

  useEffect(() => {
    if (workLogs && onMinutesChange) {
      const totalMinutes = workLogs.reduce(
        (total, log) => total + log.durationMin,
        0,
      );
      onMinutesChange(totalMinutes);
    }
  }, [workLogs, onMinutesChange]);

  const form = useForm({
    initialValues: {
      taskId,
      date: new Date(),
      startTime: "",
      endTime: "",
      note: "",
    },
    validate: zod4Resolver(createWotkLogSchema),
  });

  // Auto-set end time to 1 hour after start time when start time is first set
  useEffect(() => {
    if (form.values.startTime && !form.values.endTime) {
      // Parse start time and add 1 hour
      const parseTime = (
        timeStr: string,
      ): { hours: number; minutes: number } | null => {
        const amPmMatch = timeStr.match(
          /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i,
        );
        if (amPmMatch) {
          let hours = parseInt(amPmMatch[1]!, 10);
          const minutes = parseInt(amPmMatch[2]!, 10);
          const isPm = amPmMatch[4]?.toUpperCase() === "PM";
          if (hours === 12) hours = isPm ? 12 : 0;
          else if (isPm) hours += 12;
          return { hours, minutes };
        }
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
          return {
            hours: parseInt(timeMatch[1]!, 10),
            minutes: parseInt(timeMatch[2]!, 10),
          };
        }
        return null;
      };

      const startParts = parseTime(form.values.startTime);
      if (startParts) {
        const endTimeObj = dayjs()
          .hour(startParts.hours)
          .minute(startParts.minutes)
          .add(1, "hour");
        // Format back to 12h format if original was 12h
        const is12h = form.values.startTime.match(/AM|PM/i);
        const endTimeStr = is12h
          ? endTimeObj.format("hh:mm A")
          : endTimeObj.format("HH:mm");
        form.setFieldValue("endTime", endTimeStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.startTime]);

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

    const { date, startTime, endTime } = form.values;
    const now = dayjs();

    if (!date || !startTime || !endTime) return;

    // Validate that date is not in the future
    if (dayjs(date).isAfter(now, "day")) {
      form.setFieldError("date", "Date cannot be in the future.");
      return;
    }

    if (!form.isValid()) return;

    // The schema will transform date + time strings to DateTime objects
    // and validate that times are on the same date and end > start
    createWorkLog.mutate({
      taskId,
      date,
      startTime,
      endTime,
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
        <div>
          {contributorDurations.map((c) => (
            <Badge
              key={c.name}
              variant="outline"
              style={{ textTransform: "none" }}
              mr="xs"
            >
              {c.name}: {c.minutes} min
            </Badge>
          ))}
        </div>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          leftSection={
            opened ? <IconX size={14} /> : <IconClockPlus size={14} />
          }
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
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
                <Grid.Col span={4}>
                  <DatePickerInput
                    label="Date"
                    valueFormat="MMM D, YYYY"
                    maxDate={new Date()}
                    {...form.getInputProps("date")}
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TimePicker
                    label="Start Time"
                    format="12h"
                    withDropdown
                    withSeconds={false}
                    popoverProps={{
                      withinPortal: false,
                      position: "top-start",
                      withArrow: true,
                    }}
                    presets={presets}
                    {...form.getInputProps("startTime")}
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TimePicker
                    label="End Time"
                    format="12h"
                    withDropdown
                    withSeconds={false}
                    popoverProps={{
                      withinPortal: false,
                      position: "top-start",
                      withArrow: true,
                    }}
                    presets={presets}
                    {...form.getInputProps("endTime")}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <Badge
                    color="gray"
                    variant="light"
                    leftSection={<IconHourglassLow size={12} />}
                    style={{ textTransform: "none" }}
                    mt={form.values.startTime && form.values.endTime ? 28 : 8}
                  >
                    {form.values.startTime &&
                    form.values.endTime &&
                    form.values.date
                      ? (() => {
                          try {
                            // Parse time strings (handles both 12h and 24h formats)
                            const parseTime = (
                              timeStr: string,
                            ): { hours: number; minutes: number } | null => {
                              const amPmMatch = timeStr.match(
                                /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i,
                              );
                              if (amPmMatch) {
                                let hours = parseInt(amPmMatch[1]!, 10);
                                const minutes = parseInt(amPmMatch[2]!, 10);
                                const isPm =
                                  amPmMatch[4]?.toUpperCase() === "PM";
                                if (hours === 12) hours = isPm ? 12 : 0;
                                else if (isPm) hours += 12;
                                return { hours, minutes };
                              }
                              const timeMatch = timeStr.match(
                                /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
                              );
                              if (timeMatch) {
                                return {
                                  hours: parseInt(timeMatch[1]!, 10),
                                  minutes: parseInt(timeMatch[2]!, 10),
                                };
                              }
                              return null;
                            };

                            const startParts = parseTime(form.values.startTime);
                            const endParts = parseTime(form.values.endTime);

                            if (startParts && endParts) {
                              const start = dayjs(form.values.date)
                                .hour(startParts.hours)
                                .minute(startParts.minutes);
                              const end = dayjs(form.values.date)
                                .hour(endParts.hours)
                                .minute(endParts.minutes);
                              const diffMinutes = end.diff(start, "minutes");
                              return diffMinutes > 0
                                ? `${diffMinutes} min`
                                : "--";
                            }
                            return "--";
                          } catch {
                            return "--";
                          }
                        })()
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
                {(!!form.errors.date ||
                  !!form.errors.startTime ||
                  !!form.errors.endTime) && (
                  <Grid.Col span={12}>
                    <Alert
                      variant="light"
                      color="red"
                      title={
                        form.errors.date ||
                        form.errors.startTime ||
                        form.errors.endTime
                      }
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
                {workLog.durationMin} min
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
