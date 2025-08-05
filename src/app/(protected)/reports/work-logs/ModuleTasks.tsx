"use client";

import { Box, useMantineTheme } from "@mantine/core";
import AppTable from "~/components/AppTable";
import { TASK_TYPE_OPTIONS } from "~/constants/task.constant";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";

interface ModuleTasksProps {
  moduleId: string;
  projectId: string;
  userId: string | null;
}

export function ModuleTasks({ 
  moduleId, 
  projectId, 
  userId
}: ModuleTasksProps) {
  const theme = useMantineTheme();
  const { data: tasks, isPending: tasksLoading } = api.workLogs.getTasks.useQuery({
    moduleId,
    projectId,
    userId,
  }, {
    enabled: !!moduleId && !!projectId,
  });

  return (
    <AppTable
      noHeader
      withColumnBorders
      fetching={tasksLoading}
      records={tasks ?? []}
      minHeight={100}
      columns={[
        {
          accessor: 'name',
          width: '60%',
          noWrap: true,
          render: ({ title, type }) => {
            const typeOption = TASK_TYPE_OPTIONS.find(t => t.value === type);
            return (
              <Box component="span" ml={40}>
                {typeOption && (
                  <typeOption.icon 
                    className={classes.icon} 
                    size={16} 
                    color={theme.colors[typeOption.color][4]} 
                  />
                )}
                <span className={classes.taskRow}>{title}</span>
              </Box>
            );
          },
        },
        {
          accessor: 'totalDuration',
          width: '40%',
          textAlign: 'right',
          render: ({ totalDuration }) => formatDurationFromMinutes(totalDuration),
        },
      ]}
    />
  );
} 