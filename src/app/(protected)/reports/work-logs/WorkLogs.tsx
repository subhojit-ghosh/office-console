"use client";

import { Group, Select, Title, Button, Tabs } from "@mantine/core";
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
import { useSession } from "next-auth/react";
import AppTable from "~/components/AppTable";
import { api, apiClient } from "~/trpc/react";
import { UserRole } from "@prisma/generated/browser";
import { formatDurationFromMinutes } from "~/utils/format-duration-from-minutes";
import { exportServerDataToExcel } from "~/utils/excel-export";
import { ProjectModules } from "./ProjectModules";
import WorkLogsTimesheet from "./WorkLogsTimesheet";
import classes from "./WorkLogs.module.css";

export default function WorkLogs() {
  const { data: session } = useSession();
  const [filters, setFilters] = useDebouncedState(
    {
      projectId: "",
      clientId: "",
      userId: "",
      moduleId: "",
      dateRange: [null, null] as DatesRangeValue,
    },
    300,
  );

  const projectsQuery = api.projects.getAllMinimal.useQuery(
    filters.clientId ? { clientId: filters.clientId } : undefined,
  );
  const clientsQuery = api.clients.getAllMinimal.useQuery(undefined, {
    enabled:
      session?.user?.role !== UserRole.CLIENT_ADMIN &&
      session?.user?.role !== UserRole.CLIENT_USER,
  });
  const usersQuery = api.users.getAllMinimal.useQuery();
  const modulesQuery = api.modules.getAllMinimal.useQuery({
    projectId: filters.projectId || undefined,
  });

  // Convert string dates to Date objects for API
  const dateRangeForAPI: [Date | null, Date | null] = [
    filters.dateRange[0] ? new Date(filters.dateRange[0]) : null,
    filters.dateRange[1] ? new Date(filters.dateRange[1]) : null,
  ];

  // Load projects (first level)
  const { data: projects, isPending: projectsLoading } =
    api.workLogs.getProjects.useQuery({
      dateRange: dateRangeForAPI,
      clientId:
        session?.user?.role !== UserRole.CLIENT_ADMIN &&
        session?.user?.role !== UserRole.CLIENT_USER
          ? filters.clientId || undefined
          : undefined,
    });

  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("summary");

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

      if (activeTab === "timesheet") {
        // Export flat timesheet format
        const { exportFlatWorkLogsToExcel } = await import(
          "~/utils/excel-export"
        );
        const exportData =
          await apiClient.workLogs.getFlatWorkLogsForExport.query({
            dateRange: dateRangeForAPI,
            projectId: filters.projectId || undefined,
            clientId:
              session?.user?.role !== UserRole.CLIENT_ADMIN &&
              session?.user?.role !== UserRole.CLIENT_USER
                ? filters.clientId || undefined
                : undefined,
            userId: filters.userId || undefined,
            moduleId: filters.moduleId || undefined,
          });

        await exportFlatWorkLogsToExcel(exportData.workLogs, dateRangeForAPI);
      } else {
        // Export summary format
        const exportData = await apiClient.workLogs.getExportData.query({
          dateRange: dateRangeForAPI,
          projectId: filters.projectId || undefined,
          clientId:
            session?.user?.role !== UserRole.CLIENT_ADMIN &&
            session?.user?.role !== UserRole.CLIENT_USER
              ? filters.clientId || undefined
              : undefined,
        });

        await exportServerDataToExcel(exportData.data, dateRangeForAPI);
      }
    } catch (error) {
      console.error(
        "Export failed:",
        error instanceof Error ? error.message : String(error),
      );
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
          {session?.user?.role !== UserRole.CLIENT_ADMIN &&
            session?.user?.role !== UserRole.CLIENT_USER && (
              <Select
                placeholder="All Clients"
                clearable
                searchable
                data={
                  clientsQuery.data?.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })) ?? []
                }
                value={filters.clientId}
                onChange={(value) =>
                  setFilters({ ...filters, clientId: value ?? "" })
                }
                disabled={clientsQuery.isLoading}
                style={{ width: 200 }}
              />
            )}
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
              setFilters({ ...filters, projectId: value ?? "", moduleId: "" })
            }
            disabled={projectsQuery.isLoading}
            style={{ width: 200 }}
          />
          <Select
            placeholder="All Modules"
            clearable
            searchable
            data={
              modulesQuery.data?.map((m) => ({
                value: m.id,
                label: m.name,
              })) ?? []
            }
            value={filters.moduleId}
            onChange={(value) =>
              setFilters({ ...filters, moduleId: value ?? "" })
            }
            disabled={modulesQuery.isLoading || !filters.projectId}
            style={{ width: 200 }}
          />
          <Select
            placeholder="All Users"
            clearable
            searchable
            data={
              usersQuery.data?.map((u) => ({
                value: u.id,
                label: u.name,
              })) ?? []
            }
            value={filters.userId}
            onChange={(value) =>
              setFilters({ ...filters, userId: value ?? "" })
            }
            disabled={usersQuery.isLoading}
            style={{ width: 200 }}
          />
        </Group>
        <Button
          leftSection={isExporting ? undefined : <IconDownload size={16} />}
          onClick={handleExport}
          loading={isExporting}
          disabled={
            projectsLoading || filteredProjects.length === 0 || isExporting
          }
          variant="light"
          color="blue"
          style={{ minWidth: 140 }}
        >
          {isExporting ? "Exporting..." : "Export to Excel"}
        </Button>
      </Group>

      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value ?? "summary")}
        px="md"
      >
        <Tabs.List>
          <Tabs.Tab value="summary">Summary</Tabs.Tab>
          <Tabs.Tab value="timesheet">Timesheet</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="summary" pt="md">
          <div style={{ position: "relative" }}>
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
                    clientId={
                      session?.user?.role !== UserRole.CLIENT_ADMIN &&
                      session?.user?.role !== UserRole.CLIENT_USER
                        ? filters.clientId || undefined
                        : undefined
                    }
                    expandedModuleIds={expandedModuleIds}
                    setExpandedModuleIds={setExpandedModuleIds}
                  />
                ),
              }}
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="timesheet" pt="md">
          <WorkLogsTimesheet
            dateRange={dateRangeForAPI}
            clientId={
              session?.user?.role !== UserRole.CLIENT_ADMIN &&
              session?.user?.role !== UserRole.CLIENT_USER
                ? filters.clientId || undefined
                : undefined
            }
            projectId={filters.projectId || undefined}
            userId={filters.userId || undefined}
            moduleId={filters.moduleId || undefined}
          />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
