"use client";

import { Group } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { FaCubes } from "react-icons/fa";
import dayjs from "dayjs";
import AppTable from "~/components/AppTable";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";
import clsx from "clsx";
import { ModuleTasks } from "./ModuleTasks";

interface ProjectModulesProps {
  projectId: string;
  dateRange: [Date | null, Date | null];
  expandedModuleIds: string[];
  setExpandedModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ProjectModules({ 
  projectId, 
  dateRange,
  expandedModuleIds, 
  setExpandedModuleIds
}: ProjectModulesProps) {
  const { data: modules, isPending: modulesLoading } = api.workLogs.getModules.useQuery({
    projectId,
    dateRange,
  }, {
    enabled: !!projectId,
  });

  return (
    <AppTable
      noHeader
      withColumnBorders
      fetching={modulesLoading}
      records={modules ?? []}
      minHeight={100}
      columns={[
        {
          accessor: 'name',
          width: '40%',
          noWrap: true,
          render: ({ id, name }) => (
            <Group gap="xs" align="center" wrap="nowrap" ml={20}>
              <IconChevronRight
                className={clsx(classes.icon, classes.expandIcon, {
                  [classes.expandIconRotated!]: expandedModuleIds.includes(id),
                })}
              />
              <FaCubes className={classes.icon} />
              <span className={classes.moduleRow}>{name}</span>
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
          width: '20%',
          textAlign: 'left',
          render: ({ totalDuration }) => formatDurationFromMinutes(totalDuration),
        },
      ]}
      rowExpansion={{
        allowMultiple: true,
        expanded: { recordIds: expandedModuleIds, onRecordIdsChange: setExpandedModuleIds },
        content: ({ record: module }) => (
          <ModuleTasks 
            moduleId={module.id}
            projectId={projectId}
            dateRange={dateRange}
          />
        ),
      }}
    />
  );
} 