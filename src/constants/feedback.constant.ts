
export const FEEDBACK_TYPES = ["FEEDBACK", "BUG", "FEATURE", "OTHER"] as const;

export const FEEDBACK_TYPE_MAP = {
  FEEDBACK: {
    label: "General Feedback",
  },
  BUG: {
    label: "Bug Report",
  },
  FEATURE: {
    label: "Feature Request",
  },
  OTHER: {
    label: "Other",
  },
} as const;

export const FEEDBACK_TYPE_OPTIONS = FEEDBACK_TYPES.map((type) => ({
  value: type,
  label: FEEDBACK_TYPE_MAP[type].label,
}));
