import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import LoginForm from "./LoginForm";

export default async function page() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
