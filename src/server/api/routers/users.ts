import { UserRole, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createUserSchema,
  deleteUserSchema,
  getAllUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
} from "~/schemas/user.schema";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const usersRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllUsersSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "name";
      const sortOrder = input.sortOrder ?? "asc";
      const role = input.role;
      const isActive = input.isActive;
      // CLIENT_ADMIN can only see users from their own client
      const isClientAdmin = ctx.session.user.role === UserRole.CLIENT_ADMIN;
      const effectiveClientId = isClientAdmin
        ? ctx.session.user.clientId
        : input.clientId;

      const where: Prisma.UserWhereInput = {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
        ...(isClientAdmin
          ? {
              // additionally restrict to only client roles for client admins
              role: { in: [UserRole.CLIENT_USER, UserRole.CLIENT_ADMIN] },
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getAllMinimal: protectedProcedure.query(async ({ ctx }) => {
    let userIds: string[] = [];
    if (ctx.session.user.role === UserRole.STAFF) {
      const projects = await ctx.db.project.findMany({
        where: {
          members: {
            some: { id: ctx.session.user.id },
          },
        },
        select: {
          id: true,
          members: {
            select: {
              id: true,
            },
          },
        },
      });

      userIds = projects.flatMap((project) =>
        project.members.map((member) => member.id),
      );
    }

    const where: Prisma.UserWhereInput = {
      ...(userIds.length
        ? {
            id: { in: userIds },
          }
        : {}),
    };

    return ctx.db.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }),

  getById: protectedProcedure
    .input(getUserByIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          clientId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          staffProfile: true,
          projects: true,
          createdTasks: true,
          assignedTasks: true,
          client: true,
        },
      });
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      // CLIENT_ADMIN can only create CLIENT_USER for their own client
      if (ctx.session.user.role === UserRole.CLIENT_ADMIN) {
        if (input.role !== UserRole.CLIENT_USER) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client Admins can only create Client Users",
          });
        }
        if (!ctx.session.user.clientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client Admin does not have an associated client",
          });
        }
      }
      const existingUser = await ctx.db.user.findFirst({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Validation error",
          cause: {
            fieldErrors: {
              email: ["A user with this email already exists"],
            },
          },
        });
      }
      const hashedPassword = await bcrypt.hash(input.password, 10);
      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          role:
            ctx.session.user.role === UserRole.CLIENT_ADMIN
              ? UserRole.CLIENT_USER
              : input.role,
          clientId:
            ctx.session.user.role === UserRole.CLIENT_ADMIN
              ? ctx.session.user.clientId
              : input.clientId,
          password: hashedPassword,
          isActive: input.isActive ?? true,
        },
      });
    }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      // If client admin, restrict updates to users of their own client
      if (ctx.session.user.role === UserRole.CLIENT_ADMIN) {
        const target = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: { clientId: true },
        });
        if (!target || target.clientId !== ctx.session.user.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        // Prevent role escalation beyond client roles
        if (
          input.role !== UserRole.CLIENT_USER &&
          input.role !== UserRole.CLIENT_ADMIN
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client Admins can only set client roles",
          });
        }
        // Force clientId to their own
        input.clientId = ctx.session.user.clientId;
      }
      const existingUser = await ctx.db.user.findFirst({
        where: {
          email: input.email,
          NOT: { id: input.id },
        },
      });
      if (existingUser) {
        throw new Error("User with this email already exists.");
      }
      const data: Prisma.UserUpdateInput = {
        name: input.name,
        email: input.email,
        role: input.role,
        ...(input.clientId !== undefined
          ? {
              client: input.clientId
                ? { connect: { id: input.clientId } }
                : { disconnect: true },
            }
          : {}),
        isActive: input.isActive ?? undefined,
      };
      if (input.password) {
        data.password = await bcrypt.hash(input.password, 10);
      }
      return ctx.db.user.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(deleteUserSchema)
    .mutation(async ({ ctx, input }) => {
      const assignedTasksCount = await ctx.db.task.count({
        where: {
          assignees: {
            some: { id: input.id },
          },
        },
      });
      if (assignedTasksCount > 0) {
        throw new Error(
          "Cannot delete user: user is assigned to one or more tasks.",
        );
      }
      return ctx.db.user.delete({
        where: { id: input.id },
      });
    }),
});
