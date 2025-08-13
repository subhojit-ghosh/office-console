import { RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";
import {
  IconFilePlus,
  IconBulb,
  IconGitPullRequest,
  IconBug,
} from "@tabler/icons-react";

export const REQUIREMENT_TYPES = [
  RequirementType.NEW_PROJECT,
  RequirementType.FEATURE_REQUEST,
  RequirementType.CHANGE_REQUEST,
  RequirementType.BUG,
] as const;

export const REQUIREMENT_TYPE_MAP: Record<
  RequirementType,
  { label: string; color: string; icon: any }
> = {
  [RequirementType.NEW_PROJECT]: { label: "New Project", color: "blue", icon: IconFilePlus },
  [RequirementType.FEATURE_REQUEST]: { label: "Feature Request", color: "green", icon: IconBulb },
  [RequirementType.CHANGE_REQUEST]: { label: "Change Request", color: "orange", icon: IconGitPullRequest },
  [RequirementType.BUG]: { label: "Bug / Issue", color: "red", icon: IconBug },
};

export const REQUIREMENT_TYPE_OPTIONS = REQUIREMENT_TYPES.map((t) => ({
  value: t,
  label: REQUIREMENT_TYPE_MAP[t].label,
  color: REQUIREMENT_TYPE_MAP[t].color,
  icon: REQUIREMENT_TYPE_MAP[t].icon,
}));

export const REQUIREMENT_STATUSES = [
  RequirementStatus.DRAFT,
  RequirementStatus.SUBMITTED,
  RequirementStatus.APPROVED,
  RequirementStatus.REJECTED,
  RequirementStatus.IN_PROGRESS,
  RequirementStatus.COMPLETED,
] as const;

export const REQUIREMENT_STATUS_MAP: Record<RequirementStatus, { label: string; color: string }> = {
  [RequirementStatus.DRAFT]: { label: "Draft", color: "gray" },
  [RequirementStatus.SUBMITTED]: { label: "Submitted", color: "blue" },
  [RequirementStatus.APPROVED]: { label: "Approved", color: "green" },
  [RequirementStatus.REJECTED]: { label: "Rejected", color: "red" },
  [RequirementStatus.IN_PROGRESS]: { label: "In Progress", color: "yellow" },
  [RequirementStatus.COMPLETED]: { label: "Completed", color: "teal" },
};

export const REQUIREMENT_STATUS_OPTIONS = REQUIREMENT_STATUSES.map((s) => ({
  value: s,
  label: REQUIREMENT_STATUS_MAP[s].label,
  color: REQUIREMENT_STATUS_MAP[s].color,
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

export const REQUIREMENT_PRIORITY_MAP: Record<RequirementPriority, { label: string; color: string }> = {
  [RequirementPriority.LOW]: { label: "Low", color: "blue" },
  [RequirementPriority.MEDIUM]: { label: "Medium", color: "yellow" },
  [RequirementPriority.HIGH]: { label: "High", color: "orange" },
  [RequirementPriority.URGENT]: { label: "Urgent", color: "red" },
};

export const REQUIREMENT_PRIORITY_OPTIONS = REQUIREMENT_PRIORITIES.map((p) => ({
  value: p,
  label: REQUIREMENT_PRIORITY_MAP[p].label,
  color: REQUIREMENT_PRIORITY_MAP[p].color,
}));



