"use client";

import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Select,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import type { Task } from "@prisma/client";
import {
  IconDotsVertical,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaTasks } from "react-icons/fa";
import AppTable from "~/components/AppTable";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import TaskForm from "./TaskForm";

const statusOptions = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
  { value: "CANCELED", label: "Canceled" },
];

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

type TasksResponse = inferRouterOutputs<AppRouter>["tasks"]["getAll"];

export default function TasksList() {
  const utils = api.useUtils();
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
    },
    300,
  );

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
          <Select
            size="xs"
            placeholder="All Projects"
            clearable
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
            style={{ width: 200 }}
          />
          <Select
            size="xs"
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
            style={{ width: 200 }}
          />
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
            render: (row) => (
              <Button
                variant="transparent"
                p={0}
                onClick={() => {
                  setFormMode("edit");
                  setFormData(row);
                  setFormOpened(true);
                }}
              >
                {row.title}
              </Button>
            ),
          },
          {
            accessor: "status",
            title: "Status",
            sortable: true,
          },
          {
            accessor: "priority",
            title: "Priority",
            sortable: true,
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
            render: (row) =>
              row.dueDate ? dayjs(row.dueDate).format("DD MMM YYYY") : "-",
          },
          // {
          //   accessor: "createdAt",
          //   title: "Created At",
          //   sortable: true,
          //   render: (row) => dayjs(row.createdAt).format("DD MMM YYYY hh:mm A"),
          // },
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
