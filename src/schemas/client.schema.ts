import { z } from "zod";

export const getAllClientsSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("name").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional().nullable(),
});

export const getClientByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createClientSchema = z.object({
  name: z.string().nonempty("Name is required"),
});

export const updateClientSchema = z.object({
  id: z.string().nonempty("ID is required"),
  name: z.string().nonempty("Name is required"),
});

export const deleteClientSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
