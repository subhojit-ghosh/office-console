import { z } from "zod";

const userRoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CLIENT"]);

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
