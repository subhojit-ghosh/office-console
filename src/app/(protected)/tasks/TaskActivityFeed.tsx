import { Avatar, Badge, Grid, Text } from "@mantine/core";
import { TaskActivityType } from "@prisma/client";
import { IconArrowRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "~/constants/task.constant";
import { titleCase } from "~/utils/text-formatting";

type Props = {
  activities: {
    type: TaskActivityType;
    id: string;
    createdAt: Date;
    user: {
      name: string;
      id: string;
    };
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
  }[];
};

const getBadgeColorAndLabel = (
  field: string,
  value: string,
): { color: string; label: string } => {
  if (field === "status") {
    const match = TASK_STATUS_OPTIONS.find((opt) => opt.value === value);
    return match
      ? { color: match.color, label: match.label }
      : { color: "gray", label: titleCase(value) };
  }

  if (field === "priority") {
    const match = TASK_PRIORITY_OPTIONS.find((opt) => opt.value === value);
    return match
      ? { color: match.color, label: match.label }
      : { color: "gray", label: titleCase(value) };
  }

  return { color: "gray", label: titleCase(value) };
};

const renderFieldChangeDetail = (activity: {
  field: string;
  oldValue: string;
  newValue: string;
}) => {
  const { field, oldValue, newValue } = activity;

  const oldFormatted =
    field === "dueDate"
      ? dayjs(oldValue).format("DD MMM YYYY")
      : getBadgeColorAndLabel(field, oldValue);

  const newFormatted =
    field === "dueDate"
      ? dayjs(newValue).format("DD MMM YYYY")
      : getBadgeColorAndLabel(field, newValue);

  return (
    <div>
      <Badge
        variant="outline"
        color={typeof oldFormatted === "string" ? "gray" : oldFormatted.color}
        radius="sm"
        size="xs"
      >
        {typeof oldFormatted === "string" ? oldFormatted : oldFormatted.label}
      </Badge>
      <IconArrowRight
        size={12}
        style={{
          marginLeft: 5,
          marginRight: 5,
          position: "relative",
          top: 2,
        }}
      />
      <Badge
        variant="outline"
        color={typeof newFormatted === "string" ? "gray" : newFormatted.color}
        radius="sm"
        size="xs"
      >
        {typeof newFormatted === "string" ? newFormatted : newFormatted.label}
      </Badge>
    </div>
  );
};

const renderActivityMessage = (activity: Props["activities"][number]) => {
  const field = titleCase(activity.field ?? "field");

  switch (activity.type) {
    case TaskActivityType.CREATED:
      return (
        <>
          {" "}
          created the <strong>Task</strong>
        </>
      );

    case TaskActivityType.FIELD_CHANGE:
      return (
        <>
          {" "}
          changed <strong>{field}</strong>
        </>
      );

    case TaskActivityType.UPDATED:
      return (
        <>
          {" "}
          updated <strong>{field}</strong>
        </>
      );

    case TaskActivityType.ASSIGNED:
      return (
        <>
          {" "}
          assigned <strong>{activity.newValue}</strong>
        </>
      );

    case TaskActivityType.UNASSIGNED:
      return (
        <>
          {" "}
          unassigned <strong>{activity.oldValue}</strong>
        </>
      );

    default:
      return null;
  }
};

export const TaskActivityFeed = ({ activities }: Props) => {
  if (!activities?.length) {
    return <Text size="sm">No activity yet.</Text>;
  }

  return (
    <>
      {activities.map((activity) => (
        <Grid key={activity.id} mb="md" align="flex-start">
          <Grid.Col span="content">
            <Avatar size="sm" name={activity.user.name} />
          </Grid.Col>

          <Grid.Col span="auto">
            <Text size="sm">
              <strong>{activity.user.name}</strong>
              {renderActivityMessage(activity)}
            </Text>

            <Text size="xs" c="dimmed">
              {dayjs(activity.createdAt).format("MMMM D, YYYY [at] h:mm A")}
            </Text>

            {activity.type === TaskActivityType.FIELD_CHANGE &&
              activity.field &&
              activity.oldValue &&
              activity.newValue &&
              renderFieldChangeDetail({
                field: activity.field,
                oldValue: activity.oldValue,
                newValue: activity.newValue,
              })}
          </Grid.Col>
        </Grid>
      ))}
    </>
  );
};
