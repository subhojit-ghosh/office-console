"use client";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Select,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useSession } from "next-auth/react";
import {
  IconDotsVertical,
  IconFilter2,
  IconHelp,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";
import AppTable from "~/components/AppTable";
import {
  TICKET_STATUS_OPTIONS,
  type TicketStatus,
} from "~/constants/ticket.constant";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import TicketForm from "./TicketForm";

type TicketsResponse = inferRouterOutputs<AppRouter>["tickets"]["getAll"];

export default function TicketsList() {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<TicketsResponse["tickets"][0]>
  >({
    columnAccessor: "createdAt",
    direction: "desc",
  });
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      status: undefined as TicketStatus | undefined,
    },
    300,
  );

  const { data, isPending } = api.tickets.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
    ...(filters.status ? { status: filters.status } : {}),
  });

  const deleteTicket = api.tickets.delete.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Ticket has been deleted successfully.",
        color: "green",
      });
      void utils.tickets.getAll.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleDelete = (ticket: TicketsResponse["tickets"][0]) => {
    modals.openConfirmModal({
      title: "Delete Ticket",
      children: (
        <Text size="sm">
          Are you sure you want to delete ticket &quot;{ticket.title}&quot;?
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTicket.mutate({ id: ticket.id });
      },
    });
  };

  const columns = [
    {
      accessor: "title",
      title: "Title",
      sortable: true,
      render: (record: TicketsResponse["tickets"][0]) => (
        <Button
          className="button-hover-underline"
          variant="transparent"
          p={0}
          onClick={() => {
            setFormMode("edit");
            setEditId(record.id);
            setFormOpened(true);
          }}
        >
          <Text fw={500}>{record.title}</Text>
          {record.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {record.description}
            </Text>
          )}
        </Button>
      ),
    },
    {
      accessor: "status",
      title: "Status",
      sortable: true,
      render: (record: TicketsResponse["tickets"][0]) => {
        const statusOption = TICKET_STATUS_OPTIONS.find(
          (opt) => opt.value === record.status,
        );
        return (
          <Badge color={statusOption?.color} variant="light">
            {statusOption?.label}
          </Badge>
        );
      },
    },
    {
      accessor: "crId",
      title: "CR ID",
      sortable: true,
      render: (record: TicketsResponse["tickets"][0]) => record.crId ?? "-",
    },
    {
      accessor: "createdBy",
      title: "Created By",
      render: (record: TicketsResponse["tickets"][0]) => record.createdBy.name,
    },
    {
      accessor: "createdAt",
      title: "Created",
      sortable: true,
      render: (record: TicketsResponse["tickets"][0]) =>
        dayjs(record.createdAt).format("DD MMM YYYY"),
    },
    {
      accessor: "actions",
      title: "",
      render: (record: TicketsResponse["tickets"][0]) => (
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => handleDelete(record)}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ];

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconHelp />
          <Title size="lg">Tickets</Title>
        </Group>
        <Button
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

      <Group px="md" mb="md">
        <TextInput
          placeholder="Search tickets..."
          leftSection={<IconSearch size={16} />}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filter by status"
          data={TICKET_STATUS_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={filters.status}
          onChange={(value) =>
            setFilters({
              ...filters,
              status: (value as TicketStatus | null) ?? undefined,
            })
          }
          leftSection={<IconFilter2 size={16} />}
          clearable
        />
      </Group>

      <AppTable
        columns={columns}
        records={data?.tickets ?? []}
        fetching={isPending}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        totalRecords={data?.total ?? 0}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
      />
      <TicketForm
        opened={formOpened}
        close={() => {
          setFormOpened(false);
          void utils.tickets.getAll.invalidate();
        }}
        mode={formMode}
        ticketId={editId}
        session={session}
      />
    </>
  );
}
