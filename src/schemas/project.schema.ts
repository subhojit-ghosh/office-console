import { z } from "zod";

export const getAllProjectsSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("name").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  status: z.enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"]).optional(),
  clientId: z.string().optional(),
});

export const getProjectByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createProjectSchema = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  status: z.enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"]).optional(),
  clientId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  status: z.enum(["ONGOING", "COMPLETED", "CANCELLED", "ON_HOLD"]).optional(),
  clientId: z.string().optional(),
});

export const deleteProjectSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
