import {
  TicketActivityType,
  TicketCommentType,
  TicketStatus,
  type Prisma,
} from "@prisma/generated/server";
import { TRPCError } from "@trpc/server";
import {
  createTicketCommentSchema,
  createTicketSchema,
  deleteTicketCommentSchema,
  getAllTicketsMinimalSchema,
  getAllTicketsSchema,
  getTicketByIdSchema,
  getTicketCommentsByTicketIdSchema,
  reopenTicketSchema,
  signoffTicketSchema,
  updateTicketCommentSchema,
  updateTicketSchema,
} from "~/schemas/ticket.schema";
import { deleteRequirementSchema } from "~/schemas/requirement.schema";
import { sanitizeInputSchema } from "~/utils/zod-helpers";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const ticketsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllTicketsSchema)
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 10;
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "createdAt";
      const sortOrder = input.sortOrder ?? "desc";
      const status = input.status;

      // Access: if user has clientId, restrict to that client
      const effectiveClientId = ctx.session.user.clientId ?? undefined;

      const where: Prisma.TicketWhereInput = {
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
      };

      const [tickets, total] = await Promise.all([
        ctx.db.ticket.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            crId: true,
            clientId: true,
            createdBy: { select: { id: true, name: true } },
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                comments: true,
                tasks: true,
              },
            },
          },
        }),
        ctx.db.ticket.count({ where }),
      ]);

      return {
        tickets,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getAllMinimal: protectedProcedure
    .input(getAllTicketsMinimalSchema)
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();
      const sortBy = input.sortBy ?? "createdAt";
      const sortOrder = input.sortOrder ?? "desc";
      const status = input.status;

      // Access: if user has clientId, restrict to that client
      const effectiveClientId = ctx.session.user.clientId ?? undefined;

      const where: Prisma.TicketWhereInput = {
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
      };

      return ctx.db.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          title: true,
          crId: true,
          status: true,
        },
      });
    }),

  getById: protectedProcedure
    .input(getTicketByIdSchema)
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          description: true,
          crId: true,
          status: true,
          clientId: true,
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
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comments: {
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
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              type: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only see tickets from their client
      if (
        ctx.session.user.clientId &&
        ticket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ticket;
    }),

  create: protectedProcedure
    .input(sanitizeInputSchema(createTicketSchema))
    .mutation(async ({ ctx, input }) => {
      // client users/admins can only create under their own client
      const clientId = ctx.session.user.clientId ?? input.clientId ?? null;
      if (ctx.session.user.clientId && clientId !== ctx.session.user.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid client" });
      }

      const ticket = await ctx.db.ticket.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          crId: input.crId ?? null,
          status: input.status ?? TicketStatus.OPEN,
          clientId: clientId!,
          createdById: ctx.session.user.id,
        },
      });

      await ctx.db.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          type: TicketActivityType.CREATED,
          userId: ctx.session.user.id,
        },
      });

      return ticket;
    }),

  update: protectedProcedure
    .input(sanitizeInputSchema(updateTicketSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const userId = ctx.session.user.id;

      // Get existing ticket with access control
      const existingTicket = await ctx.db.ticket.findUnique({
        where: { id },
      });

      if (!existingTicket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only update tickets from their client
      if (
        ctx.session.user.clientId &&
        existingTicket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Prevent client users from changing status (especially to SIGNED_OFF)
      // Status changes should go through the dedicated signoff mutation
      if (ctx.session.user.clientId && rest.status !== undefined) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Client users cannot change ticket status. Use the signoff action instead.",
        });
      }

      // Prevent updating tickets that are already signed off
      if (existingTicket.status === TicketStatus.SIGNED_OFF) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update a ticket that has been signed off.",
        });
      }

      const activityLogs: Prisma.TicketActivityCreateManyInput[] = [];

      const fieldChangeKeys: (keyof typeof rest)[] = ["status", "crId"];
      const softUpdateKeys: (keyof typeof rest)[] = ["title", "description"];

      for (const key of fieldChangeKeys) {
        const newValue = rest[key];
        const oldValue = existingTicket[key];

        if (newValue !== undefined && newValue !== oldValue) {
          activityLogs.push({
            ticketId: id,
            userId,
            type: TicketActivityType.FIELD_CHANGE,
            field: key,
            oldValue: oldValue?.toString() ?? null,
            newValue: newValue?.toString() ?? null,
          });
        }
      }

      for (const key of softUpdateKeys) {
        const newValue = rest[key];
        const oldValue = existingTicket[key];

        if (newValue !== undefined && newValue !== oldValue) {
          activityLogs.push({
            ticketId: id,
            userId,
            type: TicketActivityType.UPDATED,
            field: key,
          });
        }
      }

      const updatedTicket = await ctx.db.ticket.update({
        where: { id },
        data: {
          ...rest,
        },
      });

      if (activityLogs.length > 0) {
        await ctx.db.ticketActivity.createMany({ data: activityLogs });
      }

      return updatedTicket;
    }),

  reopen: protectedProcedure
    .input(reopenTicketSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get existing ticket with access control
      const existingTicket = await ctx.db.ticket.findUnique({
        where: { id: input.id },
        select: { clientId: true, status: true },
      });

      if (!existingTicket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only reopen tickets from their client
      if (
        ctx.session.user.clientId &&
        existingTicket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Prevent reopening tickets that are signed off (irreversible)
      if (existingTicket.status === TicketStatus.SIGNED_OFF) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot reopen a ticket that has been signed off.",
        });
      }

      // Update status to REOPENED and log activity
      const updatedTicket = await ctx.db.ticket.update({
        where: { id: input.id },
        data: { status: TicketStatus.REOPENED },
      });

      await ctx.db.ticketActivity.create({
        data: {
          ticketId: input.id,
          userId,
          type: TicketActivityType.REOPENED,
          field: "status",
          oldValue: existingTicket.status,
          newValue: TicketStatus.REOPENED,
        },
      });

      return updatedTicket;
    }),

  signoff: protectedProcedure
    .input(sanitizeInputSchema(signoffTicketSchema))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get existing ticket with access control
      const existingTicket = await ctx.db.ticket.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          status: true,
          clientId: true,
          createdById: true,
          signedOffAt: true,
        },
      });

      if (!existingTicket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Authorization: Only client users can sign off tickets
      if (!ctx.session.user.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only client users can sign off tickets.",
        });
      }

      // Authorization: Only the requester (createdBy) can sign off
      if (existingTicket.createdById !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the ticket requester can sign off this ticket.",
        });
      }

      // Access control: client users can only sign off tickets from their client
      if (existingTicket.clientId !== ctx.session.user.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // State check: Only allow signoff when ticket is RESOLVED
      if (existingTicket.status !== TicketStatus.RESOLVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Ticket must be in RESOLVED status before it can be signed off.",
        });
      }

      // Prevent double signoff
      if (existingTicket.signedOffAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ticket has already been signed off.",
        });
      }

      // Update ticket status and audit fields
      const updatedTicket = await ctx.db.ticket.update({
        where: { id: input.id },
        data: {
          status: TicketStatus.SIGNED_OFF,
          signedOffAt: new Date(),
          signedOffById: userId,
        },
      });

      // Create activity log entry
      await ctx.db.ticketActivity.create({
        data: {
          ticketId: input.id,
          userId,
          type: TicketActivityType.FIELD_CHANGE,
          field: "status",
          oldValue: TicketStatus.RESOLVED,
          newValue: TicketStatus.SIGNED_OFF,
        },
      });

      // Create comment if provided
      if (input.comment?.trim()) {
        await ctx.db.ticketComment.create({
          data: {
            ticketId: input.id,
            userId,
            type: TicketCommentType.GENERAL,
            content: input.comment.trim(),
          },
        });
      }

      return updatedTicket;
    }),

  getComments: protectedProcedure
    .input(getTicketCommentsByTicketIdSchema)
    .query(async ({ ctx, input }) => {
      // Check ticket access first
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: input.ticketId },
        select: { id: true, clientId: true },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only see comments on tickets from their client
      if (
        ctx.session.user.clientId &&
        ticket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.ticketComment.findMany({
        where: { ticketId: input.ticketId },
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
    .input(createTicketCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, type, content } = input;
      const userId = ctx.session.user.id;

      // Check ticket access first
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, clientId: true },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only comment on tickets from their client
      if (
        ctx.session.user.clientId &&
        ticket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const comment = await ctx.db.ticketComment.create({
        data: {
          ticketId,
          type,
          content,
          userId,
        },
      });

      return comment;
    }),

  updateComment: protectedProcedure
    .input(updateTicketCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, content } = input;
      const userId = ctx.session.user.id;

      const comment = await ctx.db.ticketComment.findUnique({
        where: { id },
        select: { id: true, userId: true, ticketId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (comment.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to update this comment",
        });
      }

      // Check ticket access
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: comment.ticketId },
        select: { clientId: true },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only update comments on tickets from their client
      if (
        ctx.session.user.clientId &&
        ticket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.ticketComment.update({
        where: { id },
        data: {
          content,
          edited: true,
        },
      });
    }),

  deleteComment: protectedProcedure
    .input(deleteTicketCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const comment = await ctx.db.ticketComment.findUnique({
        where: { id },
        select: { id: true, userId: true, ticketId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (comment.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to delete this comment",
        });
      }

      // Check ticket access
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: comment.ticketId },
        select: { clientId: true },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Access control: client users can only delete comments on tickets from their client
      if (
        ctx.session.user.clientId &&
        ticket.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.ticketComment.delete({
        where: { id },
      });
    }),

  delete: protectedProcedure
    .input(deleteRequirementSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ticket.findUnique({
        where: { id: input.id },
        select: { clientId: true },
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      if (
        ctx.session.user.clientId &&
        existing.clientId !== ctx.session.user.clientId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return ctx.db.ticket.delete({ where: { id: input.id } });
    }),
});
