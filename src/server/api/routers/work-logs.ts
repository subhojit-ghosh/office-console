import {
  createWotkLogSchema,
  deleteWorkLogSchema,
  getWorkLogByTaskIdSchema,
} from "~/schemas/work-log.schema";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const workLogsRouter = createTRPCRouter({
  getByTaskId: protectedProcedure
    .input(getWorkLogByTaskIdSchema)
    .query(async ({ ctx }) => {
      return ctx.db.workLog.findMany({
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
