"use client";

import { AppShell, Burger, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { User } from "next-auth";
import { Navbar } from "./Navbar";
import { UserButton } from "./UserButton";

export function Layout({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: User }>) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  return (
    <AppShell
      // header={{ height: 60 }}
      navbar={{
        width: 230,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      {/* <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <div>
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
            />
            Office Console
          </div>
          <UserButton name={user.name!} email={user.email!} />
        </Group>
      </AppShell.Header> */}
      <AppShell.Navbar>
        <Navbar />
      </AppShell.Navbar>
      <AppShell.Main pt="md">{children}</AppShell.Main>
    </AppShell>
  );
}
