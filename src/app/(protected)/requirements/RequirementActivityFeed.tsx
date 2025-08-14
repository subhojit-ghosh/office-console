import { Avatar, Badge, Grid, Text } from "@mantine/core";
import { RequirementActivityType, RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";
import { IconArrowRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { REQUIREMENT_PRIORITY_OPTIONS, REQUIREMENT_STATUS_OPTIONS, REQUIREMENT_TYPE_OPTIONS } from "~/constants/requirement.constant";
import { titleCase } from "~/utils/text-formatting";

type Props = {
  activities: {
    type: RequirementActivityType;
    id: string;
    createdAt: Date;
    user: { name: string; id: string };
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
  }[];
};

const getBadgeColorAndLabel = (field: string, value: string): { color: string; label: string } => {
  if (field === "type") {
    const match = REQUIREMENT_TYPE_OPTIONS.find((opt) => opt.value === (value as unknown as RequirementType));
    return match ? { color: match.color, label: match.label } : { color: "gray", label: titleCase(value) };
  }
  if (field === "status") {
    const match = REQUIREMENT_STATUS_OPTIONS.find((opt) => opt.value === (value as unknown as RequirementStatus));
    return match ? { color: match.color, label: match.label } : { color: "gray", label: titleCase(value) };
  }
  if (field === "priority") {
    const match = REQUIREMENT_PRIORITY_OPTIONS.find((opt) => opt.value === (value as unknown as RequirementPriority));
    return match ? { color: match.color, label: match.label } : { color: "gray", label: titleCase(value) };
  }
  return { color: "gray", label: titleCase(value) };
};

const renderFieldChangeDetail = (activity: { field: string; oldValue: string; newValue: string }) => {
  const { field, oldValue, newValue } = activity;
  const oldFormatted = getBadgeColorAndLabel(field, oldValue);
  const newFormatted = getBadgeColorAndLabel(field, newValue);
  return (
    <div>
      <Badge variant="outline" color={oldFormatted.color} radius="sm" size="xs">
        {oldFormatted.label}
      </Badge>
      <IconArrowRight size={12} style={{ marginLeft: 5, marginRight: 5, position: "relative", top: 2 }} />
      <Badge variant="outline" color={newFormatted.color} radius="sm" size="xs">
        {newFormatted.label}
      </Badge>
    </div>
  );
};

const renderActivityMessage = (activity: Props["activities"][number]) => {
  const field = titleCase(activity.field ?? "field");
  switch (activity.type) {
    case RequirementActivityType.CREATED:
      return (
        <>
          {" "}
          created the <strong>Requirement</strong>
        </>
      );
    case RequirementActivityType.FIELD_CHANGE:
      return (
        <>
          {" "}
          changed <strong>{field}</strong>
        </>
      );
    case RequirementActivityType.UPDATED:
      return (
        <>
          {" "}
          updated <strong>{field}</strong>
        </>
      );
    default:
      return null;
  }
};

export const RequirementActivityFeed = ({ activities }: Props) => {
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
            {activity.type === RequirementActivityType.FIELD_CHANGE &&
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



