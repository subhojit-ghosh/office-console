"use client";

import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { User } from "next-auth";
import { Navbar } from "./Navbar";

export function Layout({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: User }>) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  return (
    <AppShell
      navbar={{
        width: 230,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Navbar>
        <Navbar name={user.name!} email={user.email!} />
      </AppShell.Navbar>
      <AppShell.Main pt="md">{children}</AppShell.Main>
      <div
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          fontSize: "0.85rem",
          color: "#888",
          zIndex: 50,
        }}
      >
        {/* 🐛 Built by Subhojit Ghosh — free bugs included */}
        {/* 🛠️ In development - Subhojit Ghosh */}
        {/* 🐛 More features coming (and bugs too) — Subhojit Ghosh */}
        ⚒️ Development in progress - Subhojit Ghosh
        {/* <a
          href="https://github.com/subhojit-ghosh/office-console"
          target="_blank"
          style={{ textDecoration: "none" }}
        >
          Subhojit Ghosh
        </a> */}
      </div>
    </AppShell>
  );
}
