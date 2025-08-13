"use client";

import { ActionIcon, Badge, Box, Button, Group, Menu, Popover, Select, TextInput, Title } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";
import { IconDotsVertical, IconFileDescriptionFilled, IconFilter2, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { type DataTableSortStatus } from "mantine-datatable";
import { useState } from "react";
import AppTable from "~/components/AppTable";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import RequirementForm from "./RequirementForm";
import { REQUIREMENT_PRIORITY_OPTIONS, REQUIREMENT_STATUS_FILTERS, REQUIREMENT_STATUS_OPTIONS, REQUIREMENT_TYPE_OPTIONS } from "~/constants/requirement.constant";

type RequirementsResponse = inferRouterOutputs<AppRouter>["requirements"]["getAll"];


export default function RequirementsList() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [formOpened, setFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<RequirementsResponse["requirements"][0]>
  >({
    columnAccessor: "createdAt",
    direction: "desc",
  });
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<keyof typeof REQUIREMENT_STATUS_FILTERS>("PENDING");
  const [filters, setFilters] = useDebouncedState(
    {
      search: "",
      type: "",
      status: "",
      priority: "",
    },
    300,
  );

  const { data, isPending } = api.requirements.getAll.useQuery({
    page,
    pageSize,
    search: filters.search,
    type: (filters.type as RequirementType) || undefined,
    status: (filters.status as RequirementStatus) || undefined,
    priority: (filters.priority as RequirementPriority) || undefined,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  const deleteRequirement = api.requirements.delete.useMutation({
    onSuccess: async () => {
      void utils.requirements.getAll.invalidate();
      notifications.show({ message: "Requirement deleted successfully", color: "green" });
    },
    onError: (error) => {
      notifications.show({ message: error.message, color: "red" });
    },
  });

  const deleteConfirmation = (req: RequirementsResponse["requirements"][0]) => {
    modals.openConfirmModal({
      title: "Delete Requirement",
      children: <Box>Are you sure you want to delete &quot;{req.title}&quot;?</Box>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteRequirement.mutate({ id: req.id }),
    });
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconFileDescriptionFilled size={24} />
          <Title size="lg">Requirements</Title>
          <Button.Group ml="md">
            <Button
              variant={selectedStatusGroup == "PENDING" ? "filled" : "default"}
              onClick={() => setSelectedStatusGroup("PENDING")}
              size="xs"
            >
              Pending
            </Button>
            <Button
              variant={selectedStatusGroup == "COMPLETED" ? "filled" : "default"}
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
            onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
          />
          <Select
            size="xs"
            placeholder="All Status"
            clearable
            data={REQUIREMENT_STATUS_OPTIONS.filter((v) =>
              REQUIREMENT_STATUS_FILTERS[selectedStatusGroup].includes(v.value),
            )}
            defaultValue={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value ?? "" })}
            style={{ width: 120 }}
          />
          <Popover width={300} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Button variant="outline" size="xs" leftSection={<IconFilter2 size={14} />} color="cyan">
                Filters
              </Button>
            </Popover.Target>
            <Popover.Dropdown bg="var(--mantine-color-body)">
              <Select
                label="Type"
                placeholder="All Types"
                clearable
                mb="sm"
                data={REQUIREMENT_TYPE_OPTIONS}
                defaultValue={filters.type}
                onChange={(value) => setFilters({ ...filters, type: value ?? "" })}
                comboboxProps={{ withinPortal: false }}
              />
              <Select
                label="Priority"
                placeholder="All Priority"
                clearable
                mb="sm"
                data={REQUIREMENT_PRIORITY_OPTIONS}
                defaultValue={filters.priority}
                onChange={(value) => setFilters({ ...filters, priority: value ?? "" })}
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
      <AppTable<RequirementsResponse["requirements"][0]>
        fetching={isPending}
        records={data?.requirements ?? []}
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
          },
          {
            accessor: "type",
            title: "Type",
            sortable: true,
            render: (row) => REQUIREMENT_TYPE_OPTIONS.find((t) => t.value === row.type)?.label,
          },
          {
            accessor: "status",
            title: "Status",
            sortable: true,
            render: (row) => REQUIREMENT_STATUS_OPTIONS.find((s) => s.value === row.status)?.label,
          },
          {
            accessor: "priority",
            title: "Priority",
            sortable: true,
            render: (row) => REQUIREMENT_PRIORITY_OPTIONS.find((p) => p.value === row.priority)?.label,
          },
          {
            accessor: "createdBy.name",
            title: "Created By",
            render: (row) => row.createdBy?.name ?? "-",
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
                  <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => deleteConfirmation(row)}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ),
          },
        ]}
      />
      <RequirementForm opened={formOpened} close={() => setFormOpened(false)} mode={formMode} id={editId} />
    </>
  );
}


