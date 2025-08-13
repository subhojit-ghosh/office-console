"use client";

import { Button, Grid, Group, LoadingOverlay, Modal, Select, TextInput, Textarea } from "@mantine/core";
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
    if (session?.user.clientId && isClientRole(session.user.role)) {
      form.setFieldValue("clientId", session.user.clientId);
    }
  }, [session?.user.clientId, session?.user.role, form]);

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
    <Modal opened={opened} onClose={close} title={mode === "add" ? "Add Requirement" : "Edit Requirement"} centered>
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={12}>
            <Select label="Type" data={REQUIREMENT_TYPE_OPTIONS} {...form.getInputProps("type")} withAsterisk disabled={loading} />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput label="Title" {...form.getInputProps("title")} withAsterisk disabled={loading} />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea label="Description" autosize minRows={4} {...form.getInputProps("description")} disabled={loading} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select label="Status" data={REQUIREMENT_STATUS_OPTIONS} {...form.getInputProps("status")} withAsterisk disabled={loading} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select label="Priority" data={REQUIREMENT_PRIORITY_OPTIONS} {...form.getInputProps("priority")} withAsterisk disabled={loading} />
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
          <Grid.Col span={12}>
            <Group justify="space-between">
              <Button variant="subtle" onClick={() => close()}>
                Cancel
              </Button>
              <Button loading={loading} type="submit">
                Save
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </form>
    </Modal>
  );
}


