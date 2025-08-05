"use client";

import { Group, Select, Title } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconClockHour4, IconChevronRight, IconFoldersFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import AppTable from "~/components/AppTable";
import { ProjectModules } from "./ProjectModules";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";
import clsx from "clsx";

export default function WorkLogs() {
  const projectsQuery = api.projects.getAllMinimal.useQuery();
  const [filters, setFilters] = useDebouncedState(
    {
      projectId: "",
    },
    300,
  );

  // Load projects (first level)
  const { data: projects, isPending: projectsLoading } = api.workLogs.getProjects.useQuery({});

  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

  // Filter projects based on selected projectId
  const filteredProjects = projects?.filter(project => 
    !filters.projectId || project.id === filters.projectId
  ) ?? [];

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconClockHour4 />
          <Title size="lg">Work Logs</Title>
          <Select
            placeholder="All Projects"
            clearable
            searchable
            data={
              projectsQuery.data?.map((p) => ({
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
        <div></div>
      </Group>
      
      <AppTable
        withTableBorder
        withColumnBorders
        highlightOnHover
        fetching={projectsLoading}
        records={filteredProjects}
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
              expandedModuleIds={expandedModuleIds}
              setExpandedModuleIds={setExpandedModuleIds}
            />
          ),
        }}
      />
    </>
  );
}
