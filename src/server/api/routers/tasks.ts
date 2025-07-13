import {
  TaskActivityType,
  TaskStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";
import {
  archiveTaskSchema,
  createTaskCommentSchema,
  createTaskLinkSchema,
  createTaskSchema,
  deleteTaskCommentSchema,
  deleteTaskLinkSchema,
  getAllTasksMinimalSchema,
  getAllTasksSchema,
  getTaskByIdSchema,
  getTaskCommentsByTaskIdSchema,
  getTaskLinksByTaskIdSchema,
  updateTaskCommentSchema,
  updateTaskFieldSchema,
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
      const type = input.type;
      const statuses = input.statuses;
      const projectId = input.projectId;
      const moduleId = input.moduleId;
      const priority = input.priority;
      const assignee = input.assignee;

      let projectIds: string[] = [];

      if (projectId) {
        projectIds.push(projectId);
      } else if (ctx.session.user.clientId) {
        const clientProjects = await ctx.db.project.findMany({
          where: { clientId: ctx.session.user.clientId },
          select: { id: true },
        });
        projectIds = clientProjects.map((p) => p.id);
      } else if (ctx.session.user.role === UserRole.STAFF) {
        const staffProjects = await ctx.db.project.findMany({
          where: { members: { some: { id: ctx.session.user.id } } },
          select: { id: true },
        });
        projectIds = staffProjects.map((p) => p.id);
      }

      const where: Prisma.TaskWhereInput = {
        archivedAt: null,
        ...(search
          ? {
              title: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(type ? { type } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(projectIds.length ? { projectId: { in: projectIds } } : {}),
        ...(moduleId ? { moduleId } : {}),
        ...(priority ? { priority } : {}),
        ...(assignee
          ? {
              assignees: {
                some: { id: assignee },
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
            type: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
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

  getAllMinimal: protectedProcedure
    .input(getAllTasksMinimalSchema)
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "title";
      const sortOrder = input.sortOrder ?? "asc";
      const type = input.type;
      const statuses = input.statuses;
      const projectId = input.projectId;
      const moduleId = input.moduleId;
      const priority = input.priority;
      const assignee = input.assignee;

      let projectIds: string[] = [];

      if (projectId) {
        projectIds.push(projectId);
      } else if (ctx.session.user.clientId) {
        const clientProjects = await ctx.db.project.findMany({
          where: { clientId: ctx.session.user.clientId },
          select: { id: true },
        });
        projectIds = clientProjects.map((p) => p.id);
      } else if (ctx.session.user.role === UserRole.STAFF) {
        const staffProjects = await ctx.db.project.findMany({
          where: { members: { some: { id: ctx.session.user.id } } },
          select: { id: true },
        });
        projectIds = staffProjects.map((p) => p.id);
      }

      const where: Prisma.TaskWhereInput = {
        archivedAt: null,
        ...(search
          ? {
              title: { contains: search, mode: "insensitive" },
            }
          : {}),
        ...(type ? { type } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(projectIds.length ? { projectId: { in: projectIds } } : {}),
        ...(moduleId ? { moduleId } : {}),
        ...(priority ? { priority } : {}),
        ...(assignee
          ? {
              assignees: {
                some: { id: assignee },
              },
            }
          : {}),
      };

      return ctx.db.task.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
        },
      });
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
          activities: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              field: true,
              oldValue: true,
              newValue: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(sanitizeInputSchema(createTaskSchema))
    .mutation(async ({ ctx, input }) => {
      const { assigneeIds, links, ...rest } = input;

      const projectMembers = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { members: { select: { id: true } } },
      });

      if (
        assigneeIds?.some(
          (assigneeId) =>
            !projectMembers?.members.some((member) => member.id === assigneeId),
        )
      ) {
        throw new Error(
          "One or more assignees are not members of the project.",
        );
      }

      const userId = ctx.session.user.id;
      const task = await ctx.db.task.create({
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

      await ctx.db.taskActivity.create({
        data: {
          taskId: task.id,
          type: TaskActivityType.CREATED,
          userId,
        },
      });

      if (links?.length) {
        await ctx.db.taskLink.createMany({
          data: links.map((link) => ({
            ...link,
            sourceId: link.sourceId ?? task.id,
            targetId: link.targetId ?? task.id,
          })),
        });
      }
    }),

  update: protectedProcedure
    .input(sanitizeInputSchema(updateTaskSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, assigneeIds, ...rest } = input;
      const userId = ctx.session.user.id;

      const existingTask = await ctx.db.task.findUnique({
        where: { id },
        include: {
          assignees: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!existingTask) {
        throw new Error("Task not found");
      }

      const activityLogs: Prisma.TaskActivityCreateManyInput[] = [];

      const fieldChangeKeys: (keyof typeof rest)[] = [
        "type",
        "status",
        "priority",
        "dueDate",
      ];
      const softUpdateKeys: (keyof typeof rest)[] = ["title", "description"];

      for (const key of fieldChangeKeys) {
        const newValue = rest[key];
        const oldValue = existingTask[key];

        if (newValue !== undefined && newValue !== oldValue) {
          activityLogs.push({
            taskId: id,
            userId,
            type: TaskActivityType.FIELD_CHANGE,
            field: key,
            oldValue: oldValue?.toString() ?? null,
            newValue: newValue?.toString() ?? null,
          });
        }
      }

      for (const key of softUpdateKeys) {
        const newValue = rest[key];
        const oldValue = existingTask[key];

        if (newValue !== undefined && newValue !== oldValue) {
          activityLogs.push({
            taskId: id,
            userId,
            type: TaskActivityType.UPDATED,
            field: key,
          });
        }
      }

      if (assigneeIds) {
        const prevIds = existingTask.assignees.map((u) => u.id);
        const added = assigneeIds.filter((id) => !prevIds.includes(id));
        const removed = prevIds.filter((id) => !assigneeIds.includes(id));

        const [addedUsers, removedUsers] = await Promise.all([
          ctx.db.user.findMany({
            where: { id: { in: added } },
            select: { id: true, name: true },
          }),
          ctx.db.user.findMany({
            where: { id: { in: removed } },
            select: { id: true, name: true },
          }),
        ]);

        addedUsers.forEach((user) => {
          activityLogs.push({
            taskId: id,
            userId,
            type: TaskActivityType.ASSIGNED,
            field: "assignees",
            newValue: user.name,
          });
        });

        removedUsers.forEach((user) => {
          activityLogs.push({
            taskId: id,
            userId,
            type: TaskActivityType.UNASSIGNED,
            field: "assignees",
            oldValue: user.name,
          });
        });
      }

      const updatedTask = await ctx.db.task.update({
        where: { id },
        data: {
          ...rest,
          assignees: assigneeIds
            ? { set: assigneeIds.map((id) => ({ id })) }
            : undefined,
          completedAt: rest.status === TaskStatus.DONE ? new Date() : null,
        },
        include: {
          project: true,
          module: true,
          createdBy: true,
          assignees: true,
        },
      });

      if (activityLogs.length > 0) {
        await ctx.db.taskActivity.createMany({ data: activityLogs });
      }

      return updatedTask;
    }),

  updateField: protectedProcedure
    .input(updateTaskFieldSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, key, value } = input;
      const userId = ctx.session.user.id;

      const task = await ctx.db.task.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          priority: true,
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const data: Prisma.TaskUpdateInput = {};
      let oldValue: string | null = null;

      if (key === "status") {
        oldValue = task.status;
        data.status = value;
        data.completedAt = value === TaskStatus.DONE ? new Date() : null;
      } else if (key === "priority") {
        oldValue = task.priority;
        data.priority = value;
      }

      const updatedTask = ctx.db.task.update({
        where: { id },
        data,
      });

      await ctx.db.taskActivity.create({
        data: {
          taskId: task.id,
          type: TaskActivityType.FIELD_CHANGE,
          field: key,
          oldValue,
          newValue: value,
          userId,
        },
      });

      return updatedTask;
    }),

  archive: protectedProcedure
    .input(archiveTaskSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.id },
        data: {
          archivedAt: new Date(),
          archivedById: ctx.session.user.id,
        },
      });
    }),

  getComments: protectedProcedure
    .input(getTaskCommentsByTaskIdSchema)
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        select: { id: true },
      });

      if (!task) {
        throw new Error("Task not found");
      }
      return ctx.db.taskComment.findMany({
        where: { taskId: input.taskId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          edited: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  createComment: protectedProcedure
    .input(createTaskCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { taskId, type, content } = input;
      const userId = ctx.session.user.id;

      const task = await ctx.db.task.findUnique({
        where: { id: taskId },
        select: { id: true },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const comment = await ctx.db.taskComment.create({
        data: {
          taskId,
          type,
          content,
          userId,
        },
      });

      return comment;
    }),

  updateComment: protectedProcedure
    .input(updateTaskCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, content } = input;
      const userId = ctx.session.user.id;

      const comment = await ctx.db.taskComment.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.userId !== userId) {
        throw new Error("You are not authorized to update this comment");
      }

      return ctx.db.taskComment.update({
        where: { id },
        data: {
          content,
          edited: true,
        },
      });
    }),

  deleteComment: protectedProcedure
    .input(deleteTaskCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const comment = await ctx.db.taskComment.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.userId !== userId) {
        throw new Error("You are not authorized to update this comment");
      }

      return ctx.db.taskComment.delete({
        where: { id },
      });
    }),

  getLinks: protectedProcedure
    .input(getTaskLinksByTaskIdSchema)
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        select: { id: true },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const links = await ctx.db.taskLink.findMany({
        where: {
          OR: [{ sourceId: input.taskId }, { targetId: input.taskId }],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          sourceId: true,
          targetId: true,
          source: {
            select: {
              id: true,
              type: true,
              title: true,
              status: true,
            },
          },
          target: {
            select: {
              id: true,
              type: true,
              title: true,
              status: true,
            },
          },
          createdAt: true,
        },
      });

      const outgoingLinks = links
        .filter((link) => link.sourceId === input.taskId)
        .map((link) => ({
          id: link.id,
          type: link.type,
          target: link.target,
          createdAt: link.createdAt,
        }));

      const incomingLinks = links
        .filter((link) => link.targetId === input.taskId)
        .map((link) => ({
          id: link.id,
          type: link.type,
          source: link.source,
          createdAt: link.createdAt,
        }));

      return { outgoingLinks, incomingLinks };
    }),

  createLink: protectedProcedure
    .input(createTaskLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const isAlreadyLinked = await ctx.db.taskLink.findFirst({
        where: {
          OR: [
            { sourceId: input.sourceId, targetId: input.targetId },
            { sourceId: input.targetId, targetId: input.sourceId },
          ],
        },
      });

      if (isAlreadyLinked) {
        throw new Error("Tasks are already linked");
      }

      return ctx.db.taskLink.create({
        data: {
          type: input.type,
          sourceId: input.sourceId,
          targetId: input.targetId,
        },
      });
    }),

  deleteLink: protectedProcedure
    .input(deleteTaskLinkSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taskLink.delete({
        where: { id: input.id },
      });
    }),
});
