import { Button, Menu } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";

interface EditableBadgeDropdownProps<T extends string> {
  value: T;
  options: {
    value: T;
    label: string;
    color?: string;
  }[];
  onChange: (value: T) => void;
  compact?: boolean;
  hoverEffect?: boolean;
  fullWidth?: boolean;
}

export function EditableBadgeDropdown<T extends string>({
  value,
  options,
  onChange,
  compact = true,
  hoverEffect = true,
  fullWidth = false,
}: EditableBadgeDropdownProps<T>) {
  const { hovered, ref } = useHover();
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref}>
      <Menu withArrow position="bottom-end" shadow="md">
        <Menu.Target>
          <Button
            fullWidth={fullWidth}
            size={`${compact ? "compact-" : ""}xs`}
            variant={hoverEffect ? (hovered ? "outline" : "subtle") : "outline"}
            color={current?.color}
            rightSection={<IconChevronDown size={14} />}
          >
            {current?.label.toUpperCase() ?? value}
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
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
