import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "~/constants/task.constant";

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
  statuses: z.array(z.enum(TASK_STATUSES)).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  projectId: z.string().optional(),
  moduleId: z.string().optional(),
  assignee: z.string().optional().nullable(),
});

export const getTaskByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createTaskSchema = z.object({
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  projectId: z.string(),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.preprocess(parseDate, z.date().optional().nullable()),
});

export const updateTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  projectId: z.string(),
  moduleId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.preprocess(parseDate, z.date().optional().nullable()),
});

export const updateTaskFieldSchema = z.discriminatedUnion("key", [
  z.object({
    id: z.string().nonempty("ID is required"),
    key: z.literal("status"),
    value: z.enum(TASK_STATUSES),
  }),
  z.object({
    id: z.string().nonempty("ID is required"),
    key: z.literal("priority"),
    value: z.enum(TASK_PRIORITIES),
  }),
]);

export const deleteTaskSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
