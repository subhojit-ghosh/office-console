"use client";

import { Group, Paper, SimpleGrid, Skeleton, Text, Title } from "@mantine/core";
import { IconFoldersFilled, IconHomeFilled } from "@tabler/icons-react";
import { FaTasks } from "react-icons/fa";
import { api } from "~/trpc/react";
import classes from "./DashboardStats.module.css";

export default function DashboardStats() {
  const dashboardQuery = api.dashboard.stats.useQuery();
  // const taskTypeBreakdownQuery = api.dashboard.taskTypeBreakdown.useQuery();

  // const breakdownMap = Object.fromEntries(
  //   (taskTypeBreakdownQuery.data ?? []).map((item) => [item.type, item.count]),
  // );

  // const visibleTypes = TASK_TYPE_OPTIONS.filter(
  //   (type) => (breakdownMap[type.value] ?? 0) > 0,
  // );

  // const chartData = [
  //   visibleTypes.reduce<Record<string, number | string>>(
  //     (acc, type) => {
  //       acc[type.value] = breakdownMap[type.value] ?? 0;
  //       return acc;
  //     },
  //     { label: "Task Types" },
  //   ),
  // ];

  // const chartSeries = TASK_TYPE_OPTIONS.filter((type) =>
  //   visibleTypes.includes(type),
  // ).map((type) => ({
  //   name: type.value,
  //   color: type.color,
  // }));

  return (
    <>
      <Group justify="space-between" px="md" mb="md">
        <Group gap="xs">
          <IconHomeFilled />
          <Title size="lg">Dashboard</Title>
        </Group>
        <Group gap="xs"></Group>
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
            {/* <BarChart
              h={300}
              data={chartData}
              dataKey="label"
              series={chartSeries}
              tickLine="y"
              orientation="vertical"
              withXAxis={false}
              withYAxis={false}
              styles={{
                bar: {
                  borderRadius: "4px",
                },
              }}
            /> */}
          </Group>
          {/* <Progress.Root size="xl">
                <Progress.Section value={35} color="cyan">
                  <Progress.Label>Documents</Progress.Label>
                </Progress.Section>
                <Progress.Section value={28} color="pink">
                  <Progress.Label>Photos</Progress.Label>
                </Progress.Section>
                <Progress.Section value={15} color="orange">
                  <Progress.Label>Other</Progress.Label>
                </Progress.Section>
              </Progress.Root> */}
        </Paper>
      </SimpleGrid>
    </>
  );
}
