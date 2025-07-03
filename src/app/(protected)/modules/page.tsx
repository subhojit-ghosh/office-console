import { type Metadata } from "next";
import { env } from "~/env";
import ModulesList from "./ModulesList";

export const metadata: Metadata = {
  title: `Modules - ${env.NEXT_PUBLIC_APP_TITLE}`,
};

export default function ModulesPage() {
  return <ModulesList />;
}
