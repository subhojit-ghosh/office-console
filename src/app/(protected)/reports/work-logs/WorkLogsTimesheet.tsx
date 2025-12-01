"use client";

import { Text } from "@mantine/core";
import type { DataTableSortStatus } from "mantine-datatable";
import dayjs from "dayjs";
import { useState } from "react";
import AppTable from "~/components/AppTable";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import { TASK_STATUS_MAP, type TaskType } from "~/constants/task.constant";
import type { AppRouter } from "~/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";

type FlatWorkLogsResponse =
  inferRouterOutputs<AppRouter>["workLogs"]["getFlatWorkLogs"];
type WorkLogEntry = FlatWorkLogsResponse["workLogs"][0];

interface WorkLogsTimesheetProps {
  dateRange: [Date | null, Date | null];
  clientId?: string;
  projectId?: string;
  userId?: string;
  moduleId?: string;
  taskType?: TaskType;
}

export default function WorkLogsTimesheet({
  dateRange,
  clientId,
  projectId,
  userId,
  moduleId,
  taskType,
}: WorkLogsTimesheetProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<WorkLogEntry>
  >({
    columnAccessor: "startTime",
    direction: "desc",
  });

  const { data, isPending } = api.workLogs.getFlatWorkLogs.useQuery({
    page,
    pageSize,
    dateRange,
    clientId,
    projectId,
    userId,
    moduleId,
    taskType,
    sortBy: sortStatus.columnAccessor,
    sortOrder: sortStatus.direction,
  });

  return (
    <>
      <AppTable<WorkLogEntry>
        withColumnBorders
        highlightOnHover
        fetching={isPending}
        records={data?.workLogs ?? []}
        totalRecords={data?.total ?? 0}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          {
            accessor: "startTime",
            title: "Date",
            sortable: true,
            width: "10%",
            render: ({ startTime }) => dayjs(startTime).format("MMM D, YYYY"),
          },
          {
            accessor: "user.name",
            title: "User",
            sortable: true,
            width: "12%",
            render: ({ user }) => user.name,
          },
          {
            accessor: "task.project.name",
            title: "Project",
            sortable: true,
            width: "12%",
            render: ({ task }) => task?.project.name ?? "-",
          },
          {
            accessor: "task.module.name",
            title: "Module",
            sortable: true,
            width: "12%",
            render: ({ task }) => task?.module?.name ?? "-",
          },
          {
            accessor: "task.title",
            title: "Task",
            sortable: true,
            width: "15%",
            render: ({ task }) =>
              task
                ? task.crId
                  ? `[${task.crId}] ${task.title}`
                  : task.title
                : "-",
          },
          {
            accessor: "task.type",
            title: "Task Type",
            sortable: true,
            width: "10%",
            render: ({ task }) => task?.type ?? "-",
          },
          {
            accessor: "task.status",
            title: "Status",
            sortable: true,
            width: "10%",
            render: ({ task }) =>
              task?.status
                ? (TASK_STATUS_MAP[task.status as keyof typeof TASK_STATUS_MAP]
                    ?.label ?? task.status)
                : "-",
          },
          {
            accessor: "task.crId",
            title: "CR ID",
            sortable: true,
            width: "8%",
            render: ({ task }) => task?.crId ?? "-",
          },
          {
            accessor: "duration",
            title: "Duration",
            sortable: true,
            width: "12%",
            render: ({ duration }) => formatDurationFromMinutes(duration),
          },
          {
            accessor: "note",
            title: "Note",
            sortable: false,
            width: "15%",
            render: ({ note }) => (
              <Text size="sm" lineClamp={2} title={note ?? undefined}>
                {note ?? "-"}
              </Text>
            ),
          },
        ]}
      />
    </>
  );
}
