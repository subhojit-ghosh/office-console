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
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCubes, FaTasks, FaUsers, FaUserTie } from "react-icons/fa";
import { BiSolidTimer } from "react-icons/bi";

import { UserRole } from "@prisma/client";
import classes from "./Navbar.module.css";
import { UserButton } from "./UserButton";
import { useMediaQuery } from "@mantine/hooks";
import { env } from "~/env";

interface NavbarProps {
  toggleMobile?: () => void;
}

export function Navbar({ toggleMobile }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  const isMobile = useMediaQuery("(max-width: 48em)");

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
      onClick={() => {
        if (toggleMobile && isMobile) {
          toggleMobile();
        }
      }}
    >
      <item.icon className={classes.linkIcon} />
      <span>{item.label}</span>
    </Anchor>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Title size="lg">{env.NEXT_PUBLIC_APP_TITLE}</Title>
          {isMobile ? (
            <ActionIcon onClick={toggleMobile} variant="default">
              <IconX size={18} />
            </ActionIcon>
          ) : (
            <ActionIcon
              onClick={() =>
                setColorScheme(
                  computedColorScheme === "light" ? "dark" : "light",
                )
              }
              variant="default"
            >
              <IconSun size={18} className={classes.colorSchemeLightIcon} />
              <IconMoon size={18} className={classes.colorSchemeDarkIcon} />
            </ActionIcon>
          )}
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
