import type { Prisma } from "@prisma/client";
import { TASK_STATUS_FILTERS } from "~/constants/task.constant";
import {
  createModuleSchema,
  deleteModuleSchema,
  getAllModulesSchema,
  getModuleByIdSchema,
  updateModuleSchema,
} from "~/schemas/module.schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const modulesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllModulesSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "name";
      const sortOrder = input.sortOrder ?? "asc";
      const projectId = input.projectId;

      let projectIds: string[] = [];

      if (projectId) {
        projectIds.push(projectId);
      } else if (ctx.session.user.clientId) {
        const clientProjects = await ctx.db.project.findMany({
          where: { clientId: ctx.session.user.clientId },
          select: { id: true },
        });
        projectIds = clientProjects.map((p) => p.id);
      }

      const where: Prisma.ModuleWhereInput = {
        ...(search
          ? {
              name: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(projectIds.length ? { projectId: { in: projectIds } } : {}),
      };

      const [modules, total] = await Promise.all([
        ctx.db.module.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: { tasks: true },
            },
          },
        }),
        ctx.db.module.count({ where }),
      ]);

      const completedCounts = await ctx.db.task.groupBy({
        by: ["moduleId"],
        where: {
          status: { in: TASK_STATUS_FILTERS.COMPLETED },
          moduleId: { in: modules.map((m) => m.id) },
        },
        _count: { moduleId: true },
      });

      const completedCountMap = new Map(
        completedCounts.map((item) => [item.moduleId, item._count.moduleId]),
      );

      return {
        modules: modules.map((m) => ({
          ...m,
          tasksCount: m._count.tasks,
          completedTasksCount: completedCountMap.get(m.id) ?? 0,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(getModuleByIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.module.findUnique({
        where: { id: input.id },
        include: {
          project: true,
          createdBy: true,
        },
      });
    }),

  create: protectedProcedure
    .input(createModuleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.module.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          timeDisplayMultiplier: input.timeDisplayMultiplier,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(updateModuleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.module.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          timeDisplayMultiplier: input.timeDisplayMultiplier,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteModuleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.module.delete({
        where: { id: input.id },
      });
    }),
});
