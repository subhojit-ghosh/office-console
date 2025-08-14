import type { Prisma } from "@prisma/client";
import { RequirementActivityType, RequirementPriority, RequirementStatus, RequirementType, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createRequirementSchema,
  deleteRequirementSchema,
  getAllRequirementsSchema,
  getRequirementByIdSchema,
  updateRequirementSchema,
} from "~/schemas/requirement.schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const requirementsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllRequirementsSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "createdAt";
      const sortOrder = input.sortOrder ?? "desc";

      // Access: if user has clientId, restrict to that client
      const effectiveClientId = ctx.session.user.clientId ?? undefined;

      const where: Prisma.RequirementWhereInput = {
        ...(search
          ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
      };

      const [requirements, total] = await Promise.all([
        ctx.db.requirement.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            clientId: true,
            createdBy: { select: { id: true, name: true } },
            parent: { select: { id: true, title: true, type: true } },
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.db.requirement.count({ where }),
      ]);

      return { requirements, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  getAllMinimalParents: protectedProcedure.query(async ({ ctx }) => {
    const effectiveClientId = ctx.session.user.clientId ?? undefined;
    return ctx.db.requirement.findMany({
      where: {
        type: { in: [RequirementType.NEW_PROJECT, RequirementType.FEATURE_REQUEST] },
        ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, type: true },
    });
  }),

  getById: protectedProcedure.input(getRequirementByIdSchema).query(async ({ ctx, input }) => {
    return ctx.db.requirement.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        clientId: true,
        parentId: true,
        parent: { select: { id: true, title: true, type: true } },
        createdBy: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
        activities: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            field: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(createRequirementSchema)
    .mutation(async ({ ctx, input }) => {
      // client users/admins can only create under their own client
      const clientId = ctx.session.user.clientId ?? input.clientId ?? null;
      if (ctx.session.user.clientId && clientId !== ctx.session.user.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid client" });
      }

      const req = await ctx.db.requirement.create({
        data: {
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? RequirementStatus.DRAFT,
          priority: input.priority ?? RequirementPriority.MEDIUM,
          clientId: clientId ?? undefined,
          createdById: ctx.session.user.id,
          parentId: input.parentId ?? undefined,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await ctx.db.requirementActivity.create({
        data: {
          requirementId: req.id,
          type: RequirementActivityType.CREATED,
          userId: ctx.session.user.id,
        },
      });
      return req;
    }),

  update: protectedProcedure
    .input(updateRequirementSchema)
    .mutation(async ({ ctx, input }) => {
      const existingForAuth = await ctx.db.requirement.findUnique({ where: { id: input.id }, select: { clientId: true } });
      if (!existingForAuth) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      if (ctx.session.user.clientId && existingForAuth.clientId !== ctx.session.user.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const existing = await ctx.db.requirement.findUnique({ where: { id: input.id } });
      const logs: Array<{ requirementId: string; userId: string; type: RequirementActivityType; field?: string | null; oldValue?: string | null; newValue?: string | null }> = [];
      if (existing) {
        const fieldChangeKeys: (keyof typeof input)[] = ["type", "status", "priority"];
        const softUpdateKeys: (keyof typeof input)[] = ["title", "description", "parentId"]; 
        for (const key of fieldChangeKeys) {
          const newValue = (input as Record<string, unknown>)[key] as string | undefined;
          const oldValue = (existing as Record<string, unknown>)[key] as string | undefined;
          if (newValue !== undefined && newValue !== oldValue) {
            logs.push({ requirementId: input.id, userId: ctx.session.user.id, type: RequirementActivityType.FIELD_CHANGE, field: key as string, oldValue: oldValue ?? null, newValue: newValue ?? null });
          }
        }
        for (const key of softUpdateKeys) {
          const newValue = (input as Record<string, unknown>)[key] as string | undefined;
          const oldValue = (existing as Record<string, unknown>)[key] as string | undefined;
          if (newValue !== undefined && newValue !== oldValue) {
            logs.push({ requirementId: input.id, userId: ctx.session.user.id, type: RequirementActivityType.UPDATED, field: key as string });
          }
        }
      }
      const updated = await ctx.db.requirement.update({
        where: { id: input.id },
        data: {
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          parentId: input.parentId ?? null,
          // client change allowed only for admins
          ...(ctx.session.user.role === UserRole.ADMIN && input.clientId !== undefined
            ? { clientId: input.clientId ?? null }
            : {}),
        },
      });
      if (logs.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await ctx.db.requirementActivity.createMany({ data: logs });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(deleteRequirementSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.requirement.findUnique({ where: { id: input.id }, select: { clientId: true } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      if (ctx.session.user.clientId && existing.clientId !== ctx.session.user.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const childCount = await ctx.db.requirement.count({ where: { parentId: input.id } });
      if (childCount > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete requirement with children" });
      return ctx.db.requirement.delete({ where: { id: input.id } });
    }),
});



