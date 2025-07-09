import { z } from "zod";
import {
  TASK_COMMENT_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "~/constants/task.constant";

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
  type: z.enum(TASK_TYPES).optional(),
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
  type: z.enum(TASK_TYPES).optional(),
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
  type: z.enum(TASK_TYPES).optional(),
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

export const getTaskCommentsByTaskIdSchema = z.object({
  taskId: z.string().nonempty("Task ID is required"),
});

export const createTaskCommentSchema = z.object({
  taskId: z.string().nonempty("Task ID is required"),
  type: z.enum(TASK_COMMENT_TYPES).optional(),
  content: z.string().nonempty("Title is required"),
});

export const updateTaskCommentSchema = z.object({
  id: z.string().nonempty("ID is required"),
  content: z.string().nonempty("Content is required"),
});

export const deleteTaskCommentSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
