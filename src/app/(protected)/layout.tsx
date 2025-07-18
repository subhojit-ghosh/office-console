import { redirect } from "next/navigation";
import React from "react";

import { SessionWrapper } from "~/components/SessionWrapper";
import { auth } from "~/server/auth";
import { Layout } from "./_components/Layout";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  return (
    <SessionWrapper session={session}>
      <Layout>{children}</Layout>
    </SessionWrapper>
  );
}
