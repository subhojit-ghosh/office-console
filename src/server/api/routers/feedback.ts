import { createFeedbackSchema } from "~/schemas/feedback.schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.create({
        data: {
          type: input.type,
          rating: input.rating ?? null,
          message: input.message,
          userId: ctx.session.user.id,
        },
      });
    }),
});
