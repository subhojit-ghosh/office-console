import { z } from "zod";
import { zOptionalInput } from "~/utils/zod-helpers";

export const getAllModulesSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("name").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const getModuleByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createModuleSchema = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional().nullable(),
  projectId: z.string().nonempty("Project is required"),
  timeDisplayMultiplier: zOptionalInput(
    z
      .number()
      .min(0.1, "Too small (0.1 is the min)")
      .max(10, "Too large (10 is the max)")
      .optional()
      .nullable(),
  ),
});

export const updateModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
  description: z.string().optional().nullable(),
  projectId: z.string().nonempty("Project is required"),
  timeDisplayMultiplier: zOptionalInput(
    z
      .number()
      .min(0.1, "Too small (0.1 is the min)")
      .max(10, "Too large (10 is the max)")
      .optional()
      .nullable(),
  ),
});

export const deleteModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
