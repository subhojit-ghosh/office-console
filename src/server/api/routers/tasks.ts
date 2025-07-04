import type { Prisma } from "@prisma/client";
import {
  createTaskSchema,
  deleteTaskSchema,
  getAllTasksSchema,
  getTaskByIdSchema,
  updateTaskSchema,
} from "~/schemas/task.schema";
import { sanitizeInputSchema } from "~/utils/zod-helpers";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const tasksRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllTasksSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "title";
      const sortOrder = input.sortOrder ?? "asc";
      const statuses = input.statuses;
      const projectId = input.projectId;
      const moduleId = input.moduleId;
      const priority = input.priority;
      const assignedToMe = input.assignedToMe;

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

      const where: Prisma.TaskWhereInput = {
        ...(search
          ? {
              title: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(projectIds.length ? { projectId: { in: projectIds } } : {}),
        ...(moduleId ? { moduleId } : {}),
        ...(priority ? { priority } : {}),
        ...(assignedToMe
          ? {
              assignees: {
                some: { id: ctx.session.user.id },
              },
            }
          : {}),
      };

      const [tasks, total] = await Promise.all([
        ctx.db.task.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            updatedAt: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            module: {
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
            assignees: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.db.task.count({ where }),
      ]);

      return {
        tasks,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(getTaskByIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findUnique({
        where: { id: input.id },
        include: {
          project: true,
          module: true,
          createdBy: true,
          assignees: true,
        },
      });
    }),

  create: protectedProcedure
    .input(sanitizeInputSchema(createTaskSchema))
    .mutation(async ({ ctx, input }) => {
      const { assigneeIds, ...rest } = input;
      const userId = ctx.session.user.id;
      return ctx.db.task.create({
        data: {
          ...rest,
          createdById: userId,
          assignees: assigneeIds
            ? { connect: assigneeIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          project: true,
          module: true,
          createdBy: true,
          assignees: true,
        },
      });
    }),

  update: protectedProcedure
    .input(sanitizeInputSchema(updateTaskSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, assigneeIds, ...rest } = input;
      return ctx.db.task.update({
        where: { id },
        data: {
          ...rest,
          assignees: assigneeIds
            ? { set: assigneeIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          project: true,
          module: true,
          createdBy: true,
          assignees: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteTaskSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.delete({
        where: { id: input.id },
      });
    }),
});
