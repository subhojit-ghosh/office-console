"use client";

import {
  Paper,
  Text,
  Tooltip,
  Box,
  Stack,
  useMantineColorScheme,
  Group,
} from "@mantine/core";
import { useMemo } from "react";
import { api } from "~/trpc/react";

interface ActivityHeatmapProps {
  userId: string;
}

export default function ActivityHeatmap({ userId }: ActivityHeatmapProps) {
  const { colorScheme } = useMantineColorScheme();

  // Always use last 12 months
  const [startDate, endDate] = useMemo(() => {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    return [twelveMonthsAgo, now];
  }, []);

  // Fetch activity data from API
  const { data: activityData, isLoading } =
    api.dashboard.activityHeatmap.useQuery(
      {
        userId,
        startDate,
        endDate,
      },
      { enabled: !!userId },
    );

  // Create a map for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    activityData?.forEach((item) => {
      map.set(item.date, item.hours);
    });
    return map;
  }, [activityData]);

  // Generate all days in the range
  const days = useMemo(() => {
    const result: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [startDate, endDate]);

  // Group days by week for GitHub-style layout
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    // Start from the first Monday before or on startDate
    const firstDay = new Date(startDate);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstDay.setDate(firstDay.getDate() + daysToMonday);

    const current = new Date(firstDay);
    const end = new Date(endDate);

    while (current <= end) {
      currentWeek.push(new Date(current));

      if (current.getDay() === 0) {
        // Sunday - end of week
        result.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    // Add any remaining days
    if (currentWeek.length > 0) {
      // Fill the rest of the week with empty slots
      while (currentWeek.length < 7) {
        const nextDay = new Date(current);
        currentWeek.push(nextDay);
        current.setDate(current.getDate() + 1);
      }
      result.push(currentWeek);
    }

    return result;
  }, [startDate, endDate]);

  // Helper to get color based on hours
  const getColor = (hours: number) => {
    if (hours === 0) return "var(--mantine-color-gray-1)";
    if (hours < 2) return "var(--mantine-color-violet-2)";
    if (hours < 4) return "var(--mantine-color-violet-4)";
    if (hours < 6) return "var(--mantine-color-violet-6)";
    return "var(--mantine-color-violet-8)";
  };

  // Helper to get dark mode color
  const getDarkColor = (hours: number) => {
    if (hours === 0) return "var(--mantine-color-dark-6)";
    if (hours < 2) return "var(--mantine-color-violet-9)";
    if (hours < 4) return "var(--mantine-color-violet-7)";
    if (hours < 6) return "var(--mantine-color-violet-5)";
    return "var(--mantine-color-violet-3)";
  };

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Text fw={600}>Activity Heatmap (Last 12 Months)</Text>

        {isLoading ? (
          <Text c="dimmed" size="sm">
            Loading...
          </Text>
        ) : (
          <Box
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <Box
              style={{
                display: "flex",
                gap: "3px",
                overflowX: "auto",
              }}
            >
              {/* Day labels */}
              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  paddingTop: "20px",
                }}
              >
                {dayLabels.map((label, i) => (
                  <Box
                    key={label}
                    style={{
                      height: "14px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "var(--mantine-color-dimmed)",
                      paddingRight: "6px",
                    }}
                  >
                    <Text size="12px" c="dimmed">
                      {label}
                    </Text>
                  </Box>
                ))}
              </Box>

              {/* Weeks grid */}
              {weeks.map((week, weekIdx) => {
                const firstDayOfWeek = week[0];
                const showMonth =
                  firstDayOfWeek &&
                  (weekIdx === 0 || firstDayOfWeek.getDate() <= 7);

                return (
                  <Box
                    key={weekIdx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {/* Month label */}
                    {showMonth && firstDayOfWeek && (
                      <Text
                        size="12px"
                        c="dimmed"
                        style={{ height: "16px", marginBottom: "3px" }}
                      >
                        {monthLabels[firstDayOfWeek.getMonth()]}
                      </Text>
                    )}
                    {!showMonth && <Box style={{ height: "19px" }} />}

                    {/* Days in week */}
                    {week.map((date, dayIdx) => {
                      const dateKey = date.toISOString().split("T")[0]!;
                      const hours = activityMap.get(dateKey) ?? 0;
                      const isOutsideRange = date < startDate || date > endDate;

                      if (isOutsideRange) {
                        return (
                          <Box
                            key={dayIdx}
                            style={{
                              width: "14px",
                              height: "14px",
                              visibility: "hidden",
                            }}
                          />
                        );
                      }

                      return (
                        <Tooltip
                          key={dayIdx}
                          label={`${date.toLocaleDateString()}: ${hours} hours`}
                          withArrow
                          position="top"
                        >
                          <Box
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "3px",
                              backgroundColor:
                                colorScheme === "dark"
                                  ? getDarkColor(hours)
                                  : getColor(hours),
                              cursor: "pointer",
                              transition: "transform 0.1s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
