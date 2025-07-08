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
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { UserRole, type Task, type TaskStatus } from "@prisma/client";
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
import { EditableBadgeDropdown } from "~/components/EditableBadgeDropdown";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_FILTERS,
  TASK_STATUS_OPTIONS,
} from "~/constants/task.constant";
import type { AppRouter } from "~/server/api/root";
import { api, apiClient } from "~/trpc/react";
import TaskForm from "./TaskForm";

type TasksResponse = inferRouterOutputs<AppRouter>["tasks"]["getAll"];

export default function TasksList() {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedStatusGroup, setSelectedStatusGroup] =
    useState<keyof typeof TASK_STATUS_FILTERS>("PENDING");
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<TasksResponse["tasks"][0]>
  >({
    columnAccessor: "dueDate",
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
    statuses: filters.status
      ? [filters.status as TaskStatus]
      : TASK_STATUS_FILTERS[selectedStatusGroup],
    projectId: filters.projectId || undefined,
    moduleId: filters.moduleId || undefined,
    priority: (filters.priority as Task["priority"]) || undefined,
    assignedToMe: filters.assignedToMe,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteTask = api.tasks.delete.useMutation({
    onSuccess: async () => {
      void utils.tasks.getAll.invalidate();
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
          <Button.Group ml="md">
            <Button
              variant={selectedStatusGroup == "PENDING" ? "filled" : "default"}
              onClick={() => setSelectedStatusGroup("PENDING")}
              size="xs"
            >
              Pending
            </Button>
            <Button
              variant={
                selectedStatusGroup == "COMPLETED" ? "filled" : "default"
              }
              onClick={() => setSelectedStatusGroup("COMPLETED")}
              size="xs"
              color="green"
            >
              Completed
            </Button>
          </Button.Group>
          <TextInput
            size="xs"
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
            data={TASK_STATUS_OPTIONS.filter((v) =>
              TASK_STATUS_FILTERS[selectedStatusGroup].includes(v.value),
            )}
            defaultValue={filters.status}
            onChange={(value) =>
              setFilters({ ...filters, status: value ?? "" })
            }
            style={{ width: 100 }}
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
                    filters.priority,
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
                label="Priority"
                placeholder="All Priority"
                clearable
                mb="sm"
                data={TASK_PRIORITY_OPTIONS}
                defaultValue={filters.priority}
                onChange={(value) =>
                  setFilters({ ...filters, priority: value ?? "" })
                }
              />
              <Select
                label="Project"
                placeholder="All Projects"
                clearable
                searchable
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
                searchable
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
            setEditId(null);
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
            width: "30%",
            render: (row) => {
              const status = TASK_STATUS_OPTIONS.find(
                (p) => p.value === row.status,
              );

              return (
                <UnstyledButton
                  onClick={() => {
                    setFormMode("edit");
                    setEditId(row.id);
                    setFormOpened(true);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 0,
                    textAlign: "left",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    size="sm"
                    fw={500}
                    c={status?.color}
                    lineClamp={2} // ✨ Allows 2 lines with ellipsis after that
                    title={row.title}
                    className="button-hover-underline"
                  >
                    {row.title}
                  </Text>
                </UnstyledButton>
              );
            },
          },
          {
            accessor: "status",
            title: "Status",
            sortable: true,
            render: (row) => (
              <EditableBadgeDropdown
                value={row.status}
                options={TASK_STATUS_OPTIONS}
                onChange={async (value) => {
                  const id = notifications.show({
                    loading: true,
                    message: "Updating status...",
                    autoClose: false,
                    withCloseButton: false,
                  });
                  await apiClient.tasks.updateField.mutate({
                    id: row.id,
                    key: "status",
                    value,
                  });
                  await utils.tasks.getAll.invalidate();
                  notifications.update({
                    id,
                    message: "Status updated successfully",
                    color: "green",
                    loading: false,
                    autoClose: 2000,
                    withCloseButton: true,
                  });
                }}
              />
            ),
          },
          {
            accessor: "priority",
            title: "Priority",
            sortable: true,
            render: (row) => (
              <EditableBadgeDropdown
                value={row.priority}
                options={TASK_PRIORITY_OPTIONS}
                onChange={async (value) => {
                  const id = notifications.show({
                    loading: true,
                    message: "Updating priority...",
                    autoClose: false,
                    withCloseButton: false,
                  });
                  await apiClient.tasks.updateField.mutate({
                    id: row.id,
                    key: "priority",
                    value,
                  });
                  await utils.tasks.getAll.invalidate();
                  notifications.update({
                    id,
                    message: "Priority updated successfully",
                    color: "green",
                    loading: false,
                    autoClose: 2000,
                    withCloseButton: true,
                  });
                }}
              />
            ),
          },
          {
            accessor: "module.name",
            title: "Module",
            render: (t) => t.module?.name ?? "-",
          },
          {
            accessor: "project.name",
            title: "Project",
            render: (t) => t.project?.name ?? "-",
          },
          {
            accessor: "dueDate",
            title: "Due Date",
            sortable: true,
            render: (row) => {
              if (!row.dueDate) return "-";
              const isOverdue =
                dayjs(row.dueDate).isBefore(dayjs(), "day") &&
                TASK_STATUS_FILTERS.PENDING.includes(row.status);
              return (
                <span style={isOverdue ? { color: "red" } : undefined}>
                  {dayjs(row.dueDate).format("DD MMM YYYY")}
                </span>
              );
            },
          },
          {
            accessor: "completedAt",
            title: "Completed At",
            hidden: selectedStatusGroup !== "COMPLETED",
            sortable: true,
            render: (row) => {
              if (!row.completedAt) return "-";
              return dayjs(row.completedAt).format("DD MMM YYYY");
            },
          },
          {
            accessor: "assignees",
            title: "Assignees",
            hidden: shouldHideAssignees,
            render: (row) => (
              <Avatar.Group spacing="xs">
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
            hidden: session?.user.role !== "ADMIN",
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
        close={() => {
          setFormOpened(false);
          setEditId(null);
        }}
        mode={formMode}
        id={editId}
      />
    </>
  );
}
