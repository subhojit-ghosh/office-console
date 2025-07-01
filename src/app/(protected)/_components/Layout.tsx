"use client";

import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Navbar } from "./Navbar";

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  return (
    <AppShell
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Navbar>
        <Navbar />
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
        ⚒️ Development in progress
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
