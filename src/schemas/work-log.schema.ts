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
