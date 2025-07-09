import { TASK_STATUS_FILTERS } from "~/constants/task.constant";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
});
