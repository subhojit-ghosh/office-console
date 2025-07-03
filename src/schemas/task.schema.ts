import { z } from "zod";

function parseDate(val: unknown) {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string" && val.length >= 10) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

export const getAllTasksSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("title").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  status: z
    .enum([
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "BLOCKED",
      "DONE",
      "CANCELED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string().optional(),
  moduleId: z.string().optional(),
  assignedToMe: z.boolean().default(false).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z
    .enum([
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "BLOCKED",
      "DONE",
      "CANCELED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string(),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.preprocess(parseDate, z.date().optional().nullable()),
});

export const updateTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z
    .enum([
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "BLOCKED",
      "DONE",
      "CANCELED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string(),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.preprocess(parseDate, z.date().optional().nullable()),
});

export const deleteTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
