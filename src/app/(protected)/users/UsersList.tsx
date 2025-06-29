"use client";

import {
  ActionIcon,
  Box,
  Button,
  Grid,
  Group,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import type { User } from "@prisma/client";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";

import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import UserForm from "./UserForm";

type UsersResponse = inferRouterOutputs<AppRouter>["users"]["getAll"];

export default function UsersList() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<User | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<UsersResponse["users"][0]>
  >({
    columnAccessor: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
    },
    300,
  );

  const { data, isPending } = api.users.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteUser = api.users.delete.useMutation({
    onSuccess: async () => {
      await utils.users.getAll.invalidate();
      notifications.show({
        message: "User deleted successfully",
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

  const deleteConfirmation = (user: UsersResponse["users"][0]) => {
    modals.openConfirmModal({
      title: "Delete User",
      children: (
        <Box>
          Are you sure you want to delete <strong>{user.name}</strong>? This
          cannot be undone.
        </Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteUser.mutate({ id: user.id });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" align="center" mb="md">
        <Title size="lg">Users</Title>
        <Button
          variant="filled"
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setFormMode("add");
            setFormData(null);
            setFormOpened(true);
          }}
        >
          Add
        </Button>
      </Group>
      <Grid mb="md">
        <Grid.Col span={6}>
          <TextInput
            type="search"
            placeholder="Search by name or email"
            leftSection={<IconSearch size={16} />}
            defaultValue={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.currentTarget.value })
            }
          />
        </Grid.Col>
      </Grid>
      <DataTable<UsersResponse["users"][0]>
        fetching={isPending}
        records={data?.users ?? []}
        totalRecords={data?.total}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          {
            accessor: "actions",
            title: <Box mr={6}>Actions</Box>,
            textAlign: "center",
            width: 100,
            render: (row) => (
              <Group gap={4} justify="center" wrap="nowrap">
                <Tooltip label="Edit" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setFormMode("edit");
                      setFormData(row);
                      setFormOpened(true);
                    }}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => deleteConfirmation(row)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ),
          },
          { accessor: "name", title: "Name", sortable: true },
          { accessor: "email", title: "Email", sortable: true },
          { accessor: "role", title: "Role", sortable: true },
          {
            accessor: "isActive",
            title: "Active",
            render: (row) => (row.isActive ? "Yes" : "No"),
          },
          {
            accessor: "createdAt",
            title: "Created At",
            sortable: true,
            render: (row) => dayjs(row.createdAt).format("DD MMM YYYY hh:mm A"),
          },
        ]}
        minHeight={455}
        borderRadius="sm"
        withTableBorder
        withColumnBorders
        withRowBorders
      />
      <UserForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        initialData={formData}
      />
    </>
  );
}
