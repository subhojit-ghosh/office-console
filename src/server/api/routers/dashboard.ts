import { z } from "zod";
import { TASK_STATUS_FILTERS } from "~/constants/task.constant";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { UserRole } from "@prisma/generated/server";

export const dashboardRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const clientId = ctx.session.user.clientId;

    const projects = await ctx.db.project.count({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(ctx.session.user.role === "STAFF"
          ? {
              OR: [
                { createdById: ctx.session.user.id },
                {
                  members: {
                    some: { id: ctx.session.user.id },
                  },
                },
              ],
            }
          : {}),
      },
    });
    const tasks = await ctx.db.task.count({
      where: {
        status: {
          notIn: TASK_STATUS_FILTERS.COMPLETED,
        },
        ...(clientId ? { project: { clientId } } : {}),
        ...(ctx.session.user.role === "STAFF"
          ? {
              OR: [
                { createdById: ctx.session.user.id },
                {
                  assignees: {
                    some: { id: ctx.session.user.id },
                  },
                },
              ],
            }
          : {}),
      },
    });

    return {
      projects,
      tasks,
    };
  }),

  taskTypeBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const clientId = ctx.session.user.clientId;
    const userId = ctx.session.user.id;
    const isStaff = ctx.session.user.role === "STAFF";

    const data = await ctx.db.task.groupBy({
      by: ["type"],
      _count: { type: true },
      where: {
        status: {
          notIn: TASK_STATUS_FILTERS.COMPLETED,
        },
        ...(clientId ? { project: { clientId } } : {}),
        ...(isStaff
          ? {
              OR: [
                { createdById: userId },
                { assignees: { some: { id: userId } } },
              ],
            }
          : {}),
      },
    });

    return data.map((item) => ({
      type: item.type,
      count: item._count.type,
    }));
  }),

  // Analytics endpoints for staff/admin only
  personalMetrics: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only staff/admin can access analytics
      if (
        ctx.session.user.role === UserRole.CLIENT_ADMIN ||
        ctx.session.user.role === UserRole.CLIENT_USER
      ) {
        throw new Error("Access denied");
      }

      const targetUserId = input.userId;

      // Build date filter for tasks
      const taskDateFilter =
        input.startDate && input.endDate
          ? {
              completedAt: {
                gte: input.startDate,
                lte: input.endDate,
              },
            }
          : undefined;

      // Build date filter for work logs
      const workLogDateFilter =
        input.startDate && input.endDate
          ? {
              startTime: {
                gte: input.startDate,
                lte: input.endDate,
              },
            }
          : undefined;

      // Get all tasks assigned to the user
      const totalTasks = await ctx.db.task.count({
        where: {
          assignees: {
            some: { id: targetUserId },
          },
          ...(taskDateFilter ?? {}),
        },
      });

      // Get completed tasks
      const completedTasks = await ctx.db.task.count({
        where: {
          assignees: {
            some: { id: targetUserId },
          },
          status: "DONE",
          ...(taskDateFilter ?? {}),
        },
      });

      // Calculate completion rate
      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Get tasks completed on time (before due date)
      const onTimeTasks = await ctx.db.task.count({
        where: {
          assignees: {
            some: { id: targetUserId },
          },
          status: "DONE",
          completedAt: {
            not: null,
          },
          dueDate: {
            not: null,
          },
          ...(taskDateFilter ?? {}),
        },
      });

      // Get all completed tasks with due date for on-time calculation
      const completedTasksWithDueDate = await ctx.db.task.findMany({
        where: {
          assignees: {
            some: { id: targetUserId },
          },
          status: "DONE",
          completedAt: {
            not: null,
          },
          dueDate: {
            not: null,
          },
          ...(taskDateFilter ?? {}),
        },
        select: {
          completedAt: true,
          dueDate: true,
        },
      });

      const onTimeCount = completedTasksWithDueDate.filter(
        (task) =>
          task.completedAt && task.dueDate && task.completedAt <= task.dueDate,
      ).length;

      const onTimeDelivery =
        completedTasksWithDueDate.length > 0
          ? (onTimeCount / completedTasksWithDueDate.length) * 100
          : 0;

      // Get total hours logged
      const workLogs = await ctx.db.workLog.findMany({
        where: {
          userId: targetUserId,
          ...(workLogDateFilter ?? {}),
        },
        select: {
          durationMin: true,
        },
      });

      const totalHours = workLogs.reduce(
        (sum, log) => sum + log.durationMin / 60,
        0,
      );

      // Calculate pending tasks (Backlog, Todo, Blocked) - Current State (No Date Filter)
      const pendingTasks = await ctx.db.task.count({
        where: {
          assignees: { some: { id: targetUserId } },
          status: { in: TASK_STATUS_FILTERS.PENDING },
        },
      });

      // Calculate active tasks (In Progress, In Review) - Current State (No Date Filter)
      const activeTasks = await ctx.db.task.count({
        where: {
          assignees: { some: { id: targetUserId } },
          status: { in: TASK_STATUS_FILTERS.ACTIVE },
        },
      });

      // Calculate overdue tasks - Current State (No Date Filter)
      const overdueTasks = await ctx.db.task.count({
        where: {
          assignees: { some: { id: targetUserId } },
          status: { notIn: TASK_STATUS_FILTERS.COMPLETED },
          dueDate: { lt: new Date() },
        },
      });

      return {
        completionRate: Math.round(completionRate),
        onTimeDelivery: Math.round(onTimeDelivery),
        tasksCompleted: completedTasks,
        hoursLogged: Math.round(totalHours * 10) / 10,
        pendingTasks,
        activeTasks,
        overdueTasks,
      };
    }),

  activityHeatmap: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only staff/admin can access analytics
      if (
        ctx.session.user.role === UserRole.CLIENT_ADMIN ||
        ctx.session.user.role === UserRole.CLIENT_USER
      ) {
        throw new Error("Access denied");
      }

      const workLogs = await ctx.db.workLog.findMany({
        where: {
          userId: input.userId,
          startTime: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        select: {
          startTime: true,
          durationMin: true,
        },
      });

      // Group by date
      const activityByDate = new Map<string, number>();

      workLogs.forEach((log) => {
        const dateKey = log.startTime.toISOString().split("T")[0]!;
        const currentHours = activityByDate.get(dateKey) ?? 0;
        activityByDate.set(dateKey, currentHours + log.durationMin / 60);
      });

      // Convert to array format
      return Array.from(activityByDate.entries()).map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 10) / 10,
      }));
    }),

  taskBreakdown: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only staff/admin can access analytics
      if (
        ctx.session.user.role === UserRole.CLIENT_ADMIN ||
        ctx.session.user.role === UserRole.CLIENT_USER
      ) {
        throw new Error("Access denied");
      }

      const targetUserId = input.userId;

      // Build date filter
      const dateFilter =
        input.startDate && input.endDate
          ? {
              createdAt: {
                gte: input.startDate,
                lte: input.endDate,
              },
            }
          : undefined;

      // Get all tasks for the user
      const tasks = await ctx.db.task.findMany({
        where: {
          assignees: {
            some: { id: targetUserId },
          },
          ...(dateFilter ?? {}),
        },
        select: {
          status: true,
          priority: true,
          dueDate: true,
        },
      });

      // Status breakdown
      const statusBreakdown = tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Priority breakdown
      const priorityBreakdown = tasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Overdue tasks
      const now = new Date();
      const overdueTasks = tasks.filter(
        (task) => task.dueDate && task.dueDate < now && task.status !== "DONE",
      ).length;

      return {
        statusBreakdown: Object.entries(statusBreakdown).map(
          ([status, count]) => ({
            status,
            count,
          }),
        ),
        priorityBreakdown: Object.entries(priorityBreakdown).map(
          ([priority, count]) => ({
            priority,
            count,
          }),
        ),
        overdueTasks,
      };
    }),

  weeklyActivity: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only staff/admin can access analytics
      if (
        ctx.session.user.role === UserRole.CLIENT_ADMIN ||
        ctx.session.user.role === UserRole.CLIENT_USER
      ) {
        throw new Error("Access denied");
      }

      // Get last 7 weeks of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7 * 7); // 7 weeks

      const workLogs = await ctx.db.workLog.findMany({
        where: {
          userId: input.userId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          startTime: true,
          durationMin: true,
        },
      });

      // Group by week and day of week
      const weeklyData = new Map<string, Map<number, number>>();

      workLogs.forEach((log) => {
        const weekStart = new Date(log.startTime);
        weekStart.setDate(
          weekStart.getDate() -
            weekStart.getDay() +
            (weekStart.getDay() === 0 ? -6 : 1),
        ); // Monday
        const weekKey = weekStart.toISOString().split("T")[0]!;
        const dayOfWeek = log.startTime.getDay();

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, new Map());
        }

        const weekData = weeklyData.get(weekKey)!;
        const currentHours = weekData.get(dayOfWeek) ?? 0;
        weekData.set(dayOfWeek, currentHours + log.durationMin / 60);
      });

      // Convert to array format for the last 7 weeks
      const result = [];
      const weekKeys = Array.from(weeklyData.keys()).sort().slice(-7);

      for (const weekKey of weekKeys) {
        const weekData = weeklyData.get(weekKey)!;
        result.push({
          week: weekKey,
          Monday: Math.round((weekData.get(1) ?? 0) * 10) / 10,
          Tuesday: Math.round((weekData.get(2) ?? 0) * 10) / 10,
          Wednesday: Math.round((weekData.get(3) ?? 0) * 10) / 10,
          Thursday: Math.round((weekData.get(4) ?? 0) * 10) / 10,
          Friday: Math.round((weekData.get(5) ?? 0) * 10) / 10,
          Saturday: Math.round((weekData.get(6) ?? 0) * 10) / 10,
          Sunday: Math.round((weekData.get(0) ?? 0) * 10) / 10,
        });
      }

      return result;
    }),
});
