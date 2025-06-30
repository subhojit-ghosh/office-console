import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.count();
    const tasks = await ctx.db.task.count();
    const users = await ctx.db.user.count();

    return {
      projects,
      tasks,
      users,
    };
  }),
});
