import {
  OnboardingTour,
  type OnboardingTourStep,
} from "@gfazioli/mantine-onboarding-tour";
import {
  ActionIcon,
  Affix,
  Button,
  Center,
  LoadingOverlay,
  Modal,
  Rating,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { FeedbackType } from "@prisma/client";
import { IconMessageDots } from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { useState } from "react";
import { FEEDBACK_TYPE_OPTIONS } from "~/constants/feedback.constant";
import { createFeedbackSchema } from "~/schemas/feedback.schema";
import { api } from "~/trpc/react";

const tourSteps: OnboardingTourStep[] = [
  {
    id: "feedback-button",
    title: "New Feedback Option",
    content: "Let me know what you think or report issues directly!",
  },
];

export default function Feedback() {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [started, { close: closeTour }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      type: FeedbackType.FEEDBACK as FeedbackType,
      rating: null,
      message: "",
    },
    validate: zodResolver(createFeedbackSchema),
  });

  const createFeedback = api.feedback.create.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      notifications.show({
        message: "Feedback submitted successfully",
        color: "green",
      });
      setHasSubmitted(true);
    },
    onError: (error) => {
      form.setFieldError("message", error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const submitHandler = () => {
    createFeedback.mutate(form.values);
  };

  const handleClose = () => {
    close();

    setTimeout(() => {
      setHasSubmitted(false);
      form.reset();
    }, 200);
  };

  const isBug = form.values.type === FeedbackType.BUG;
  const isFeedback = form.values.type === FeedbackType.FEEDBACK;

  return (
    <>
      <OnboardingTour
        tour={tourSteps}
        started={started}
        onOnboardingTourEnd={closeTour}
        onOnboardingTourClose={closeTour}
        endStepNavigation="Got it"
        withSkipButton={false}
        withStepper={false}
      >
        <Affix position={{ bottom: 16, right: 16 }}>
          <div data-onboarding-tour-id="feedback-button">
            <Tooltip label="Send feedback" withArrow>
              <ActionIcon
                size="lg"
                radius="xl"
                variant="filled"
                color="blue"
                onClick={open}
              >
                <IconMessageDots />
              </ActionIcon>
            </Tooltip>
          </div>
        </Affix>

        <Modal
          opened={opened}
          onClose={handleClose}
          title="Tell me what's on your mind"
          centered
        >
          <LoadingOverlay visible={loading} />

          {hasSubmitted ? (
            <Center h={150}>
              <Text size="lg" fw={500} ta="center">
                🎉 Thank you for your feedback!
              </Text>
            </Center>
          ) : (
            <form onSubmit={form.onSubmit(submitHandler)}>
              <Stack>
                <Select
                  label="What type of feedback?"
                  data={FEEDBACK_TYPE_OPTIONS}
                  withAsterisk
                  {...form.getInputProps("type")}
                />

                {isFeedback && (
                  <>
                    <Text size="sm">How do you rate your experience?</Text>
                    <Rating size="lg" {...form.getInputProps("rating")} />
                  </>
                )}

                <Textarea
                  label={
                    isBug
                      ? "Describe the bug (steps to reproduce, expected vs actual)"
                      : "Your message"
                  }
                  placeholder="Type your feedback here"
                  minRows={4}
                  withAsterisk
                  {...form.getInputProps("message")}
                />

                <Button type="submit">Submit</Button>
              </Stack>
            </form>
          )}
        </Modal>
      </OnboardingTour>
    </>
  );
}
