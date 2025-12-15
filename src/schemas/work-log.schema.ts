import { z } from "zod";
import { parseDate } from "~/utils/date";
import { TASK_TYPES } from "~/constants/task.constant";
import dayjs from "dayjs";

export const getWorkLogsSchema = z.object({
  taskId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

// Helper function to parse time string (hh:mm or hh:mm:ss format)
function parseTimeString(
  timeStr: string,
): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  // Handle 12h format with AM/PM
  const amPmMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(timeStr);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1]!, 10);
    const minutes = parseInt(amPmMatch[2]!, 10);
    const isPm = amPmMatch[4]?.toUpperCase() === "PM";

    if (hours === 12) {
      hours = isPm ? 12 : 0;
    } else {
      hours = isPm ? hours + 12 : hours;
    }

    return { hours, minutes };
  }

  // Handle 24h format (hh:mm or hh:mm:ss)
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]!, 10);
    const minutes = parseInt(timeMatch[2]!, 10);
    return { hours, minutes };
  }

  return null;
}

// Helper function to combine date and time string into a Date object
function combineDateAndTime(
  date: Date | string | null | undefined,
  timeStr: string | null | undefined,
): Date | null {
  if (!date || !timeStr) return null;

  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsedDate.getTime())) return null;

  const timeParts = parseTimeString(timeStr);
  if (!timeParts) return null;

  return dayjs(parsedDate)
    .hour(timeParts.hours)
    .minute(timeParts.minutes)
    .second(0)
    .millisecond(0)
    .toDate();
}

export const createWotkLogSchema = z
  .object({
    taskId: z.string().nonempty("Task ID is required"),
    date: z.preprocess(parseDate, z.date()),
    startTime: z.string().nonempty("Start time is required"),
    endTime: z.string().nonempty("End time is required"),
    note: z.string().optional().nullable(),
  })
  .refine((data) => data.date !== undefined && data.date !== null, {
    message: "Date is required",
    path: ["date"],
  })
  .refine(
    (data) => {
      const parsedStart = parseTimeString(data.startTime);
      const parsedEnd = parseTimeString(data.endTime);
      return parsedStart !== null && parsedEnd !== null;
    },
    {
      message: "Invalid time format. Use hh:mm or hh:mm AM/PM format.",
      path: ["startTime"],
    },
  )
  .transform((data) => {
    const startDateTime = combineDateAndTime(data.date, data.startTime);
    const endDateTime = combineDateAndTime(data.date, data.endTime);

    if (!startDateTime || !endDateTime) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Failed to combine date and time",
          path: ["startTime"],
        },
      ]);
    }

    // Validate that both times are on the same date
    const startDate = dayjs(startDateTime).format("YYYY-MM-DD");
    const endDate = dayjs(endDateTime).format("YYYY-MM-DD");

    if (startDate !== endDate) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Start time and end time must be on the same date",
          path: ["endTime"],
        },
      ]);
    }

    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "End time must be after start time",
          path: ["endTime"],
        },
      ]);
    }

    return {
      taskId: data.taskId,
      startTime: startDateTime,
      endTime: endDateTime,
      note: data.note ?? null,
    };
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
