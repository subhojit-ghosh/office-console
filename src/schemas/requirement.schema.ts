import { z } from "zod";
import { RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";

export const getAllRequirementsSchema = z.object({
  page: z.number().int().min(1).default(1).optional().nullable(),
  pageSize: z.number().int().min(1).max(100).default(10).optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.string().default("createdAt").optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional().nullable(),
  status: z.nativeEnum(RequirementStatus).optional().nullable(),
  type: z.nativeEnum(RequirementType).optional().nullable(),
  priority: z.nativeEnum(RequirementPriority).optional().nullable(),
});

export const getRequirementByIdSchema = z.object({ id: z.string().nonempty("ID is required") });

export const createRequirementSchema = z
  .object({
    type: z.nativeEnum(RequirementType),
    title: z.string().nonempty("Title is required"),
    description: z.string().optional().nullable(),
    status: z.nativeEnum(RequirementStatus).optional().default(RequirementStatus.DRAFT),
    priority: z.nativeEnum(RequirementPriority).optional().default(RequirementPriority.MEDIUM),
    clientId: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === RequirementType.CHANGE_REQUEST && !data.parentId) {
      ctx.addIssue({ path: ["parentId"], code: z.ZodIssueCode.custom, message: "Parent is required for Change Request" });
    }
  });

export const updateRequirementSchema = z
  .object({
    id: z.string().nonempty("ID is required"),
    type: z.nativeEnum(RequirementType),
    title: z.string().nonempty("Title is required"),
    description: z.string().optional().nullable(),
    status: z.nativeEnum(RequirementStatus),
    priority: z.nativeEnum(RequirementPriority),
    clientId: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === RequirementType.CHANGE_REQUEST && !data.parentId) {
      ctx.addIssue({ path: ["parentId"], code: z.ZodIssueCode.custom, message: "Parent is required for Change Request" });
    }
  });

export const deleteRequirementSchema = z.object({ id: z.string().nonempty("ID is required") });



