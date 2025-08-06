"use client";

import { useMantineTheme, Group } from "@mantine/core";
import dayjs from "dayjs";
import AppTable from "~/components/AppTable";
import { TASK_TYPE_OPTIONS } from "~/constants/task.constant";
import { api } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import classes from "./WorkLogs.module.css";

interface ModuleTasksProps {
  moduleId: string;
  projectId: string;
  dateRange: [Date | null, Date | null];
}

export function ModuleTasks({ 
  moduleId, 
  projectId,
  dateRange
}: ModuleTasksProps) {
  const theme = useMantineTheme();
  const { data: tasks, isPending: tasksLoading } = api.workLogs.getTasks.useQuery({
    moduleId,
    projectId,
    dateRange,
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
          width: '40%',
          noWrap: false,
          render: ({ title, type }) => {
            const typeOption = TASK_TYPE_OPTIONS.find(t => t.value === type);
            return (
              <Group gap="xs" align="flex-start" wrap="wrap">
                {typeOption && (
                  <typeOption.icon 
                    className={classes.icon} 
                    size={16} 
                    color={theme.colors[typeOption.color][4]} 
                  />
                )}
                <span 
                  className={classes.taskRow}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    maxWidth: '100%'
                  }}
                >
                  {title}
                </span>
              </Group>
            );
          },
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
    />
  );
} 