"use client";

import { Anchor, Button, Group, useMantineColorScheme } from "@mantine/core";
import {
  IconFoldersFilled,
  IconHomeFilled,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaTasks, FaUsers, FaUserTie } from "react-icons/fa";

import classes from "./Navbar.module.css";
import { UserButton } from "./UserButton";

const data = [
  { link: "/dashboard", label: "Dashboard", icon: IconHomeFilled },
  { link: "/projects", label: "Projects", icon: IconFoldersFilled },
  { link: "/tasks", label: "Tasks", icon: FaTasks },
  { link: "/users", label: "Users", icon: FaUsers },
  { link: "/clients", label: "Clients", icon: FaUserTie },
];

interface Props {
  name: string;
  email: string;
}

export function Navbar({ name, email }: Props) {
  const pathname = usePathname();
  const { setColorScheme } = useMantineColorScheme();

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
      <div className={classes.navbarMain}>{links}</div>
      <Button variant="subtle" onClick={() => setColorScheme("light")}>Light</Button>
      <Button variant="subtle" onClick={() => setColorScheme("dark")}>Dark</Button>
      <div className={classes.footer}>
        <Group>
          <UserButton name={name} email={email} />
        </Group>
      </div>
    </nav>
  );
}
