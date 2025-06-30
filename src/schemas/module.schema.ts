import { z } from "zod";

export const getAllModulesSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("name").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  projectId: z.string().optional(),
});

export const getModuleByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createModuleSchema = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  projectId: z.string().nonempty("Project is required"),
});

export const updateModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  projectId: z.string().nonempty("Project is required"),
});

export const deleteModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
