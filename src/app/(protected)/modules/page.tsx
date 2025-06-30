import { type Metadata } from "next";
import ModulesList from "./ModulesList";

export const metadata: Metadata = {
  title: "Modules - Office Console",
};

export default function ModulesPage() {
  return <ModulesList />;
}
