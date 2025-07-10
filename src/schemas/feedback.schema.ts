import { z } from "zod";
import { FEEDBACK_TYPES } from "~/constants/feedback.constant";
import { zOptionalInput } from "~/utils/zod-helpers";

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  rating: zOptionalInput(
    z
      .number()
      .min(1, "Too small (1 is the min)")
      .max(5, "Too large (5 is the max)")
      .optional()
      .nullable(),
  ),
  message: z.string().nonempty("Message is required"),
});
