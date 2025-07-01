import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const clientId = ctx.session.user.clientId;

    const projects = await ctx.db.project.count({
      where: {
        ...(clientId ? { clientId } : {}),
      },
    });
    const tasks = await ctx.db.task.count({
      where: {
        ...(clientId ? { project: { clientId } } : {}),
      },
    });

    return {
      projects,
      tasks,
    };
  }),
});
