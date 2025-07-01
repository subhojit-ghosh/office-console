"use client";

import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Group,
  Menu,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import type { Client } from "@prisma/client";
import {
  IconBriefcase,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";

import { useDebouncedState } from "@mantine/hooks";
import Link from "next/link";
import AppTable from "~/components/AppTable";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import ClientForm from "./ClientForm";

type ClientsResponse = inferRouterOutputs<AppRouter>["clients"]["getAll"];

export default function ClientsList() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Client | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ClientsResponse["clients"][0]>
  >({
    columnAccessor: "name",
    direction: "desc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
    },
    300,
  );

  const { data, isPending } = api.clients.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteClient = api.clients.delete.useMutation({
    onSuccess: async () => {
      await utils.clients.getAll.invalidate();
      notifications.show({
        message: "Client deleted successfully",
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

  const deleteConfirmation = (client: ClientsResponse["clients"][0]) => {
    modals.openConfirmModal({
      title: "Delete Client",
      children: (
        <Box>
          Are you sure you want to delete <strong>{client.name}</strong>? This
          cannot be undone.
        </Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteClient.mutate({
          id: client.id,
        });
      },
    });
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconBriefcase />
          <Title size="lg">Clients</Title>
          <TextInput
            ml="md"
            type="search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search by name"
            defaultValue={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.currentTarget.value })
            }
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
      <AppTable
        fetching={isPending}
        records={data?.clients ?? []}
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
          },
          {
            accessor: "projectsCount",
            title: "Projects",
            render: (row) => (
              <Anchor
                component={Link}
                href={`/projects?clientId=${row.id}`}
                underline="never"
              >
                {typeof row.projectsCount === "number" ? row.projectsCount : 0}
              </Anchor>
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
      <ClientForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        initialData={formData}
      />
    </>
  );
}
