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
