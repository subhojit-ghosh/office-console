import type { Prisma } from "@prisma/client";
import {
  createClientSchema,
  updateClientSchema,
  getAllClientsSchema,
  getClientByIdSchema,
  deleteClientSchema,
} from "~/schemas/client.schema";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const clientsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllClientsSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "name";
      const sortOrder = input.sortOrder ?? "asc";

      const where: Prisma.ClientWhereInput = search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {};

      const [clients, total] = await Promise.all([
        ctx.db.client.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.client.count({ where }),
      ]);

      return {
        clients,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(getClientByIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.client.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const existingClient = await ctx.db.client.findFirst({
        where: { name: input.name },
      });

      if (existingClient) {
        throw new Error("Client with this name already exists.");
      }

      return ctx.db.client.create({
        data: {
          name: input.name,
        },
      });
    }),

  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(async ({ ctx, input }) => {
      const existingClient = await ctx.db.client.findFirst({
        where: { name: input.name, id: { not: input.id } },
      });

      if (existingClient) {
        throw new Error("Client with this name already exists.");
      }

      return ctx.db.client.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(deleteClientSchema)
    .mutation(async ({ ctx, input }) => {
      const userCount = await ctx.db.user.count({
        where: { clientId: input.id },
      });

      if (userCount > 0) {
        throw new Error(
          "Cannot delete client: users are still associated with this client.",
        );
      }

      const projectCount = await ctx.db.project.count({
        where: { clientId: input.id },
      });

      if (projectCount > 0) {
        throw new Error(
          "Cannot delete client: projects are still associated with this client.",
        );
      }

      return ctx.db.client.delete({
        where: { id: input.id },
      });
    }),
});
