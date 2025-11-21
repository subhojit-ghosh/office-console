"use client";

import {
  Button,
  Group,
  Modal,
  Select,
  type SelectProps,
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
import { DateTimePicker } from "@mantine/dates";
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

// Time preset configurations
const timePresets = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
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
      startTime: null as Date | null,
      endTime: null as Date | null,
      note: "",
    },
    validate: {
      taskId: (value) => (value ? null : "Please select a task"),
      startTime: (value) => (value ? null : "Start time is required"),
      endTime: (value) => (value ? null : "End time is required"),
    },
  });

  // Update form when preSelectedTaskId changes
  useEffect(() => {
    if (preSelectedTaskId) {
      form.setFieldValue("taskId", preSelectedTaskId);
    }
  }, [preSelectedTaskId]);

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
    const { startTime, endTime } = form.values;
    if (!startTime || !endTime) return null;

    const start = dayjs(startTime);
    const end = dayjs(endTime);
    const diffMinutes = end.diff(start, "minute");

    if (diffMinutes <= 0) return null;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }, [form.values.startTime, form.values.endTime]);

  // Select options for tasks
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
        module: moduleName,
      };
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
    
    form.setValues({
      startTime: start.toDate(),
      endTime: now.toDate(),
    });
  };

  const handleSubmit = () => {
    const { taskId, startTime, endTime, note } = form.values;

    if (!taskId || !startTime || !endTime) {
      return;
    }

    const start = dayjs(startTime);
    const end = dayjs(endTime);
    const now = dayjs();

    if (end.isBefore(start)) {
      form.setFieldError("endTime", "End time must be after start time");
      return;
    }

    if (start.isAfter(now) || end.isAfter(now)) {
      form.setFieldError("startTime", "Times cannot be in the future");
      return;
    }

    if (!form.isValid()) return;

    createWorkLog.mutate({
      taskId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      note: note || null,
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const renderSelectOption: SelectProps["renderOption"] = ({ option }) => {
    const taskOption = option as unknown as {
      value: string;
      label: string;
      type: TaskType;
      status: TaskStatus;
      title: string;
      project: string;
      module?: string;
    };

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
              {taskOption.project} {taskOption.module ? `/ ${taskOption.module}` : ""}
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
                    {renderSelectOption({
                      option: {
                        value: selectedTask.value,
                        label: selectedTask.label,
                        type: selectedTask.type,
                        status: selectedTask.status,
                        title: selectedTask.title,
                        project: selectedTask.project,
                        module: selectedTask.module,
                      } as any,
                    })}
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
                  {selectedTask || <Input.Placeholder>Select a task</Input.Placeholder>}
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
                        {renderSelectOption({ option: item })}
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

          {/* Time Entry */}
          <Grid>
            <Grid.Col span={6}>
              <DateTimePicker
                label="Start Time"
                placeholder="Select start time"
                valueFormat="MM D, YYYY @ h:mm A"
                withAsterisk
                maxDate={new Date()}
                timePickerProps={{
                  format: "12h",
                }}
                {...form.getInputProps("startTime")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateTimePicker
                label="End Time"
                placeholder="Select end time"
                valueFormat="MMM D, YYYY @ h:mm A"
                withAsterisk
                maxDate={new Date()}
                timePickerProps={{
                  format: "12h",
                }}
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
