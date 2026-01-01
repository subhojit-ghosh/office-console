export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "SIGNED_OFF",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_MAP = {
  OPEN: { label: "Open", color: "blue" },
  IN_PROGRESS: { label: "In Progress", color: "yellow" },
  RESOLVED: { label: "Resolved", color: "green" },
  CLOSED: { label: "Closed", color: "gray" },
  REOPENED: { label: "Reopened", color: "orange" },
  SIGNED_OFF: { label: "Signed Off", color: "teal" },
} as const;

export const TICKET_STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_MAP[status].label,
  color: TICKET_STATUS_MAP[status].color,
}));

export const TICKET_COMMENT_TYPES = ["GENERAL"] as const;
