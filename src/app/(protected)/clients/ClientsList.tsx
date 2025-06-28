"use client";

import {
  ActionIcon,
  Box,
  Button,
  CloseButton,
  Grid,
  Group,
  LoadingOverlay,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import type { Client } from "@prisma/client";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";

import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import ClientForm from "./ClientForm";
import { useDebouncedState } from "@mantine/hooks";

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
      name: "",
    },
    300,
  );

  const { data, isPending } = api.clients.getAll.useQuery({
    page,
    pageSize,
    search: filters.name,
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
      <Group justify="space-between" align="center" mb="md">
        <Title size="lg">Clients</Title>
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
            placeholder="Search by name"
            leftSection={<IconSearch size={16} />}
            defaultValue={filters.name}
            onChange={(e) =>
              setFilters({ ...filters, name: e.currentTarget.value })
            }
          />
        </Grid.Col>
      </Grid>
      <DataTable<ClientsResponse["clients"][0]>
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
      <ClientForm
        opened={formOpened}
        close={() => setFormOpened(false)}
        mode={formMode}
        initialData={formData}
      />
    </>
  );
}
