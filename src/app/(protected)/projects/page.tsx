import type { Metadata } from "next";
import ProjectsList from "./ProjectsList";
import { env } from "~/env";

export const metadata: Metadata = {
  title: `Projects - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default async function ProjectsPage() {
  return <ProjectsList />;
}
