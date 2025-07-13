"use client";

import {
  ActionIcon,
  Anchor,
  Collapse,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconFoldersFilled,
  IconHomeFilled,
  IconMoon,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BsBarChartLineFill } from "react-icons/bs";
import { FaCubes, FaTasks, FaUsers, FaUserTie } from "react-icons/fa";

import { useMediaQuery } from "@mantine/hooks";
import { UserRole } from "@prisma/client";
import { useState } from "react";
import { env } from "~/env";
import classes from "./Navbar.module.css";
import { UserButton } from "./UserButton";

interface NavbarProps {
  toggleMobile?: () => void;
}

export function Navbar({ toggleMobile }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [openedMap, setOpenedMap] = useState<Record<string, boolean>>({});

  const data = [
    { link: "/dashboard", label: "Dashboard", icon: IconHomeFilled },
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
    ...(session?.user?.role !== UserRole.CLIENT
      ? [
          {
            link: "/reports",
            label: "Reports",
            icon: BsBarChartLineFill,
            links: [{ label: "Work Logs", link: "/reports/work-logs" }],
          },
        ]
      : []),
  ];

  const links = data.map((item) => {
    const isActive = pathname.startsWith(item.link ?? "");

    if ("links" in item && item.links) {
      const submenuOpen =
        openedMap[item.label] ??
        item.links.some((sub) => pathname.startsWith(sub.link));

      return (
        <div key={item.label}>
          <div
            className={classes.link}
            data-active={isActive || undefined}
            data-active-no-background="true"
            onClick={() =>
              setOpenedMap((prev) => ({
                ...prev,
                [item.label]: !submenuOpen,
              }))
            }
            style={{ cursor: "pointer" }}
          >
            <item.icon className={classes.linkIcon} />
            <span>{item.label}</span>
            <div
              style={{ marginLeft: "auto", position: "relative", top: "4px" }}
            >
              {submenuOpen ? (
                <IconChevronDown
                  size={16}
                  className={classes.linkIcon}
                  style={{ marginRight: 0, width: 16, height: 16 }}
                />
              ) : (
                <IconChevronRight
                  size={16}
                  className={classes.linkIcon}
                  style={{ marginRight: 0, width: 16, height: 16 }}
                />
              )}
            </div>
          </div>

          <Collapse in={submenuOpen}>
            <div className={classes.submenu}>
              {item.links.map((sub) => (
                <Anchor
                  className={classes.link}
                  data-active={pathname.startsWith(sub.link) || undefined}
                  component={Link}
                  href={sub.link}
                  key={sub.label}
                  onClick={() => {
                    if (toggleMobile && isMobile) toggleMobile();
                  }}
                >
                  {sub.label}
                </Anchor>
              ))}
            </div>
          </Collapse>
        </div>
      );
    }

    return (
      <Anchor
        className={classes.link}
        data-active={isActive || undefined}
        component={Link}
        href={item.link}
        key={item.label}
        onClick={() => {
          if (toggleMobile && isMobile) toggleMobile();
        }}
      >
        <item.icon className={classes.linkIcon} />
        <span>{item.label}</span>
      </Anchor>
    );
  });

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
