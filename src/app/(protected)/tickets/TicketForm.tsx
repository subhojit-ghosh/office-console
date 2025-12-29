"use client";

import {
  Button,
  Grid,
  Group,
  Modal,
  Select,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { zod4Resolver } from "mantine-form-zod-resolver";
import type { Session } from "next-auth";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import AppRichTextEditor from "~/components/AppRichTextEditor";
import { EditableBadgeDropdown } from "~/components/EditableBadgeDropdown";
import { TICKET_STATUS_OPTIONS } from "~/constants/ticket.constant";
import {
  createTicketSchema,
  updateTicketSchema,
} from "~/schemas/ticket.schema";
import { api, apiClient } from "~/trpc/react";
import { isClientRole } from "~/utils/roles";
import { TicketActivityFeed } from "./TicketActivityFeed";
import TicketComments from "./TicketComments";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  ticketId?: string | null;
  session?: Session | null; // Pass session from parent to avoid useSession in modal context
}

export default function TicketForm({
  mode,
  opened,
  close,
  ticketId,
  session,
}: Props) {
  const utils = api.useUtils();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<
    ComponentProps<typeof TicketActivityFeed>["activities"]
  >([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [originalStatus, setOriginalStatus] = useState<string>("");

  const clientsQuery = api.clients.getAllMinimal.useQuery(undefined, {
    enabled: !isClientRole(session?.user.role),
  });

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      crId: "",
      clientId: session?.user.clientId ?? "",
      status: "OPEN",
    },
    validate: {
      ...zod4Resolver(mode === "add" ? createTicketSchema : updateTicketSchema),
      clientId: (value: string) => {
        // Client ID is required for non-client users (admin/company users)
        if (
          !isClientRole(session?.user.role) &&
          (!value || value.trim() === "")
        ) {
          return "Client selection is required";
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
      setOriginalStatus("");
    }
    if (mode === "edit" && ticketId) {
      void loadDataForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ticketId]);

  const loadDataForEdit = async () => {
    if (!ticketId) return;
    try {
      const ticketDetail = await apiClient.tickets.getById.query({
        id: ticketId,
      });
      if (ticketDetail) {
        form.setValues({
          title: ticketDetail.title,
          description: ticketDetail.description ?? "",
          crId: ticketDetail.crId ?? "",
          clientId: ticketDetail.clientId,
          status: ticketDetail.status,
        });
        setActivities(ticketDetail.activities);
        setOriginalStatus(ticketDetail.status);
      }
    } catch (error) {
      console.error("Error loading ticket details:", error);
      notifications.show({
        message: "Failed to load ticket details.",
        color: "red",
      });
    }
  };

  const reopenTicket = api.tickets.reopen.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Ticket has been reopened successfully.",
        color: "green",
      });
      void utils.tickets.getAll.invalidate();
      // Reload data to update the original status
      void loadDataForEdit();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const createTicket = api.tickets.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Ticket has been created successfully.",
        color: "green",
      });
      setLoading(false);
      close();
      void utils.tickets.getAll.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
      setLoading(false);
    },
  });

  const updateTicket = api.tickets.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Ticket has been updated successfully.",
        color: "green",
      });
      void utils.tickets.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
      setLoading(false);
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    setLoading(true);
    if (mode === "add") {
      createTicket.mutate({
        title: values.title,
        description: values.description,
        crId: values.crId,
        clientId: isClientRole(session?.user.role)
          ? undefined
          : values.clientId,
      });
    } else if (mode === "edit" && ticketId) {
      updateTicket.mutate({
        id: ticketId,
        title: values.title,
        description: values.description,
        crId: values.crId,
        clientId: isClientRole(session?.user.role)
          ? undefined
          : values.clientId,
        status: values.status,
      });
    }
  };

  const canReopen = useMemo(() => {
    return (
      mode === "edit" &&
      originalStatus !== "REOPENED" &&
      originalStatus !== "OPEN" &&
      originalStatus !== "IN_PROGRESS" &&
      originalStatus !== ""
    );
  }, [mode, originalStatus]);

  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      size="90%"
      withCloseButton={false}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={9} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label="Title"
                  placeholder="Enter ticket title"
                  withAsterisk
                  {...form.getInputProps("title")}
                  disabled={loading}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <AppRichTextEditor
                  id={form.values.title || "ticket-description"}
                  content={form.values.description}
                  onUpdate={(content) =>
                    form.setFieldValue("description", content)
                  }
                  placeholder="Add description..."
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Tabs
                  variant="default"
                  defaultValue={
                    mode === "add" || isClientRole(session?.user.role)
                      ? "comments"
                      : "comments"
                  }
                >
                  <Tabs.List>
                    {mode === "edit" && (
                      <Tabs.Tab value="comments">
                        Comments
                        {!!commentsCount && (
                          <Text size="xs" ml="xs">
                            ({commentsCount})
                          </Text>
                        )}
                      </Tabs.Tab>
                    )}
                    {mode === "edit" && !isClientRole(session?.user.role) && (
                      <Tabs.Tab value="activities">Activities</Tabs.Tab>
                    )}
                  </Tabs.List>

                  {mode === "edit" && (
                    <Tabs.Panel value="comments" pt="md">
                      <TicketComments
                        ticketId={ticketId!}
                        onCountChange={setCommentsCount}
                      />
                    </Tabs.Panel>
                  )}
                  {mode === "edit" && !isClientRole(session?.user.role) && (
                    <Tabs.Panel value="activities" pt="md">
                      <TicketActivityFeed activities={activities} />
                    </Tabs.Panel>
                  )}
                </Tabs>
              </Grid.Col>
            </Grid>
          </Grid.Col>
          <Grid.Col span={3}>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label="CR ID"
                  placeholder="Enter Change Request ID"
                  {...form.getInputProps("crId")}
                  disabled={loading}
                />
              </Grid.Col>
              {!isClientRole(session?.user.role) && (
                <Grid.Col span={12}>
                  <Select
                    label="Client"
                    data={
                      clientsQuery.data?.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })) ?? []
                    }
                    {...form.getInputProps("clientId")}
                    searchable
                    disabled={loading || clientsQuery.isLoading}
                    placeholder="Select a client"
                    withAsterisk
                  />
                </Grid.Col>
              )}
              {mode === "edit" && (
                <Grid.Col span={12}>
                  <EditableBadgeDropdown
                    value={form.values.status}
                    options={TICKET_STATUS_OPTIONS}
                    onChange={(value) => form.setFieldValue("status", value)}
                    compact={false}
                    hoverEffect={false}
                    fullWidth={true}
                  />
                </Grid.Col>
              )}
              {canReopen && (
                <Grid.Col span={12}>
                  <Button
                    variant="light"
                    color="orange"
                    fullWidth
                    onClick={() => {
                      if (ticketId) {
                        reopenTicket.mutate({ id: ticketId });
                      }
                    }}
                    loading={reopenTicket.isPending}
                  >
                    Reopen Ticket
                  </Button>
                </Grid.Col>
              )}
              <Grid.Col span={6}>
                <Button
                  variant="default"
                  onClick={close}
                  type="button"
                  fullWidth
                >
                  Close
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Button loading={loading} type="submit" fullWidth>
                  Save
                </Button>
              </Grid.Col>
            </Grid>
          </Grid.Col>
        </Grid>
      </form>
    </Modal>
  );
}
