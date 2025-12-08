"use client";

import {
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
  NumberInput,
  Switch,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useEffect, useState } from "react";

import {
  createClientSchema,
  updateClientSchema,
} from "~/schemas/client.schema";
import { TASK_TYPE_OPTIONS, type TaskType } from "~/constants/task.constant";
import { api, apiClient } from "~/trpc/react";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  id?: string | null;
}

export default function ClientForm({ mode, opened, close, id }: Props) {
  const utils = api.useUtils();
  const [loading, setLoading] = useState(false);
  const [editDataLoading, setEditDataLoading] = useState(false);

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      timeDisplayMultiplier: 1,
      showAssignees: true,
      crIdMandatoryTaskTypes: [] as TaskType[],
      moduleMandatoryForTasks: false,
    },
    validate: zod4Resolver(
      mode === "add" ? createClientSchema : updateClientSchema,
    ),
  });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
    }

    if (mode === "edit") {
      form.reset();
      void loadDataForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, opened]);

  const loadDataForEdit = async () => {
    if (!id) return;
    try {
      setEditDataLoading(true);
      const clientDetail = await apiClient.clients.getById.query({ id });
      if (clientDetail) {
        form.setValues({
          id: clientDetail.id,
          name: clientDetail.name,
          timeDisplayMultiplier: Number(clientDetail.timeDisplayMultiplier),
          showAssignees: clientDetail.showAssignees,
          crIdMandatoryTaskTypes: Array.isArray(clientDetail.crIdMandatoryTaskTypes)
            ? clientDetail.crIdMandatoryTaskTypes
            : [],
          moduleMandatoryForTasks:
            clientDetail.moduleMandatoryForTasks || false,
        });
      }
    } catch (error) {
      console.error("Error loading client details:", error);
      notifications.show({
        message: "Failed to load client details.",
        color: "red",
      });
    } finally {
      setEditDataLoading(false);
    }
  };

  const createClient = api.clients.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Client has been created successfully.",
        color: "green",
      });
      void utils.clients.getAll.invalidate();
      form.reset();
      close();
    },
    onError: (error) => {
      form.setFieldError("name", error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const updateClient = api.clients.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "Client has been updated successfully.",
        color: "green",
      });
      void utils.clients.getAll.invalidate();
      form.reset();
      close();
    },
    onError: (error) => {
      form.setFieldError("name", error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const submitHandler = () => {
    setLoading(true);
    if (mode === "add") {
      createClient.mutate({
        name: form.values.name,
        timeDisplayMultiplier: form.values.timeDisplayMultiplier,
        showAssignees: form.values.showAssignees,
        crIdMandatoryTaskTypes: form.values.crIdMandatoryTaskTypes,
        moduleMandatoryForTasks: form.values.moduleMandatoryForTasks,
      });
    } else if (mode === "edit" && id) {
      updateClient.mutate({
        id: form.values.id,
        name: form.values.name,
        timeDisplayMultiplier: form.values.timeDisplayMultiplier,
        showAssignees: form.values.showAssignees,
        crIdMandatoryTaskTypes: form.values.crIdMandatoryTaskTypes,
        moduleMandatoryForTasks: form.values.moduleMandatoryForTasks,
      });
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={mode === "add" ? "Add Client" : "Edit Client"}
    >
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(submitHandler)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              withAsterisk
              {...form.getInputProps("name")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <NumberInput
              label="Time Display Multiplier"
              description="This multiplier adjusts how tracked time is shown for this client. For example: 1 shows the actual time, 2 doubles it, 0.5 shows half, and 3 triples it."
              decimalScale={2}
              {...form.getInputProps("timeDisplayMultiplier")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Switch
              defaultChecked
              label="Show Assignees"
              {...form.getInputProps("showAssignees", { type: "checkbox" })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <MultiSelect
              label="CR ID Mandatory Task Types"
              description="Select task types that require a CR ID"
              data={TASK_TYPE_OPTIONS}
              {...form.getInputProps("crIdMandatoryTaskTypes")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Switch
              label="Module Mandatory for Tasks"
              {...form.getInputProps("moduleMandatoryForTasks", {
                type: "checkbox",
              })}
            />
          </Grid.Col>
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
