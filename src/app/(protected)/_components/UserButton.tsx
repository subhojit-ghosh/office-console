import classes from "./UserButton.module.css";

import { Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconLogout } from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";

export function UserButton() {
  const { data: session } = useSession();

  return (
    <Menu shadow="md" width={200} withArrow position="right-end">
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
