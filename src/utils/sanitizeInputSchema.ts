import { z } from "zod";

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v)]),
    );
  }

  return value;
}

export const sanitizeInputSchema = <T extends z.ZodTypeAny>(
  schema: T,
): z.ZodEffects<T, T["_output"], unknown> => {
  return z.preprocess(sanitize, schema);
};
