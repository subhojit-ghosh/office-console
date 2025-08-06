"use client";

import { Group, Select, Title, Button } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import { useDebouncedState } from "@mantine/hooks";
import {
  IconChevronRight,
  IconClockHour4,
  IconFoldersFilled,
  IconDownload,
} from "@tabler/icons-react";
import clsx from "clsx";
import dayjs from "dayjs";
import { useState } from "react";
import AppTable from "~/components/AppTable";
import { api, apiClient } from "~/trpc/react";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import { exportServerDataToExcel } from "~/utils/excel-export";
import { ProjectModules } from "./ProjectModules";
import classes from "./WorkLogs.module.css";

export default function WorkLogs() {
  const projectsQuery = api.projects.getAllMinimal.useQuery();
  const [filters, setFilters] = useDebouncedState(
    {
      projectId: "",
      dateRange: [null, null] as DatesRangeValue,
    },
    300,
  );

  // Convert string dates to Date objects for API
  const dateRangeForAPI: [Date | null, Date | null] = [
    filters.dateRange[0] ? new Date(filters.dateRange[0]) : null,
    filters.dateRange[1] ? new Date(filters.dateRange[1]) : null,
  ];

  // Load projects (first level)
  const { data: projects, isPending: projectsLoading } =
    api.workLogs.getProjects.useQuery({
      dateRange: dateRangeForAPI,
    });

  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filter projects based on selected projectId
  const filteredProjects =
    projects?.filter(
      (project) => !filters.projectId || project.id === filters.projectId,
    ) ?? [];

  // Date range presets
  const today = dayjs();
  const presets = [
    {
      value: [
        today.subtract(7, "day").format("YYYY-MM-DD"),
        today.format("YYYY-MM-DD"),
      ] as [string, string],
      label: "Last 7 days",
    },
    {
      value: [
        today.subtract(30, "day").format("YYYY-MM-DD"),
        today.format("YYYY-MM-DD"),
      ] as [string, string],
      label: "Last 30 days",
    },
    {
      value: [
        today.startOf("month").format("YYYY-MM-DD"),
        today.format("YYYY-MM-DD"),
      ] as [string, string],
      label: "This month",
    },
    {
      value: [
        today.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
        today.subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
      ] as [string, string],
      label: "Last month",
    },
    {
      value: [
        today.startOf("year").format("YYYY-MM-DD"),
        today.format("YYYY-MM-DD"),
      ] as [string, string],
      label: "This year",
    },
  ];

  // Export function
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Fetch all data from server for export using tRPC client
      const exportData = await apiClient.workLogs.getExportData.query({
        dateRange: dateRangeForAPI,
        projectId: filters.projectId || undefined,
      });

      // Export to Excel
      await exportServerDataToExcel(
        exportData.data,
        dateRangeForAPI,
      );

    } catch (error) {
      console.error("Export failed:", error);
      // You can add a notification here if you have a notification system
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconClockHour4 />
          <Title size="lg">Work Logs</Title>
          <DatePickerInput
            type="range"
            placeholder="Filter by date range"
            value={filters.dateRange}
            onChange={(value) => setFilters({ ...filters, dateRange: value })}
            presets={presets}
            clearable
            style={{ width: 250 }}
          />
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
        <Button
          leftSection={isExporting ? undefined : <IconDownload size={16} />}
          onClick={handleExport}
          loading={isExporting}
          disabled={projectsLoading || filteredProjects.length === 0 || isExporting}
          variant="light"
          color="blue"
          style={{ minWidth: 140 }}
        >
          {isExporting ? "Exporting..." : "Export to Excel"}
        </Button>
      </Group>

      <div style={{ position: 'relative' }}>
        <AppTable
          withColumnBorders
          highlightOnHover
          fetching={projectsLoading}
          records={filteredProjects}
          columns={[
            {
              accessor: "name",
              title: "Project / Module / Task",
              width: "40%",
              noWrap: true,
              render: ({ id, name }) => (
                <Group gap="xs" align="center" wrap="nowrap">
                  <IconChevronRight
                    className={clsx(classes.icon, classes.expandIcon, {
                      [classes.expandIconRotated!]:
                        expandedProjectIds.includes(id),
                    })}
                  />
                  <IconFoldersFilled className={classes.icon} />
                  <span className={classes.projectRow}>{name}</span>
                </Group>
              ),
            },
            {
              accessor: "firstWorkLogDate",
              title: "First Entry",
              width: "20%",
              textAlign: "left",
              render: ({ firstWorkLogDate }) =>
                firstWorkLogDate
                  ? dayjs(firstWorkLogDate).format("MMM D, YYYY")
                  : "-",
            },
            {
              accessor: "lastWorkLogDate",
              title: "Last Entry",
              width: "20%",
              textAlign: "left",
              render: ({ lastWorkLogDate }) =>
                lastWorkLogDate
                  ? dayjs(lastWorkLogDate).format("MMM D, YYYY")
                  : "-",
            },
            {
              accessor: "totalDuration",
              title: "Total Duration",
              width: "20%",
              textAlign: "left",
              render: ({ totalDuration }) =>
                formatDurationFromMinutes(totalDuration),
            },
          ]}
          rowExpansion={{
            allowMultiple: true,
            expanded: {
              recordIds: expandedProjectIds,
              onRecordIdsChange: setExpandedProjectIds,
            },
            content: ({ record: project }) => (
              <ProjectModules
                projectId={project.id}
                dateRange={dateRangeForAPI}
                expandedModuleIds={expandedModuleIds}
                setExpandedModuleIds={setExpandedModuleIds}
              />
            ),
          }}
        />
      </div>
    </>
  );
}
