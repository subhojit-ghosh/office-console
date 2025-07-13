"use client";

import { Group, Select, Text, Title, useMantineTheme } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { UserRole } from "@prisma/client";
import { IconClockHour4 } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import AppTable from "~/components/AppTable";
import { TASK_TYPE_OPTIONS } from "~/constants/task.constant";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";

export default function WorkLogs() {
  const theme = useMantineTheme();
  const { data: session } = useSession();
  const usersQuery = api.users.getAllMinimal.useQuery();
  const [filters, setFilters] = useDebouncedState(
    {
      user: null as string | null,
    },
    300,
  );

  const { data, isPending } = api.workLogs.getAll.useQuery({
    userId: filters.user,
  });

  useEffect(() => {
    if (session?.user?.role) {
      setFilters((prev) => ({ ...prev, user: session.user.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role]);

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconClockHour4 />
          <Title size="lg">Work Logs</Title>
          {session?.user?.role === UserRole.ADMIN && (
            <Select
              data={
                usersQuery.data
                  ?.sort((a, b) =>
                    a.id === session?.user.id
                      ? -1
                      : b.id === session?.user.id
                        ? 1
                        : 0,
                  )
                  .map((user) => ({
                    value: user.id,
                    label: user.name,
                  })) ?? []
              }
              value={filters.user}
              onChange={(value) => setFilters({ ...filters, user: value })}
              searchable
              placeholder="Select User"
              ml="md"
            />
          )}
        </Group>
        <div></div>
      </Group>
      <AppTable
        fetching={isPending}
        records={data ?? []}
        columns={[
          {
            accessor: "task",
            title: "Task",
            width: "30%",
            render: (row) => {
              const type = TASK_TYPE_OPTIONS.find(
                (t) => t.value === row.task?.type,
              );

              return (
                <Group gap="xs" align="center" wrap="nowrap">
                  {type && (
                    <type.icon size={18} color={theme.colors[type.color][4]} />
                  )}
                  <Text
                    size="sm"
                    fw={500}
                    lineClamp={2}
                    title={row.task?.title}
                    style={{ flex: 1 }}
                  >
                    {row.task?.title}
                  </Text>
                </Group>
              );
            },
          },
          {
            accessor: "startTime",
            title: "Start Time",
            render: (row) =>
              dayjs(row.startTime).format("MMM D, YYYY @ h:mm A"),
          },
          {
            accessor: "endTime",
            title: "End Time",
            render: (row) => dayjs(row.endTime).format("MMM D, YYYY @ h:mm A"),
          },
          {
            accessor: "durationMin",
            title: "Duration",
            render: (row) => formatDurationFromMinutes(row.durationMin),
          },
        ]}
      />
    </>
  );
}
