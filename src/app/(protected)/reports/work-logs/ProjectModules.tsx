"use client";

import { Box } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { FaCubes } from "react-icons/fa";
import AppTable from "~/components/AppTable";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";
import clsx from "clsx";
import { ModuleTasks } from "./ModuleTasks";

interface ProjectModulesProps {
  projectId: string;
  userId: string | null;
  expandedModuleIds: string[];
  setExpandedModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ProjectModules({ 
  projectId, 
  userId, 
  expandedModuleIds, 
  setExpandedModuleIds
}: ProjectModulesProps) {
  const { data: modules, isPending: modulesLoading } = api.workLogs.getModules.useQuery({
    projectId,
    userId,
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
          width: '60%',
          noWrap: true,
          render: ({ id, name }) => (
            <Box component="span" ml={20}>
              <IconChevronRight
                className={clsx(classes.icon, classes.expandIcon, {
                  [classes.expandIconRotated!]: expandedModuleIds.includes(id),
                })}
              />
              <FaCubes className={classes.icon} />
              <span className={classes.moduleRow}>{name}</span>
            </Box>
          ),
        },
        {
          accessor: 'totalDuration',
          width: '40%',
          textAlign: 'right',
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
            userId={userId}
          />
        ),
      }}
    />
  );
} 