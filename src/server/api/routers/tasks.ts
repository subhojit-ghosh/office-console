import type { Prisma } from "@prisma/client";
import {
  createTaskSchema,
  updateTaskSchema,
  getAllTasksSchema,
  deleteTaskSchema,
} from "~/schemas/task.schema";
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
      const status = input.status;
      const projectId = input.projectId;
      const moduleId = input.moduleId;

      const where: Prisma.TaskWhereInput = {
        ...(search
          ? {
              title: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(moduleId ? { moduleId } : {}),
      };

      const [tasks, total] = await Promise.all([
        ctx.db.task.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            project: true,
            module: true,
            createdBy: true,
            assignees: true,
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

  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.task.create({
        data: {
          ...input,
          createdById: userId,
          assignees: input.assigneeIds
            ? { connect: input.assigneeIds.map((id) => ({ id })) }
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
    .input(updateTaskSchema)
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
