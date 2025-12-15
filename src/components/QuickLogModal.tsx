"use client";

import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Badge,
  Grid,
  ThemeIcon,
  useMantineTheme,
  Combobox,
  useCombobox,
  InputBase,
  Input,
  Paper,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput, TimePicker, getTimeRange } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconClock, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState, useMemo, useEffect } from "react";
import {
  TASK_STATUS_MAP,
  TASK_TYPE_MAP,
  type TaskStatus,
  type TaskType,
} from "~/constants/task.constant";
import { api } from "~/trpc/react";

interface QuickLogModalProps {
  opened: boolean;
  onClose: () => void;
  preSelectedTaskId?: string;
}

// Time preset configurations for quick duration buttons
const timePresets = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
];

// Time preset groups for TimePicker dropdown
const timePickerPresets = [
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

export default function QuickLogModal({
  opened,
  onClose,
  preSelectedTaskId,
}: QuickLogModalProps) {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.focusTarget();
      setSearch("");
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
  });

  // Fetch recent tasks for suggestions
  const { data: recentTasks } = api.workLogs.getRecentTasks.useQuery(
    { limit: 20, includeTaskId: preSelectedTaskId },
    { enabled: opened }
  );

  const form = useForm({
    initialValues: {
      taskId: preSelectedTaskId ?? "",
      date: new Date(),
      startTime: "",
      endTime: "",
      note: "",
    },
    validate: {
      taskId: (value) => (value ? null : "Please select a task"),
      date: (value) => (value ? null : "Date is required"),
      startTime: (value) => (value ? null : "Start time is required"),
      endTime: (value) => (value ? null : "End time is required"),
    },
  });

  // Update form when preSelectedTaskId changes
  useEffect(() => {
    if (preSelectedTaskId) {
      form.setFieldValue("taskId", preSelectedTaskId);
    }
  }, [form, preSelectedTaskId]);

  const createWorkLog = api.workLogs.create.useMutation({
    onMutate: () => setLoading(true),
    onSuccess: () => {
      notifications.show({
        message: "Work log created successfully",
        color: "green",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
    onSettled: () => setLoading(false),
  });

  // Calculate duration
  const duration = useMemo(() => {
    const { date, startTime, endTime } = form.values;
    if (!date || !startTime || !endTime) return null;

    // Parse time strings
    const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
      const amPmMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(timeStr);
      if (amPmMatch) {
        let hours = parseInt(amPmMatch[1]!, 10);
        const minutes = parseInt(amPmMatch[2]!, 10);
        const isPm = amPmMatch[4]?.toUpperCase() === "PM";
        if (hours === 12) hours = isPm ? 12 : 0;
        else if (isPm) hours += 12;
        return { hours, minutes };
      }
      const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
      if (timeMatch) {
        return {
          hours: parseInt(timeMatch[1]!, 10),
          minutes: parseInt(timeMatch[2]!, 10),
        };
      }
      return null;
    };

    const startParts = parseTime(startTime);
    const endParts = parseTime(endTime);
    if (!startParts || !endParts) return null;

    const start = dayjs(date).hour(startParts.hours).minute(startParts.minutes);
    const end = dayjs(date).hour(endParts.hours).minute(endParts.minutes);
    const diffMinutes = end.diff(start, "minute");

    if (diffMinutes <= 0) return null;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }, [form.values]);

  // Select options for tasks
  type TaskOption = {
    value: string;
    label: string;
    type: TaskType;
    status: TaskStatus;
    title: string;
    project: string;
    module: string | null;
  };

  const taskOptions = useMemo(() => {
    if (!recentTasks) return [];

    return recentTasks.map((task) => {
      const projectName = task.project.name;
      const moduleName = task.module?.name;
      const label = moduleName
        ? `${task.title} (${projectName} / ${moduleName})`
        : `${task.title} (${projectName})`;

      return {
        value: task.id,
        label,
        type: task.type as TaskType,
        status: task.status as TaskStatus,
        title: task.title,
        project: projectName,
        module: moduleName ?? null,
      } satisfies TaskOption;
    });
  }, [recentTasks]);

  const selectedTask = useMemo(
    () => taskOptions.find((t) => t.value === form.values.taskId),
    [taskOptions, form.values.taskId]
  );

  // Apply time preset
  const applyPreset = (minutes: number) => {
    const now = dayjs();
    const start = now.subtract(minutes, "minute");
    const selectedDate = form.values.date || now.toDate();
    
    // TimePicker expects time in hh:mm:ss format (24-hour) as a string
    // It will automatically format it for display based on format="12h" prop
    const startTime = dayjs(selectedDate)
      .hour(start.hour())
      .minute(start.minute())
      .second(0)
      .format("HH:mm:ss");
    const endTime = dayjs(selectedDate)
      .hour(now.hour())
      .minute(now.minute())
      .second(0)
      .format("HH:mm:ss");
    
    form.setValues({
      date: selectedDate,
      startTime,
      endTime,
    });
  };

  const handleSubmit = () => {
    const { taskId, date, startTime, endTime, note } = form.values;

    if (!taskId || !date || !startTime || !endTime) {
      return;
    }

    const now = dayjs();

    // Validate that date is not in the future
    if (dayjs(date).isAfter(now, "day")) {
      form.setFieldError("date", "Date cannot be in the future");
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
      note: note.trim() ? note : null,
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const renderTaskOption = (taskOption: TaskOption) => {
    const typeConfig = TASK_TYPE_MAP[taskOption.type];
    const statusConfig = TASK_STATUS_MAP[taskOption.status];

    return (
      <Group gap="sm" wrap="nowrap">
        {typeConfig && (
          <ThemeIcon
            size="md"
            variant="light"
            color={typeConfig.color}
            radius="xl"
          >
            <typeConfig.icon size={16} />
          </ThemeIcon>
        )}
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {taskOption.title}
          </Text>
          <Group gap={6}>
            <Text size="xs" c="dimmed">
              {taskOption.project}
              {taskOption.module ? ` / ${taskOption.module}` : ""}
            </Text>
            <Badge
              size="xs"
              variant="dot"
              color={statusConfig?.color ?? "gray"}
            >
              {statusConfig?.label ?? taskOption.status}
            </Badge>
          </Group>
        </div>
      </Group>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconClock size={20} />
          <Text fw={600}>Quick Log Time</Text>
        </Group>
      }
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {/* Task Selection */}
          {/* Task Selection */}
          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(val) => {
              form.setFieldValue("taskId", val);
              setSearch("");
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              {selectedTask ? (
                <Paper withBorder p="xs" radius="md" bg="var(--mantine-color-body)">
                  <Group justify="space-between" wrap="nowrap">
                    {renderTaskOption(selectedTask)}
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => form.setFieldValue("taskId", "")}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ) : (
                <InputBase
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  onClick={() => combobox.toggleDropdown()}
                  rightSectionPointerEvents="none"
                  label="Task"
                  withAsterisk
                  description="Select a task to log time for"
                >
                  {selectedTask ?? (
                    <Input.Placeholder>Select a task</Input.Placeholder>
                  )}
                </InputBase>
              )}
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Search
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  combobox.updateSelectedOptionIndex();
                }}
                placeholder="Search tasks..."
              />
              <Combobox.Options>
                {taskOptions.length > 0 ? (
                  taskOptions
                    .filter((item) =>
                      item.label.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((item) => (
                      <Combobox.Option value={item.value} key={item.value}>
                        {renderTaskOption(item)}
                      </Combobox.Option>
                    ))
                ) : (
                  <Combobox.Empty>No tasks found</Combobox.Empty>
                )}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          {/* Quick Time Presets */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              Quick Presets
            </Text>
            <Group gap="xs">
              {timePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="light"
                  size="xs"
                  onClick={() => applyPreset(preset.minutes)}
                >
                  {preset.label}
                </Button>
              ))}
            </Group>
          </div>

          {/* Date and Time Entry */}
          <Grid>
            <Grid.Col span={12}>
              <DatePickerInput
                label="Date"
                placeholder="Select date"
                valueFormat="MMM D, YYYY"
                maxDate={new Date()}
                withAsterisk
                {...form.getInputProps("date")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TimePicker
                label="Start Time"
                format="12h"
                withDropdown
                withSeconds={false}
                withAsterisk
                presets={timePickerPresets}
                {...form.getInputProps("startTime")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TimePicker
                label="End Time"
                format="12h"
                withDropdown
                withSeconds={false}
                withAsterisk
                presets={timePickerPresets}
                {...form.getInputProps("endTime")}
              />
            </Grid.Col>
          </Grid>

          {/* Duration Display */}
          {duration && (
            <Badge variant="light" size="lg" color="violet">
              Duration: {duration}
            </Badge>
          )}

          {/* Note */}
          <Textarea
            label="Note (optional)"
            placeholder="Add any notes about this work..."
            minRows={2}
            {...form.getInputProps("note")}
          />

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Log Time
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
