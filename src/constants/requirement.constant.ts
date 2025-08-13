import { RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";

export const REQUIREMENT_TYPES = [
  RequirementType.NEW_PROJECT,
  RequirementType.FEATURE_REQUEST,
  RequirementType.CHANGE_REQUEST,
  RequirementType.BUG,
] as const;

export const REQUIREMENT_TYPE_MAP: Record<RequirementType, { label: string }> = {
  [RequirementType.NEW_PROJECT]: { label: "New Project" },
  [RequirementType.FEATURE_REQUEST]: { label: "Feature Request" },
  [RequirementType.CHANGE_REQUEST]: { label: "Change Request" },
  [RequirementType.BUG]: { label: "Bug / Issue" },
};

export const REQUIREMENT_TYPE_OPTIONS = REQUIREMENT_TYPES.map((t) => ({
  value: t,
  label: REQUIREMENT_TYPE_MAP[t].label,
}));

export const REQUIREMENT_STATUSES = [
  RequirementStatus.DRAFT,
  RequirementStatus.SUBMITTED,
  RequirementStatus.APPROVED,
  RequirementStatus.REJECTED,
  RequirementStatus.IN_PROGRESS,
  RequirementStatus.COMPLETED,
] as const;

export const REQUIREMENT_STATUS_MAP: Record<RequirementStatus, { label: string }> = {
  [RequirementStatus.DRAFT]: { label: "Draft" },
  [RequirementStatus.SUBMITTED]: { label: "Submitted" },
  [RequirementStatus.APPROVED]: { label: "Approved" },
  [RequirementStatus.REJECTED]: { label: "Rejected" },
  [RequirementStatus.IN_PROGRESS]: { label: "In Progress" },
  [RequirementStatus.COMPLETED]: { label: "Completed" },
};

export const REQUIREMENT_STATUS_OPTIONS = REQUIREMENT_STATUSES.map((s) => ({
  value: s,
  label: REQUIREMENT_STATUS_MAP[s].label,
}));

export const REQUIREMENT_STATUS_FILTERS = {
  PENDING: [
    RequirementStatus.DRAFT,
    RequirementStatus.SUBMITTED,
    RequirementStatus.APPROVED,
    RequirementStatus.IN_PROGRESS,
  ] as RequirementStatus[],
  COMPLETED: [RequirementStatus.COMPLETED, RequirementStatus.REJECTED] as RequirementStatus[],
} as const;

export const REQUIREMENT_PRIORITIES = [
  RequirementPriority.LOW,
  RequirementPriority.MEDIUM,
  RequirementPriority.HIGH,
  RequirementPriority.URGENT,
] as const;

export const REQUIREMENT_PRIORITY_MAP: Record<RequirementPriority, { label: string }> = {
  [RequirementPriority.LOW]: { label: "Low" },
  [RequirementPriority.MEDIUM]: { label: "Medium" },
  [RequirementPriority.HIGH]: { label: "High" },
  [RequirementPriority.URGENT]: { label: "Urgent" },
};

export const REQUIREMENT_PRIORITY_OPTIONS = REQUIREMENT_PRIORITIES.map((p) => ({
  value: p,
  label: REQUIREMENT_PRIORITY_MAP[p].label,
}));



