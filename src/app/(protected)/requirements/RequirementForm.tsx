"use client";

import { Badge, Button, Grid, Group, LoadingOverlay, Modal, Select, Tabs, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { RequirementPriority, RequirementStatus, RequirementType, type Requirement } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { createRequirementSchema, updateRequirementSchema } from "~/schemas/requirement.schema";
import { api, apiClient } from "~/trpc/react";
import { isClientRole } from "~/utils/roles";
import { REQUIREMENT_STATUS_OPTIONS, REQUIREMENT_PRIORITY_OPTIONS, REQUIREMENT_TYPE_OPTIONS } from "~/constants/requirement.constant";
import AppRichTextEditor from "~/components/AppRichTextEditor";
import { EditableBadgeDropdown } from "~/components/EditableBadgeDropdown";
import { IconFileDescription, IconMessage } from "@tabler/icons-react";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  id?: string | null;
}


export default function RequirementForm({ mode, opened, close, id }: Props) {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [editDataLoading, setEditDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      id: "",
      type: RequirementType.NEW_PROJECT as Requirement["type"],
      title: "",
      description: "",
      status: RequirementStatus.DRAFT as Requirement["status"],
      priority: RequirementPriority.MEDIUM as Requirement["priority"],
      clientId: "",
      parentId: "",
    },
    validate: zodResolver(mode === "add" ? createRequirementSchema : updateRequirementSchema),
  });

  const parentsQuery = api.requirements.getAllMinimalParents.useQuery();
  const clientsQuery = api.clients.getAllMinimal.useQuery();

  useEffect(() => {
    if (mode === "add") {
      form.reset();
    }
    if (mode === "edit") {
      form.reset();
      void loadDataForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, opened]);

  // Auto-select client for client roles
  useEffect(() => {
    const targetClientId = session?.user?.clientId;
    if (
      targetClientId &&
      isClientRole(session?.user?.role) &&
      form.values.clientId !== targetClientId
    ) {
      form.setFieldValue("clientId", targetClientId);
    }
  }, [session?.user?.clientId, session?.user?.role, form.values.clientId]);

  const createRequirement = api.requirements.create.useMutation({
    onSuccess: async () => {
      notifications.show({ message: "Requirement has been created successfully.", color: "green" });
      void utils.requirements.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      const zodErrors = error.shape?.data?.zodError;
      if (zodErrors) {
        const fieldErrors = Object.entries(zodErrors.fieldErrors);
        fieldErrors.forEach(([field, messages]) => {
          form.setFieldError(field, messages ? messages[0] : "Invalid input");
        });
      }
      setLoading(false);
    },
  });

  const updateRequirement = api.requirements.update.useMutation({
    onSuccess: async () => {
      notifications.show({ message: "Requirement has been updated successfully.", color: "green" });
      void utils.requirements.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
      setLoading(false);
    },
  });

  const loadDataForEdit = async () => {
    if (!id) return;
    try {
      setEditDataLoading(true);
      const detail = await apiClient.requirements.getById.query({ id });
      if (detail) {
        form.setValues({
          id: detail.id,
          type: detail.type,
          title: detail.title,
          description: detail.description ?? "",
          status: detail.status,
          priority: detail.priority,
          clientId: detail.clientId ?? "",
          parentId: detail.parentId ?? "",
        });
      }
    } catch (error) {
      console.error("Error loading requirement details:", error);
      notifications.show({ message: "Failed to load requirement details.", color: "red" });
    } finally {
      setEditDataLoading(false);
    }
  };

  const handleSubmit = (values: typeof form.values) => {
    setLoading(true);
    if (mode === "add") {
      createRequirement.mutate({
        type: values.type,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        clientId: isClientRole(session?.user.role) ? session?.user.clientId : values.clientId,
        parentId: values.type === RequirementType.CHANGE_REQUEST ? values.parentId : undefined,
      });
    } else if (mode === "edit" && id) {
      updateRequirement.mutate({
        id: values.id,
        type: values.type,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        clientId: isClientRole(session?.user.role) ? session?.user.clientId : values.clientId,
        parentId: values.type === RequirementType.CHANGE_REQUEST ? values.parentId : undefined,
      });
    }
  };

  const isChangeRequest = useMemo(() => form.values.type === RequirementType.CHANGE_REQUEST, [form.values.type]);

  return (
    <Modal opened={opened} onClose={close} centered size="90%" withCloseButton={false}>
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={9} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <Grid>
              <Grid.Col span={12}>
                <Textarea
                  placeholder="Title"
                  {...form.getInputProps("title")}
                  withAsterisk
                  disabled={loading}
                  autosize
                  minRows={1}
                  leftSectionWidth={70}
                  leftSection={
                    <EditableBadgeDropdown
                      value={form.values.type}
                      options={REQUIREMENT_TYPE_OPTIONS}
                      onChange={(value) => form.setFieldValue("type", value)}
                      compact={false}
                      hoverEffect={false}
                      fullWidth={true}
                      position="bottom-start"
                      isIconVariant={true}
                      variant="subtle"
                    />
                  }
                  styles={{ input: { paddingTop: 5 } }}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <AppRichTextEditor
                  id={form.values.id}
                  content={form.values.description}
                  onUpdate={(content) => form.setFieldValue("description", content)}
                  placeholder="Add description..."
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Tabs variant="default" defaultValue="details">
                  <Tabs.List>
                    <Tabs.Tab value="details" leftSection={<IconFileDescription size={16} />}>Details</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="details" pt="md">&nbsp;</Tabs.Panel>
                </Tabs>
              </Grid.Col>
            </Grid>
          </Grid.Col>
          <Grid.Col span={3}>
            <Grid>
              <Grid.Col span={6}>
                <EditableBadgeDropdown
                  value={form.values.status}
                  options={REQUIREMENT_STATUS_OPTIONS}
                  onChange={(value) => form.setFieldValue("status", value)}
                  compact={false}
                  hoverEffect={false}
                  fullWidth={true}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <EditableBadgeDropdown
                  value={form.values.priority}
                  options={REQUIREMENT_PRIORITY_OPTIONS}
                  onChange={(value) => form.setFieldValue("priority", value)}
                  compact={false}
                  hoverEffect={false}
                  fullWidth={true}
                />
              </Grid.Col>
              {!isClientRole(session?.user.role) && (
                <Grid.Col span={12}>
                  <Select
                    label="Client"
                    data={clientsQuery.data?.map((c) => ({ value: c.id, label: c.name })) ?? []}
                    {...form.getInputProps("clientId")}
                    searchable
                    disabled={loading || clientsQuery.isLoading}
                    placeholder={clientsQuery.isLoading ? "Loading clients..." : "Select client (optional)"}
                  />
                </Grid.Col>
              )}
              {isChangeRequest && (
                <Grid.Col span={12}>
                  <Select
                    label="Parent Requirement"
                    data={parentsQuery.data?.map((p) => ({ value: p.id, label: `${p.title} (${p.type.replace("_", " ")})` })) ?? []}
                    {...form.getInputProps("parentId")}
                    withAsterisk
                    searchable
                    disabled={loading || parentsQuery.isLoading}
                    placeholder={parentsQuery.isLoading ? "Loading requirements..." : "Select parent requirement"}
                  />
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


