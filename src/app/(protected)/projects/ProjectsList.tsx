"use client";

import {
  ActionIcon,
  Anchor,
  Avatar,
  Box,
  Button,
  Group,
  Menu,
  Select,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { UserRole, type Project } from "@prisma/client";
import {
  IconDotsVertical,
  IconFoldersFilled,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { type DataTableSortStatus } from "mantine-datatable";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppTable from "~/components/AppTable";
import { TaskProgressRing } from "~/components/TaskProgressRing";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import ProjectForm from "./ProjectForm";

const statusOptions = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On Hold" },
];

type ProjectsResponse = inferRouterOutputs<AppRouter>["projects"]["getAll"];

export default function ProjectsList() {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ProjectsResponse["projects"][0]>
  >({
    columnAccessor: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      status: "",
      clientId: "",
    },
    300,
  );

  const searchParams = useSearchParams();

  useEffect(() => {
    const clientId = searchParams.get("clientId");
    if (clientId) {
      setFilters((f) => ({ ...f, clientId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientsQuery = api.clients.getAll.useQuery({ page: 1, pageSize: 100 });

  const { data, isPending } = api.projects.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    status: (filters.status as Project["status"]) || undefined,
    clientId: filters.clientId || undefined,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteProject = api.projects.delete.useMutation({
    onSuccess: async () => {
      void utils.projects.getAll.invalidate();
      notifications.show({
        message: "Project deleted successfully",
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

  const deleteConfirmation = (project: ProjectsResponse["projects"][0]) => {
    modals.openConfirmModal({
      title: "Delete Project",
      children: (
        <Box>
          Are you sure you want to delete <strong>{project.name}</strong>? This
          cannot be undone.
        </Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteProject.mutate({ id: project.id });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconFoldersFilled />
          <Title size="lg">Projects</Title>
          <TextInput
            ml="md"
            type="search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search by name"
            style={{ width: 250 }}
            defaultValue={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.currentTarget.value })
            }
          />
          <Select
            placeholder="All Status"
            clearable
            data={statusOptions}
            defaultValue={filters.status}
            onChange={(value) =>
              setFilters({ ...filters, status: value ?? "" })
            }
          />
          {session?.user.role === UserRole.ADMIN && (
            <Select
              placeholder="All Clients"
              clearable
              data={
                clientsQuery.data?.clients.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) ?? []
              }
              defaultValue={filters.clientId}
              onChange={(value) =>
                setFilters({ ...filters, clientId: value ?? "" })
              }
              disabled={clientsQuery.isLoading}
              style={{ width: 200 }}
            />
          )}
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
      <AppTable<ProjectsResponse["projects"][0]>
        fetching={isPending}
        records={data?.projects ?? []}
        totalRecords={data?.total}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          {
            accessor: "name",
            title: "Name",
            sortable: true,
            render: (row) => (
              <Button
                className="button-hover-underline"
                variant="transparent"
                p={0}
                onClick={() => {
                  setFormMode("edit");
                  setEditId(row.id);
                  setFormOpened(true);
                }}
              >
                {row.name}
              </Button>
            ),
          },
          {
            accessor: "modulesCount",
            title: "Modules",
            render: (p) => (
              <Anchor
                component={Link}
                href={`/modules?projectId=${p.id}`}
                c={p.modulesCount === 0 ? "dimmed" : "blue"}
              >
                {p.modulesCount === 0 ? "No Modules" : p.modulesCount}
              </Anchor>
            ),
          },
          {
            accessor: "tasksCount",
            title: "Tasks",
            render: (p) => (
              <Anchor
                component={Link}
                href={`/tasks?projectId=${p.id}`}
                c={p.tasksCount === 0 ? "dimmed" : "blue"}
              >
                {p.tasksCount === 0
                  ? "No Tasks"
                  : `${p.completedTasksCount}/${p.tasksCount}`}
              </Anchor>
            ),
          },
          {
            accessor: "completedTasksCount",
            title: "Progress",
            render: (p) => (
              <TaskProgressRing
                completed={p.completedTasksCount}
                total={p.tasksCount}
              />
            ),
          },
          {
            accessor: "status",
            title: "Status",
            sortable: true,
          },
          {
            accessor: "client.name",
            title: "Client",
            hidden: session?.user.role !== UserRole.ADMIN,
            render: (p) => p.client?.name ?? "-",
          },
          {
            accessor: "members",
            title: "Members",
            render: (row) => (
              <Avatar.Group spacing="xs">
                {row.members.map((member) => (
                  <Tooltip key={member.id} label={member.name} withArrow>
                    <Avatar key={member.id} name={member.name} size="sm" />
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
      <ProjectForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        id={editId}
      />
    </>
  );
}
