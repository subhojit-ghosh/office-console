"use client";

import {
  ActionIcon,
  Anchor,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconFoldersFilled,
  IconHomeFilled,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCubes, FaTasks, FaUsers, FaUserTie } from "react-icons/fa";

import { UserRole } from "@prisma/client";
import classes from "./Navbar.module.css";
import { UserButton } from "./UserButton";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });

  const data = [
    { link: "/dashboard", label: "Dashboard", icon: IconHomeFilled },
    // { link: "/reporting", label: "Reporting", icon: BsBarChartLineFill },
    // { link: "/time", label: "Time", icon: BiSolidTimer },
    { link: "/tasks", label: "Tasks", icon: FaTasks },
    { link: "/modules", label: "Modules", icon: FaCubes },
    { link: "/projects", label: "Projects", icon: IconFoldersFilled },
    ...(session?.user?.role === UserRole.ADMIN
      ? [
          { link: "/users", label: "Users", icon: FaUsers },
          { link: "/clients", label: "Clients", icon: FaUserTie },
        ]
      : []),
  ];

  const links = data.map((item) => (
    <Anchor
      className={classes.link}
      data-active={pathname.startsWith(item.link) || undefined}
      component={Link}
      href={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} />
      <span>{item.label}</span>
    </Anchor>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Title size="lg">Office Console</Title>
          <ActionIcon
            onClick={() =>
              setColorScheme(computedColorScheme === "light" ? "dark" : "light")
            }
            variant="default"
          >
            <IconSun size={18} className={classes.colorSchemeLightIcon} />
            <IconMoon size={18} className={classes.colorSchemeDarkIcon} />
          </ActionIcon>
        </Group>
        {links}
      </div>
      <div className={classes.footer}>
        <Group>
          <UserButton />
        </Group>
      </div>
    </nav>
  );
}
