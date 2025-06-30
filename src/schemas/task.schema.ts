import { z } from "zod";

export const getAllTasksSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("title").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"]).optional(),
  projectId: z.string().optional(),
  moduleId: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().nonempty("Title is required"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string(),
  moduleId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
  title: z.string().nonempty("Title is required"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string(),
  moduleId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
});

export const deleteTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
