import type { Prisma } from "@prisma/client";
import {
  createWotkLogSchema,
  deleteWorkLogSchema,
  getWorkLogsSchema,
} from "~/schemas/work-log.schema";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const workLogsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getWorkLogsSchema)
    .query(async ({ ctx, input }) => {
      const where: Prisma.WorkLogWhereInput = {
        ...(input.taskId ? { taskId: input.taskId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };

      return ctx.db.workLog.findMany({
        where,
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          note: true,
          startTime: true,
          endTime: true,
          durationMin: true,
          clientAdjustedDurationMin: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(createWotkLogSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        select: {
          id: true,
          module: {
            select: {
              timeDisplayMultiplier: true,
              project: {
                select: {
                  timeDisplayMultiplier: true,
                  client: {
                    select: {
                      timeDisplayMultiplier: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found.");
      }

      const overlappingWorkLog = await ctx.db.workLog.findFirst({
        where: {
          userId: ctx.session.user.id,
          AND: [
            { startTime: { lt: input.endTime } },
            { endTime: { gt: input.startTime } },
          ],
        },
        select: {
          startTime: true,
          endTime: true,
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (overlappingWorkLog) {
        const rawTitle = overlappingWorkLog.task?.title ?? "Unnamed Task";
        const shortTitle =
          rawTitle.length > 80 ? rawTitle.slice(0, 77) + "..." : rawTitle;

        throw new Error(`Overlapping work log exists in "${shortTitle}"`);
      }

      const durationMin =
        (input.endTime.getTime() - input.startTime.getTime()) / 60000;

      if (durationMin <= 0) {
        throw new Error("End time must be after start time.");
      }

      const timeDisplayMultiplier = parseFloat(
        String(
          task.module?.timeDisplayMultiplier ??
            task.module?.project?.timeDisplayMultiplier ??
            task.module?.project?.client?.timeDisplayMultiplier ??
            1,
        ),
      );

      const clientAdjustedDurationMin = durationMin * timeDisplayMultiplier;

      return ctx.db.workLog.create({
        data: {
          taskId: input.taskId,
          userId: ctx.session.user.id,
          startTime: input.startTime,
          endTime: input.endTime,
          durationMin,
          clientAdjustedDurationMin,
          note: input.note ?? null,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteWorkLogSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const workLog = await ctx.db.workLog.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!workLog) {
        throw new Error("Work log not found");
      }

      if (workLog.userId !== userId) {
        throw new Error("You are not authorized to update this work log.");
      }
      return ctx.db.workLog.delete({
        where: { id: input.id },
      });
    }),
});
