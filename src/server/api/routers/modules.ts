import type { Prisma } from "@prisma/client";
import {
  createModuleSchema,
  updateModuleSchema,
  getAllModulesSchema,
  getModuleByIdSchema,
  deleteModuleSchema,
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
            project: true,
            createdBy: true,
            _count: {
              select: { tasks: true },
            },
          },
        }),
        ctx.db.module.count({ where }),
      ]);

      return {
        modules: modules.map((m) => ({
          ...m,
          tasksCount: m._count.tasks,
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
