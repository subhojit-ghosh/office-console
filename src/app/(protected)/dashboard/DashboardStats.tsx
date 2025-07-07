"use client";

import { Group, Paper, SimpleGrid, Skeleton, Text, Title } from "@mantine/core";
import { IconHomeFilled } from "@tabler/icons-react";

import { FaTasks } from "react-icons/fa";
import { api } from "~/trpc/react";
import classes from "./DashboardStats.module.css";

export default function DashboardStats() {
  const dashboardQuery = api.dashboard.stats.useQuery();

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
        {/* <Paper withBorder p="md" radius="md" className={classes.card}>
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
        </Paper> */}
        <Paper withBorder p="md" radius="md" className={classes.card}>
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
