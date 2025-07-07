import { z } from "zod";
import { zOptionalInput } from "~/utils/zod-helpers";

export const getAllProjectsSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("name").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional().nullable(),
  status: z
    .enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"])
    .optional()
    .nullable(),
  clientId: z.string().optional().nullable(),
});

export const getProjectByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createProjectSchema = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional().nullable().nullable(),
  status: z.enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"]),
  memberIds: z.array(z.string()).optional(),
  clientId: z.string().optional().nullable(),
  timeDisplayMultiplier: zOptionalInput(
    z
      .number()
      .min(0.1, "Too small (0.1 is the min)")
      .max(10, "Too large (10 is the max)")
      .optional()
      .nullable(),
  ),
});

export const updateProjectSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
  description: z.string().optional().nullable(),
  status: z.enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"]),
  memberIds: z.array(z.string()).optional(),
  clientId: z.string().optional().nullable(),
  timeDisplayMultiplier: zOptionalInput(
    z
      .number()
      .min(0.1, "Too small (0.1 is the min)")
      .max(10, "Too large (10 is the max)")
      .optional()
      .nullable(),
  ),
});

export const deleteProjectSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
