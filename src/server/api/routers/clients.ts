import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const clientsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.client.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().nonempty("ID is required") }))
    .query(async ({ ctx, input }) => {
      return ctx.db.client.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().nonempty("Name is required") }))
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
    .input(
      z.object({
        id: z.string().nonempty("ID is required"),
        name: z.string().nonempty("Name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().nonempty("ID is required") }))
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
