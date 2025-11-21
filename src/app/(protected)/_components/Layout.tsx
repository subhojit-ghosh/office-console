"use client";

import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import MobileHeader from "./MobileHeader";
import { Navbar } from "./Navbar";

import QuickLogFab from "./QuickLogFab";
import classes from "./Layout.module.css";

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened] = useDisclosure(true);

  return (
    <AppShell
      navbar={{
        width: 225,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Header className={classes.headerMobileOnly}>
        <MobileHeader toggleMobile={toggleMobile} />
      </AppShell.Header>

      <AppShell.Navbar>
        <Navbar toggleMobile={toggleMobile} />
      </AppShell.Navbar>
      <AppShell.Main pt="md" className={classes.mainWithMobileHeader}>
        {children}
        <QuickLogFab />
        <div style={{ height: 100 }} />
      </AppShell.Main>
      {/* <div
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          fontSize: "0.85rem",
          color: "#888",
          zIndex: 50,
        }}
      > */}
      {/* 🐛 Built by Subhojit Ghosh — free bugs included */}
      {/* 🛠️ In development - Subhojit Ghosh */}
      {/* 🐛 More features coming (and bugs too) — Subhojit Ghosh */}
      {/* ⚒️ Development in progress */}
      {/* <a
          href="https://github.com/subhojit-ghosh/office-console"
          target="_blank"
          style={{ textDecoration: "none" }}
        >
          Subhojit Ghosh
        </a> */}
      {/* </div> */}
    </AppShell>
  );
}
