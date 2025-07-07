import classes from "./UserButton.module.css";

import { Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronRight, IconLogout } from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";

export function UserButton() {
  const { data: session } = useSession();
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <Menu
      shadow="md"
      width={isMobile ? 300 : 200}
      withArrow
      position={isMobile ? "top-end" : "right-end"}
    >
      <Menu.Target>
        <UnstyledButton className={classes.user}>
          <Group>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {session?.user?.name}
              </Text>
              <Text c="dimmed" size="xs">
                {session?.user?.email}
              </Text>
            </div>

            <IconChevronRight size={14} stroke={1.5} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconLogout size={14} />}
          color="red"
          onClick={() => signOut()}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
