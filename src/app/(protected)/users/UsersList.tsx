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
import type { User } from "@prisma/client";
import {
  IconDotsVertical,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";

import { FaUsers } from "react-icons/fa";
import AppTable from "~/components/AppTable";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import UserForm, { userRoleOptions } from "./UserForm";

type UsersResponse = inferRouterOutputs<AppRouter>["users"]["getAll"];

export default function UsersList() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<UsersResponse["users"][0]>
  >({
    columnAccessor: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      role: "",
    },
    300,
  );

  const { data, isPending } = api.users.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    role: (filters.role as User["role"]) || undefined,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteUser = api.users.delete.useMutation({
    onSuccess: async () => {
      void utils.users.getAll.invalidate();
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
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <FaUsers />
          <Title size="lg">Users</Title>
          <TextInput
            ml="md"
            type="search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search by name or email"
            style={{ width: 250 }}
            defaultValue={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.currentTarget.value })
            }
          />
          <Select
            placeholder="All Roles"
            clearable
            data={userRoleOptions}
            defaultValue={filters.role}
            onChange={(value) => setFilters({ ...filters, role: value ?? "" })}
          />
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
      <AppTable<UsersResponse["users"][0]>
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
            accessor: "name",
            title: "Name",
            sortable: true,
            render: (row) => (
              <Button
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
      <UserForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        id={editId}
      />
    </>
  );
}
