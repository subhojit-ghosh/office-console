"use client";

import {
  IconBriefcase,
  IconChecklist,
  IconDashboard,
  IconFolders,
  IconUsers,
} from "@tabler/icons-react";

import { Anchor } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./Navbar.module.css";

const data = [
  { link: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { link: "/projects", label: "Projects", icon: IconFolders },
  { link: "/tasks", label: "Tasks", icon: IconChecklist },
  { link: "/users", label: "Users", icon: IconUsers },
  { link: "/clients", label: "Clients", icon: IconBriefcase },
];

export function Navbar() {
  const pathname = usePathname();

  const links = data.map((item) => (
    <Anchor
      className={classes.link}
      data-active={pathname.startsWith(item.link) || undefined}
      component={Link}
      href={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Anchor>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>{links}</div>
    </nav>
  );
}
