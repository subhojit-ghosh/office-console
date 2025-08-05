"use client";

import { Group, Select, Title } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { UserRole } from "@prisma/client";
import { IconClockHour4, IconChevronRight, IconFoldersFilled } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AppTable from "~/components/AppTable";
import { ProjectModules } from "./ProjectModules";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";
import clsx from "clsx";
import dayjs from "dayjs";

export default function WorkLogs() {
  const { data: session } = useSession();
  const usersQuery = api.users.getAllMinimal.useQuery();
  const [filters, setFilters] = useDebouncedState(
    {
      user: null as string | null,
    },
    300,
  );

  // Load projects (first level)
  const { data: projects, isPending: projectsLoading } = api.workLogs.getProjects.useQuery({
    userId: filters.user,
  });

  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

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
        withTableBorder
        withColumnBorders
        highlightOnHover
        fetching={projectsLoading}
        records={projects ?? []}
        columns={[
          {
            accessor: 'name',
            title: 'Project / Module / Task',
            width: '40%',
            noWrap: true,
            render: ({ id, name }) => (
              <Group gap="xs" align="center" wrap="nowrap">
                <IconChevronRight
                  className={clsx(classes.icon, classes.expandIcon, {
                    [classes.expandIconRotated!]: expandedProjectIds.includes(id),
                  })}
                />
                <IconFoldersFilled className={classes.icon} />
                <span className={classes.projectRow}>{name}</span>
              </Group>
            ),
          },
          {
            accessor: 'firstWorkLogDate',
            title: 'First Entry',
            width: '20%',
            textAlign: 'left',
            render: ({ firstWorkLogDate }) => 
              firstWorkLogDate ? dayjs(firstWorkLogDate).format('MMM D, YYYY') : '-',
          },
          {
            accessor: 'lastWorkLogDate',
            title: 'Last Entry',
            width: '20%',
            textAlign: 'left',
            render: ({ lastWorkLogDate }) => 
              lastWorkLogDate ? dayjs(lastWorkLogDate).format('MMM D, YYYY') : '-',
          },
          {
            accessor: 'totalDuration',
            title: 'Total Duration',
            width: '20%',
            textAlign: 'left',
            render: ({ totalDuration }) => formatDurationFromMinutes(totalDuration),
          },
        ]}
        rowExpansion={{
          allowMultiple: true,
          expanded: { recordIds: expandedProjectIds, onRecordIdsChange: setExpandedProjectIds },
          content: ({ record: project }) => (
            <ProjectModules 
              projectId={project.id} 
              userId={filters.user}
              expandedModuleIds={expandedModuleIds}
              setExpandedModuleIds={setExpandedModuleIds}
            />
          ),
        }}
      />
    </>
  );
}
