import type { Metadata } from "next";
import { env } from "~/env";
import TasksList from "./TasksList";

export const metadata: Metadata = {
  title: `Tasks - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default function TasksPage() {
  return <TasksList />;
}
