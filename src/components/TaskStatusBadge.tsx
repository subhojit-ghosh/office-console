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
}

export function EditableBadgeDropdown<T extends string>({
  value,
  options,
  onChange,
}: EditableBadgeDropdownProps<T>) {
  const { hovered, ref } = useHover();
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref}>
      <Menu withArrow position="bottom-end" shadow="md">
        <Menu.Target>
          <Button
            size="compact-xs"
            variant={hovered ? "outline" : "subtle"}
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
