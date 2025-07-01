import {
  ActionIcon,
  Burger,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import classes from "./Navbar.module.css";

interface MobileHeaderProps {
  toggleMobile: () => void;
}

export default function MobileHeader({ toggleMobile }: MobileHeaderProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  return (
    <Group justify="space-between" align="center" px="md" h="100%">
      <Group align="center" gap="xs">
        <Burger onClick={toggleMobile} size="sm" />
        <Title size="lg">Office Console</Title>
      </Group>
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
  );
}
