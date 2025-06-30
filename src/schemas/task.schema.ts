import { z } from "zod";

export const getAllTasksSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("title").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional().nullable(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"])
    .optional()
    .nullable(),
  projectId: z.string().optional().nullable(),
  moduleId: z.string().optional().nullable(),
});

export const createTaskSchema = z.object({
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.string().nonempty("Project is required"),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

export const updateTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "REVIEW"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.string().nonempty("Project is required"),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

export const deleteTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
