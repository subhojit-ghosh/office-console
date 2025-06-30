import type { Metadata } from "next";
import ProjectsList from "./ProjectsList";

export const metadata: Metadata = {
  title: "Projects - Office Console",
};

export default async function ProjectsPage() {
  return <ProjectsList />;
}
