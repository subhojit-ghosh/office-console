"use client";

import {
  ActionIcon,
  Anchor,
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
import type { Module } from "@prisma/client";
import {
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useEffect, useState } from "react";
import AppTable from "~/components/AppTable";
import { api } from "~/trpc/react";
import ModuleForm from "./ModuleForm";
import { FaCubes } from "react-icons/fa";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ModulesResponse = inferRouterOutputs<AppRouter>["modules"]["getAll"];

export default function ModulesList() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Module | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ModulesResponse["modules"][0]>
  >({
    columnAccessor: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      projectId: "",
    },
    300,
  );

  const searchParams = useSearchParams();

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (projectId) {
      setFilters((f) => ({ ...f, projectId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectsQuery = api.projects.getAll.useQuery({
    page: 1,
    pageSize: 100,
  });

  const { data, isPending } = api.modules.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    projectId: filters.projectId || undefined,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteModule = api.modules.delete.useMutation({
    onSuccess: async () => {
      await utils.modules.getAll.invalidate();
      notifications.show({
        message: "Module deleted successfully",
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

  const deleteConfirmation = (module: ModulesResponse["modules"][0]) => {
    modals.openConfirmModal({
      title: "Delete Module",
      children: (
        <Box>
          Are you sure you want to delete <strong>{module.name}</strong>? This
          cannot be undone.
        </Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteModule.mutate({ id: module.id });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <FaCubes />
          <Title size="lg">Modules</Title>
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
            placeholder="All Projects"
            clearable
            searchable
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
      <AppTable<ModulesResponse["modules"][0]>
        fetching={isPending}
        records={data?.modules ?? []}
        totalRecords={data?.total}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          { accessor: "name", title: "Name", sortable: true },
          {
            accessor: "tasksCount",
            title: "Tasks",
            render: (m) => (
              <Anchor
                component={Link}
                href={`/tasks?projectId=${m.projectId}&moduleId=${m.id}`}
                underline="never"
              >
                {typeof m.tasksCount === "number" ? m.tasksCount : 0}
              </Anchor>
            ),
          },
          {
            accessor: "project.name",
            title: "Project",
            render: (m) => m.project?.name ?? "-",
          },
          {
            accessor: "createdBy.name",
            title: "Created By",
            render: (m) => m.createdBy?.name ?? "-",
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
      <ModuleForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        initialData={formData}
      />
    </>
  );
}
