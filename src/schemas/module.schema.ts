import { z } from "zod";

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
});

export const updateModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
  description: z.string().optional().nullable(),
  projectId: z.string().nonempty("Project is required"),
});

export const deleteModuleSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
