import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUserSchema, updateUserSchema } from "~/schemas/user";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const userRoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CLIENT"]);

export const usersRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1).optional(),
        pageSize: z.number().int().min(1).max(100).default(10).optional(),
        search: z.string().optional(),
        sortBy: z.string().default("name").optional(),
        sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
        role: userRoleEnum.optional(),
        isActive: z.boolean().optional(),
        clientId: z.string().optional(),
      }),
    )
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
          include: {
            staffProfile: true,
            projects: true,
            createdTasks: true,
            assignedTasks: true,
            client: true,
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
    .input(z.object({ id: z.string().nonempty("ID is required") }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
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
        isActive: input.isActive,
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
    .input(z.object({ id: z.string().nonempty("ID is required") }))
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
