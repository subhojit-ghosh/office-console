import {
  IconBug,
  IconCalendarEvent,
  IconCircleCheck,
  IconSparkles,
  IconTestPipe,
  IconTrendingUp,
  IconWorldSearch,
  IconWriting,
} from "@tabler/icons-react";

export const TASK_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
  "CANCELED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_MAP = {
  BACKLOG: { label: "Backlog", color: "gray" },
  TODO: { label: "To Do", color: "blue" },
  IN_PROGRESS: { label: "In Progress", color: "yellow" },
  IN_REVIEW: { label: "In Review", color: "cyan" },
  BLOCKED: { label: "Blocked", color: "red" },
  DONE: { label: "Done", color: "green" },
  CANCELED: { label: "Canceled", color: "pink" },
} as const;

export const TASK_STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: TASK_STATUS_MAP[status].label,
  color: TASK_STATUS_MAP[status].color,
}));

export const TASK_STATUS_FILTERS = {
  PENDING: [
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "BLOCKED",
  ] as TaskStatus[],
  COMPLETED: ["DONE", "CANCELED"] as TaskStatus[],
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_MAP = {
  LOW: { label: "Low", color: "blue" },
  MEDIUM: { label: "Medium", color: "yellow" },
  HIGH: { label: "High", color: "orange" },
  URGENT: { label: "Urgent", color: "red" },
} as const;

export const TASK_PRIORITY_OPTIONS = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: TASK_PRIORITY_MAP[priority].label,
  color: TASK_PRIORITY_MAP[priority].color,
}));

export const TASK_TYPES = [
  "TASK",
  "BUG",
  "FEATURE",
  "IMPROVEMENT",
  "RESEARCH",
  "DOCUMENTATION",
  "TEST",
  "MEETING",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_MAP = {
  TASK: {
    label: "Task",
    icon: IconCircleCheck,
    color: "blue",
  },
  BUG: {
    label: "Bug",
    icon: IconBug,
    color: "red",
  },
  FEATURE: {
    label: "Feature",
    icon: IconSparkles,
    color: "green",
  },
  IMPROVEMENT: {
    label: "Improvement",
    icon: IconTrendingUp,
    color: "blue",
  },
  RESEARCH: {
    label: "Research",
    icon: IconWorldSearch,
    color: "violet",
  },
  DOCUMENTATION: {
    label: "Documentation",
    icon: IconWriting,
    color: "orange",
  },
  TEST: {
    label: "Test",
    icon: IconTestPipe,
    color: "teal",
  },
  MEETING: {
    label: "Meeting",
    icon: IconCalendarEvent,
    color: "cyan",
  },
} as const;

export const TASK_TYPE_OPTIONS = TASK_TYPES.map((type) => ({
  value: type,
  label: TASK_TYPE_MAP[type].label,
  icon: TASK_TYPE_MAP[type].icon,
  color: TASK_TYPE_MAP[type].color,
}));

export const TASK_COMMENT_TYPES = [
  "GENERAL",
  "BLOCK_REASON",
  "ON_HOLD_REASON",
] as const;

export const TASK_LINK_TYPES = ["BLOCKS", "DEPENDS_ON"] as const;
export type TaskLinkType = (typeof TASK_LINK_TYPES)[number];

export const TASK_LINK_DIRECTIONAL_OPTIONS = [
  {
    value: "BLOCKS:outgoing",
    label: "Blocks",
  },
  {
    value: "BLOCKS:incoming",
    label: "Is Blocked By",
  },
  {
    value: "DEPENDS_ON:outgoing",
    label: "Depends On",
  },
  {
    value: "DEPENDS_ON:incoming",
    label: "Is Required By",
  },
] as const;
