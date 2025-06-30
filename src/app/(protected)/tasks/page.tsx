import type { Metadata } from "next";
import TasksList from "./TasksList";

export const metadata: Metadata = {
  title: "Tasks - Office Console",
};

export default function TasksPage() {
  return <TasksList />;
}
