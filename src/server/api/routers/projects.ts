import type { Prisma } from "@prisma/client";
import {
  createProjectSchema,
  deleteProjectSchema,
  getAllProjectsSchema,
  getProjectByIdSchema,
  updateProjectSchema,
} from "~/schemas/project.schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sanitizeInputSchema } from "~/utils/zod-helpers";

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllProjectsSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "name";
      const sortOrder = input.sortOrder ?? "asc";
      const status = input.status;
      const clientId = ctx.session.user.clientId ?? input.clientId;

      const where: Prisma.ProjectWhereInput = {
        ...(search
          ? {
              name: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      };

      const [projects, total] = await Promise.all([
        ctx.db.project.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            client: {
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
              select: { modules: true, tasks: true },
            },
          },
        }),
        ctx.db.project.count({ where }),
      ]);

      return {
        projects: projects.map((p) => ({
          ...p,
          modulesCount: p._count.modules,
          tasksCount: p._count.tasks,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(getProjectByIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          createdBy: true,
        },
      });
    }),

  create: protectedProcedure
    .input(sanitizeInputSchema(createProjectSchema))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          clientId: input.clientId,
          timeDisplayMultiplier: input.timeDisplayMultiplier,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(sanitizeInputSchema(updateProjectSchema))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          clientId: input.clientId,
          timeDisplayMultiplier: input.timeDisplayMultiplier,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.delete({
        where: { id: input.id },
      });
    }),
});
