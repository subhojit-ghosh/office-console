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
import type { Project } from "@prisma/client";
import {
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconFoldersFilled,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";
import AppTable from "~/components/AppTable";
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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Project | null>(null);
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
      await utils.projects.getAll.invalidate();
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
          Are you sure you want to delete <strong>{project.name}</strong>? This cannot be undone.
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
            onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
          />
          <Select
            placeholder="All Status"
            clearable
            data={statusOptions}
            defaultValue={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value ?? "" })}
          />
          <Select
            placeholder="All Clients"
            clearable
            data={clientsQuery.data?.clients.map((c) => ({ value: c.id, label: c.name })) ?? []}
            defaultValue={filters.clientId}
            onChange={(value) => setFilters({ ...filters, clientId: value ?? "" })}
            disabled={clientsQuery.isLoading}
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
          { accessor: "name", title: "Name", sortable: true },
          { accessor: "status", title: "Status", sortable: true },
          {
            accessor: "client.name",
            title: "Client",
            render: (p) => p.client?.name ?? "-",
          },
          {
            accessor: "createdBy.name",
            title: "Created By",
            render: (p) => p.createdBy?.name || "-",
          },
          {
            accessor: "createdAt",
            title: "Created At",
            sortable: true,
            render: (row) => dayjs(row.createdAt).format("DD MMM YYYY hh:mm A"),
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
                    color="blue"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => {
                      setFormMode("edit");
                      setFormData(row);
                      setFormOpened(true);
                    }}
                  >
                    Edit
                  </Menu.Item>
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
        initialData={formData}
      />
    </>
  );
}
