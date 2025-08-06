import { z } from "zod";
import { parseDate } from "~/utils/date";

export const getWorkLogsSchema = z.object({
  taskId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export const createWotkLogSchema = z.object({
  taskId: z.string().nonempty("Task ID is required"),
  startTime: z.preprocess(parseDate, z.date()),
  endTime: z.preprocess(parseDate, z.date()),
  note: z.string().optional().nullable(),
});

export const deleteWorkLogSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

// New schemas for work logs router
export const getProjectsSchema = z.object({
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
});

export const getModulesSchema = z.object({
  projectId: z.string(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
});

export const getTasksSchema = z.object({
  moduleId: z.string(),
  projectId: z.string(),
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
});

export const getWorkLogsForTaskSchema = z.object({
  taskId: z.string(),
});

export const getExportDataSchema = z.object({
  dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
  projectId: z.string().optional(),
});
