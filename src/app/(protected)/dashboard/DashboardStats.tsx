"use client";

import {
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
  RingProgress,
  Select,
  Stack,
  Box,
  SegmentedControl,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconHomeFilled, IconFoldersFilled } from "@tabler/icons-react";
import { FaTasks } from "react-icons/fa";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/generated/browser";
import { api } from "~/trpc/react";
import classes from "./DashboardStats.module.css";
import ActivityHeatmap from "./ActivityHeatmap";

// Simple dashboard for client roles
function SimpleDashboard() {
  const dashboardQuery = api.dashboard.stats.useQuery();

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconHomeFilled />
          <Title size="lg">Dashboard</Title>
        </Group>
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} px="md">
        <Paper
          withBorder
          p="md"
          radius="md"
          className={classes.card}
          style={{ alignSelf: "start" }}
        >
          <Group justify="space-between">
            <Text className={classes.title}>Projects</Text>
            <IconFoldersFilled className={classes.icon} />
          </Group>

          <Group align="flex-end" gap="xs" mt={15}>
            {dashboardQuery.isLoading || !dashboardQuery.data ? (
              <Skeleton height={20} width={100} />
            ) : (
              <Text className={classes.value}>
                {dashboardQuery.data.projects}
              </Text>
            )}
          </Group>
        </Paper>
        <Paper
          withBorder
          p="md"
          radius="md"
          className={classes.card}
          style={{ alignSelf: "start" }}
        >
          <Group justify="space-between">
            <Text className={classes.title}>Tasks</Text>
            <FaTasks className={classes.icon} />
          </Group>

          <Group align="flex-end" gap="xs" mt={15}>
            {dashboardQuery.isLoading || !dashboardQuery.data ? (
              <Skeleton height={20} width={100} />
            ) : (
              <Text className={classes.value}>{dashboardQuery.data.tasks}</Text>
            )}
          </Group>
        </Paper>
      </SimpleGrid>
    </>
  );
}

// Date range preset types
type DateRangePreset =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "month"
  | "lastMonth"
  | "custom";

// Helper function to get date range based on preset
function getDateRangeForPreset(preset: DateRangePreset): [Date, Date] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return [today, new Date()];
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return [yesterday, today];
    }
    case "week": {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return [weekStart, new Date()];
    }
    case "lastWeek": {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return [lastWeekStart, lastWeekEnd];
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return [monthStart, new Date()];
    }
    case "lastMonth": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return [lastMonthStart, lastMonthEnd];
    }
    default:
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date()];
  }
}

