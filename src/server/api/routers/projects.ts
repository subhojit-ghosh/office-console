import type { Prisma } from "@prisma/client";
import {
  createProjectSchema,
  updateProjectSchema,
  getAllProjectsSchema,
  getProjectByIdSchema,
  deleteProjectSchema,
} from "~/schemas/project.schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
      const clientId = input.clientId;

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
            client: true,
            createdBy: true,
          },
        }),
        ctx.db.project.count({ where }),
      ]);

      return {
        projects,
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
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
          status: input.status ?? "ONGOING",
          clientId: input.clientId,
          createdById: ctx.session.user.id, // set from session
        },
      });
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          clientId: input.clientId,
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
