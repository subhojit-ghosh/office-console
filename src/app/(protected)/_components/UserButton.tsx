import classes from "./UserButton.module.css";

import { Avatar, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconLogout } from "@tabler/icons-react";
import { signOut } from "next-auth/react";

interface Props {
  name: string;
  email: string;
}

export function UserButton({ name, email }: Props) {
  return (
    <Menu shadow="md" width={200} withArrow position="bottom-end">
      <Menu.Target>
        <UnstyledButton className={classes.user}>
          <Group>
            <Avatar name={name} />

            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {name}
              </Text>
              <Text c="dimmed" size="xs">
                {email}
              </Text>
            </div>

            <IconChevronDown size={14} stroke={1.5} />
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