// Analytics dashboard for staff/admin roles
function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("month");
  const [customDateRange, setCustomDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);

  // Calculate date range based on preset or custom selection
  const [startDate, endDate] = useMemo(() => {
    if (
      dateRangePreset === "custom" &&
      customDateRange[0] &&
      customDateRange[1]
    ) {
      return [customDateRange[0], customDateRange[1]];
    }
    return getDateRangeForPreset(dateRangePreset);
  }, [dateRangePreset, customDateRange]);

  //  Fetch all users for selection (ADMIN only)
  const usersQuery = api.users.getAllMinimal.useQuery(undefined, {
    enabled: session?.user?.role === UserRole.ADMIN,
  });

  // Set default user when users load
  useEffect(() => {
    if (session?.user?.id && !selectedUserId) {
      setSelectedUserId(session.user.id);
    }
  }, [session?.user?.id, selectedUserId]);

  // Fetch analytics data for selected user with date range
  const personalMetricsQuery = api.dashboard.personalMetrics.useQuery(
    { userId: selectedUserId, startDate, endDate },
    { enabled: !!selectedUserId },
  );

  // Prepare user options for select (names only, no emails)
  const userOptions =
    usersQuery.data?.map((user) => ({
      value: user.id,
      label: user.name,
    })) ?? [];

  return (
    <>
      {/* Header with Title */}
      <Group justify="space-between" px="md" mb="sm">
        <Group gap="xs">
          <IconHomeFilled />
          <Title size="lg">
            Dashboard Analytics <span className="text-xs">(Experimental)</span>
          </Title>
        </Group>
      </Group>

      {/* Controls: User Selection (ADMIN only) and Date Range */}
      <Group justify="space-between" px="md" mb="md">
        {/* Left: User Selection (ADMIN only) */}
        {session?.user?.role === UserRole.ADMIN && (
          <Box style={{ minWidth: "250px" }}>
            <Select
              placeholder="Select user"
              data={userOptions}
              value={selectedUserId}
              onChange={(value) => value && setSelectedUserId(value)}
              searchable
              disabled={usersQuery.isLoading}
            />
          </Box>
        )}

        {/* Right: Date Range Filter */}
        <Box style={{ marginLeft: "auto" }}>
          <Stack gap="sm">
            <Group gap="sm" justify="flex-end">
              <SegmentedControl
                size="xs"
                value={dateRangePreset}
                onChange={(value) =>
                  setDateRangePreset(value as DateRangePreset)
                }
                data={[
                  { label: "Today", value: "today" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "This Week", value: "week" },
                  { label: "Last Week", value: "lastWeek" },
                  { label: "This Month", value: "month" },
                  { label: "Last Month", value: "lastMonth" },
                  { label: "Custom", value: "custom" },
                ]}
              />
            </Group>

            {/* Custom Date Range Picker - appears below on right */}
            {dateRangePreset === "custom" && (
              <DatePickerInput
                type="range"
                placeholder="Pick date range"
                value={customDateRange}
                onChange={(value) => {
                  if (Array.isArray(value)) {
                    setCustomDateRange(value as [Date | null, Date | null]);
                  }
                }}
                maxDate={new Date()}
                clearable
                style={{ maxWidth: "300px" }}
              />
            )}
          </Stack>
        </Box>
      </Group>

      {/* Metrics Cards */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} px="md" mb="lg">
        {/* Completion Rate */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            Completion Rate
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Group justify="center">
              <RingProgress
                size={120}
                thickness={12}
                sections={[
                  {
                    value: personalMetricsQuery.data?.completionRate || 0,
                    color: "violet",
                  },
                ]}
                label={
                  <Text ta="center" fw={700} size="xl">
                    {personalMetricsQuery.data?.completionRate || 0}%
                  </Text>
                }
              />
            </Group>
          )}
        </Paper>

        {/* On-Time Delivery */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            On-Time Delivery
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Group justify="center">
              <RingProgress
                size={120}
                thickness={12}
                sections={[
                  {
                    value: personalMetricsQuery.data?.onTimeDelivery || 0,
                    color: "violet",
                  },
                ]}
                label={
                  <Text ta="center" fw={700} size="xl">
                    {personalMetricsQuery.data?.onTimeDelivery || 0}%
                  </Text>
                }
              />
            </Group>
          )}
        </Paper>

        {/* Tasks Completed */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            Tasks Completed
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Stack align="center" justify="center" style={{ minHeight: 120 }}>
              <Text className={classes.value}>
                {personalMetricsQuery.data?.tasksCompleted || 0}
              </Text>
              <Text size="sm" c="dimmed">
                tasks
              </Text>
            </Stack>
          )}
        </Paper>

        {/* Hours Logged */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            Hours Logged
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Stack align="center" justify="center" style={{ minHeight: 120 }}>
              <Text className={classes.value}>
                {personalMetricsQuery.data?.hoursLogged || 0}
              </Text>
              <Text size="sm" c="dimmed">
                hours
              </Text>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Additional Metrics Row */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} px="md" mb="lg">
        {/* Pending Tasks */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            Pending Tasks
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Stack align="center" justify="center" style={{ minHeight: 120 }}>
              <Text className={classes.value}>
                {personalMetricsQuery.data?.pendingTasks || 0}
              </Text>
              <Text size="sm" c="dimmed">
                tasks
              </Text>
            </Stack>
          )}
        </Paper>

        {/* Overdue Tasks */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
          <Text className={classes.title} mb="md">
            Overdue Tasks
          </Text>
          {personalMetricsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : (
            <Stack align="center" justify="center" style={{ minHeight: 120 }}>
              <Text
                className={classes.value}
                c={
                  (personalMetricsQuery.data?.overdueTasks || 0) > 0
                    ? "red"
                    : undefined
                }
              >
                {personalMetricsQuery.data?.overdueTasks || 0}
              </Text>
              <Text size="sm" c="dimmed">
                tasks
              </Text>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Activity Heatmap */}
      <Box px="md" mb="lg">
        <ActivityHeatmap userId={selectedUserId} />
      </Box>
    </>
  );
}

// Main component with role check
export default function DashboardStats() {
  const { data: session } = useSession();

  // Client roles see simple dashboard
  const isClientRole =
    session?.user?.role === UserRole.CLIENT_ADMIN ||
    session?.user?.role === UserRole.CLIENT_USER;

  if (isClientRole) {
    return <SimpleDashboard />;
  }

  // Staff/Admin see analytics dashboard
  return <AnalyticsDashboard />;
}
