"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Popover,
  Select,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { UserRole, type Task } from "@prisma/client";
import {
  IconDotsVertical,
  IconFilter2,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FaTasks } from "react-icons/fa";
import AppTable from "~/components/AppTable";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import TaskForm from "./TaskForm";

const statusOptions = [
  { value: "BACKLOG", label: "Backlog", color: "gray" },
  { value: "TODO", label: "To Do", color: "violet" },
  { value: "IN_PROGRESS", label: "In Progress", color: "yellow" },
  { value: "IN_REVIEW", label: "In Review", color: "violet" },
  { value: "BLOCKED", label: "Blocked", color: "red" },
  { value: "DONE", label: "Done", color: "green" },
  { value: "CANCELED", label: "Canceled", color: "pink" },
];

const priorityOptions = [
  { value: "LOW", label: "Low", color: "gray" },
  { value: "MEDIUM", label: "Medium", color: "teal" },
  { value: "HIGH", label: "High", color: "orange" },
  { value: "URGENT", label: "Urgent", color: "red" },
];

type TasksResponse = inferRouterOutputs<AppRouter>["tasks"]["getAll"];

export default function TasksList() {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<TasksResponse["tasks"][0] | null>(
    null,
  );
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<TasksResponse["tasks"][0]>
  >({
    columnAccessor: "title",
    direction: "asc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      status: "",
      projectId: "",
      moduleId: "",
      priority: "",
      assignedToMe: false,
    },
    300,
  );

  const shouldHideAssignees = useMemo(() => {
    return (
      session?.user.role === UserRole.CLIENT &&
      !session?.user.client?.showAssignees
    );
  }, [session?.user]);

  const searchParams = useSearchParams();

  useEffect(() => {
    const currentFilters = { ...filters };

    const projectId = searchParams.get("projectId");
    if (projectId) {
      currentFilters.projectId = projectId;
    }

    const moduleId = searchParams.get("moduleId");
    if (moduleId) {
      currentFilters.moduleId = moduleId;
    }

    setFilters(currentFilters);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectsQuery = api.projects.getAll.useQuery({
    page: 1,
    pageSize: 100,
  });
  const modulesQuery = api.modules.getAll.useQuery({
    page: 1,
    pageSize: 100,
    projectId: filters.projectId,
  });

  const { data, isPending } = api.tasks.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    status: (filters.status as Task["status"]) || undefined,
    projectId: filters.projectId || undefined,
    moduleId: filters.moduleId || undefined,
    assignedToMe: filters.assignedToMe,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteTask = api.tasks.delete.useMutation({
    onSuccess: async () => {
      await utils.tasks.getAll.invalidate();
      notifications.show({
        message: "Task deleted successfully",
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

  const deleteConfirmation = (task: TasksResponse["tasks"][0]) => {
    modals.openConfirmModal({
      title: "Delete Task",
      children: (
        <Box>
          Are you sure you want to delete <strong>{task.title}</strong>? This
          cannot be undone.
        </Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTask.mutate({ id: task.id });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <FaTasks />
          <Title size="lg">Tasks</Title>
          <TextInput
            size="xs"
            ml="md"
            type="search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search by title"
            defaultValue={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.currentTarget.value })
            }
          />
          <Select
            size="xs"
            placeholder="All Status"
            clearable
            data={statusOptions}
            defaultValue={filters.status}
            onChange={(value) =>
              setFilters({ ...filters, status: value ?? "" })
            }
            style={{ width: 150 }}
          />
          <Select
            size="xs"
            placeholder="All Priority"
            clearable
            data={priorityOptions}
            defaultValue={filters.priority}
            onChange={(value) =>
              setFilters({ ...filters, priority: value ?? "" })
            }
            style={{ width: 150 }}
          />
          {!shouldHideAssignees && (
            <Switch
              label="Assigned to Me"
              size="xs"
              checked={filters.assignedToMe}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  assignedToMe: event.currentTarget.checked,
                })
              }
            />
          )}
          <Popover width={300} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Button
                variant="outline"
                size="xs"
                leftSection={<IconFilter2 size={14} />}
                rightSection={(() => {
                  const activeFilters = [
                    filters.projectId,
                    filters.moduleId,
                  ].filter(Boolean);
                  return activeFilters.length > 0 ? (
                    <Badge color="blue" size="sm" variant="light" circle>
                      {activeFilters.length}
                    </Badge>
                  ) : undefined;
                })()}
                color="cyan"
              >
                Filters
              </Button>
            </Popover.Target>
            <Popover.Dropdown bg="var(--mantine-color-body)">
              <Select
                label="Project"
                placeholder="All Projects"
                clearable
                mb="sm"
                data={
                  projectsQuery.data?.projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) ?? []
                }
                value={filters.projectId}
                onChange={(value) =>
                  setFilters({ ...filters, projectId: value ?? "" })
                }
                disabled={projectsQuery.isLoading}
                comboboxProps={{ withinPortal: false }}
              />
              <Select
                label="Module"
                placeholder="All Modules"
                clearable
                data={
                  modulesQuery.data?.modules.map((m) => ({
                    value: m.id,
                    label: m.name,
                  })) ?? []
                }
                value={filters.moduleId}
                onChange={(value) =>
                  setFilters({ ...filters, moduleId: value ?? "" })
                }
                disabled={modulesQuery.isLoading}
                comboboxProps={{ withinPortal: false }}
              />
            </Popover.Dropdown>
          </Popover>
        </Group>
        <Button
          style={{ float: "right" }}
          variant="outline"
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setFormMode("add");
            setFormData(null);
            setFormOpened(true);
          }}
        >
          Create
        </Button>
      </Group>
      <AppTable<TasksResponse["tasks"][0]>
        fetching={isPending}
        records={data?.tasks ?? []}
        totalRecords={data?.total}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          {
            accessor: "title",
            title: "Title",
            sortable: true,
            render: (row) => {
              const priority = priorityOptions.find(
                (p) => p.value === row.priority,
              );
              return (
                <Button
                  variant="transparent"
                  color={priority?.color}
                  p={0}
                  onClick={() => {
                    setFormMode("edit");
                    setFormData(row);
                    setFormOpened(true);
                  }}
                >
                  {row.title}
                </Button>
              );
            },
          },
          {
            accessor: "status",
            title: "Status",
            sortable: true,
            render: (row) => {
              const status = statusOptions.find((p) => p.value === row.status);
              return (
                <Badge color={status?.color} variant="transparent">
                  {row.status}
                </Badge>
              );
            },
          },
          {
            accessor: "priority",
            title: "Priority",
            sortable: true,
            render: (row) => {
              const priority = priorityOptions.find(
                (p) => p.value === row.priority,
              );
              return (
                <Badge color={priority?.color} variant="transparent">
                  {row.priority}
                </Badge>
              );
            },
          },
          {
            accessor: "project.name",
            title: "Project",
            render: (t) => t.project?.name ?? "-",
          },
          {
            accessor: "module.name",
            title: "Module",
            render: (t) => t.module?.name ?? "-",
          },
          {
            accessor: "dueDate",
            title: "Due Date",
            sortable: true,
            render: (row) => {
              if (!row.dueDate) return "-";
              const isOverdue = dayjs(row.dueDate).isBefore(dayjs(), "day");
              return (
                <span style={isOverdue ? { color: "red" } : undefined}>
                  {dayjs(row.dueDate).format("DD MMM YYYY")}
                </span>
              );
            },
          },
          {
            accessor: "assignees",
            title: "Assignees",
            hidden: shouldHideAssignees,
            render: (row) => (
              <Avatar.Group>
                {row.assignees.map((assignee) => (
                  <Tooltip key={assignee.id} label={assignee.name} withArrow>
                    <Avatar key={assignee.id} name={assignee.name} size="sm" />
                  </Tooltip>
                ))}
              </Avatar.Group>
            ),
          },
          {
            accessor: "actions",
            title: "",
            textAlign: "center",
            width: 100,
            render: (row) => (
              <Menu withArrow position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => deleteConfirmation(row)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ),
          },
        ]}
      />
      <TaskForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        initialData={formData}
      />
    </>
  );
}
