import { z } from "zod";

const userRoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CLIENT"]);

export const getAllUsersSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("name").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
  clientId: z.string().optional(),
});

export const getUserByIdSchema = z.object({
  id: z.string().nonempty("ID is required"),
});

export const createUserSchema = z
  .object({
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Valid email is required"),
    role: userRoleEnum,
    clientId: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    isActive: z.boolean().optional(),
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
    clientId: z.string().optional(),
    password: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 6, {
        message: "Password must be at least 6 characters",
      }),
    isActive: z.boolean().optional(),
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
