import { Button, Group, Menu, type FloatingPosition } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  IconChevronDown,
  type Icon,
  type IconProps,
} from "@tabler/icons-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

interface EditableBadgeDropdownProps<T extends string> {
  value: T;
  options: {
    value: T;
    label: string;
    color?: string;
    icon?: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  }[];
  onChange: (value: T) => void;
  compact?: boolean;
  hoverEffect?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  isIconVariant?: boolean;
  variant?: "outline" | "subtle";
  position?: FloatingPosition;
}

export function EditableBadgeDropdown<T extends string>({
  value,
  options,
  onChange,
  compact = true,
  hoverEffect = true,
  fullWidth = false,
  loading = false,
  isIconVariant = false,
  variant = "outline",
  position = "bottom-end",
}: EditableBadgeDropdownProps<T>) {
  const { hovered, ref } = useHover();
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref}>
      <Menu withArrow position={position} shadow="md">
        <Menu.Target>
          <Button
            fullWidth={fullWidth}
            size={`${compact ? "compact-" : ""}xs`}
            variant={hoverEffect ? (hovered ? "outline" : "subtle") : variant}
            color={current?.color}
            rightSection={<IconChevronDown size={14} />}
            loading={loading}
          >
            {isIconVariant && current?.icon ? (
              <current.icon size={18} />
            ) : (
              (current?.label.toUpperCase() ?? value)
            )}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          {options.map((option) => (
            <Menu.Item
              key={option.value}
              color={option.color}
              onClick={() => onChange(option.value)}
              disabled={option.value === value}
            >
              <Group gap="xs" align="center">
                {isIconVariant && option.icon && <option.icon size={18} />}
                {option.label}
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
