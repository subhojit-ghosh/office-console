import { z } from "zod";
import {
  TICKET_COMMENT_TYPES,
  TICKET_STATUSES,
} from "~/constants/ticket.constant";

export const getAllTicketsSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  status: z.enum(TICKET_STATUSES).optional(),
});

export const getAllTicketsMinimalSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  status: z.enum(TICKET_STATUSES).optional(),
});

export const getTicketByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createTicketSchema = z.object({
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  crId: z.string().optional().nullable(),
  status: z.enum(TICKET_STATUSES).optional(),
  clientId: z.string().optional(),
});

export const updateTicketSchema = z.object({
  id: z.string().nonempty("ID is required"),
  title: z.string().nonempty("Title is required"),
  description: z.string().optional().nullable(),
  crId: z.string().optional().nullable(),
  status: z.enum(TICKET_STATUSES).optional(),
  clientId: z.string().optional(),
});

export const reopenTicketSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const getTicketCommentsByTicketIdSchema = z.object({
  ticketId: z.string().nonempty("Ticket ID is required"),
});

export const createTicketCommentSchema = z.object({
  ticketId: z.string().nonempty("Ticket ID is required"),
  type: z.enum(TICKET_COMMENT_TYPES).optional(),
  content: z.string().nonempty("Content is required"),
});

export const updateTicketCommentSchema = z.object({
  id: z.string().nonempty("ID is required"),
  content: z.string().nonempty("Content is required"),
});

export const deleteTicketCommentSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const signoffTicketSchema = z.object({
  id: z.string().nonempty("ID is required"),
  comment: z.string().optional().nullable(),
});
