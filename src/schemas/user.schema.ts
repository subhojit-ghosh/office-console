import { z } from "zod";

const userRoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CLIENT"]);

export const getAllUsersSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("name").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional().nullable(),
  role: userRoleEnum.optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

export const getUserByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createUserSchema = z
  .object({
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Valid email is required"),
    role: userRoleEnum,
    clientId: z.string().optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    isActive: z.boolean().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === userRoleEnum.Values.CLIENT && !data.clientId) {
      ctx.addIssue({
        path: ["clientId"],
        code: z.ZodIssueCode.custom,
        message: "Client ID is required when role is CLIENT",
      });
    }
  });

export const updateUserSchema = z
  .object({
    id: z.string().nonempty("ID is required"),
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Valid email is required"),
    role: userRoleEnum,
    clientId: z.string().optional().nullable(),
    password: z
      .string()
      .optional().nullable()
      .refine((val) => !val || val.length >= 6, {
        message: "Password must be at least 6 characters",
      }),
    isActive: z.boolean().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === userRoleEnum.Values.CLIENT && !data.clientId) {
      ctx.addIssue({
        path: ["clientId"],
        code: z.ZodIssueCode.custom,
        message: "Client ID is required when role is CLIENT",
      });
    }
  });

export const deleteUserSchema = z.object({
  id: z.string().nonempty("ID is required"),
});
