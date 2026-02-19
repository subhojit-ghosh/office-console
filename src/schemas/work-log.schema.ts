import { z } from "zod";
import { parseDate } from "~/utils/date";
import { TASK_TYPES } from "~/constants/task.constant";

export const getWorkLogsSchema = z.object({
  taskId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

// Schema for form validation on the client (date + time strings)
export const createWorkLogFormSchema = z.object({
  taskId: z.string().nonempty("Task ID is required"),
  date: z.preprocess(parseDate, z.date({ message: "Date is required" })),
  startTime: z.string().nonempty("Start time is required"),
  endTime: z.string().nonempty("End time is required"),
  note: z.string().optional().nullable(),
});

// Schema for tRPC mutation input (pre-built Date objects from the client)
// Dates are constructed on the client where the user's timezone is available
export const createWotkLogSchema = z
  .object({
    taskId: z.string().nonempty("Task ID is required"),
    startTime: z.date(),
    endTime: z.date(),
    note: z.string().optional().nullable(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const deleteWorkLogSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

// New schemas for work logs router
export const getProjectsSchema = z.object({
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  clientId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getModulesSchema = z.object({
  projectId: z.string(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  clientId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getTasksSchema = z.object({
  moduleId: z.string(),
  projectId: z.string(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  clientId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getWorkLogsForTaskSchema = z.object({
  taskId: z.string(),
});

export const getExportDataSchema = z.object({
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getFlatWorkLogsSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  sortBy: z.string().default("startTime").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  moduleId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getFlatWorkLogsForExportSchema = z.object({
  sortBy: z.string().default("startTime").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  moduleId: z.string().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
});

export const getRecentTasksSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10).optional(),
  includeTaskId: z.string().optional(),
});
