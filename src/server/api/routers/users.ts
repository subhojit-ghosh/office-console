import type { Prisma } from "@prisma/client";
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
      const clientId = input.clientId;

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
        ...(clientId ? { clientId } : {}),
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
          role: input.role,
          clientId: input.clientId,
          password: hashedPassword,
          isActive: input.isActive ?? true,
        },
      });
    }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
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
