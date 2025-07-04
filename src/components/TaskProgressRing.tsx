import { RingProgress, Text, Center, ActionIcon } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

interface TaskProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  thickness?: number;
}

const getProgressColor = (percentage: number): string => {
  if (percentage === 100) return "green";
  if (percentage >= 75) return "teal";
  if (percentage >= 50) return "blue";
  if (percentage >= 25) return "yellow";
  return "red";
};

export function TaskProgressRing({
  completed,
  total,
  size = 50,
  thickness = 6,
}: TaskProgressRingProps) {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);
  const color = getProgressColor(percentage);

  return (
    <RingProgress
      thickness={thickness}
      size={size}
      roundCaps
      sections={[{ value: percentage, color }]}
      label={
        percentage === 100 ? (
          <Center>
            <ActionIcon color="teal" variant="light" radius="xl" size="sm">
              <IconCheck size={18} />
            </ActionIcon>
          </Center>
        ) : (
          <Text c={color} ta="center" fz={12}>
            {percentage}%
          </Text>
        )
      }
    />
  );
}
