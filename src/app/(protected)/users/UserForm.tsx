"use client";

import {
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  PasswordInput,
  Select,
  Switch,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { UserRole, type User } from "@prisma/client";
import { zodResolver } from "mantine-form-zod-resolver";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { userRoleOptions } from "~/constants/user.constant";
import { createUserSchema, updateUserSchema } from "~/schemas/user.schema";
import { api, apiClient } from "~/trpc/react";
import { isClientRole } from "~/utils/roles";

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  id?: string | null;
}

export default function UserForm({ mode, opened, close, id }: Props) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [editDataLoading, setEditDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      email: "",
      role: "STAFF",
      password: "",
      isActive: true,
      clientId: "",
    },
    validate: zodResolver(mode === "add" ? createUserSchema : updateUserSchema),
  });

  const clientsQuery = api.clients.getAllMinimal.useQuery();

  const filteredRoleOptions = useMemo(() => {
    if (session?.user.role === UserRole.CLIENT_ADMIN) {
      return userRoleOptions.filter((o) =>
        [UserRole.CLIENT_ADMIN, UserRole.CLIENT_USER].includes(o.value as UserRole),
      );
    }
    return userRoleOptions;
  }, [session?.user.role]);

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

  // Auto-select client for Client Admins when choosing a client role
  useEffect(() => {
    if (
      session?.user.clientId &&
      session?.user.role === UserRole.CLIENT_ADMIN &&
      isClientRole(form.values.role as UserRole)
    ) {
      form.setFieldValue("clientId", session.user.clientId);
    }
  }, [session?.user.clientId, session?.user.role, form.values.role]);

  const createUser = api.users.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "User has been created successfully.",
        color: "green",
      });
      void utils.users.getAll.invalidate();
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

  const updateUser = api.users.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "User has been updated successfully.",
        color: "green",
      });
      void utils.users.getAll.invalidate();
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

  const loadDataForEdit = async () => {
    if (!id) return;
    try {
      setEditDataLoading(true);
      const userDetail = await apiClient.users.getById.query({ id });
      if (userDetail) {
        form.setValues({
          id: userDetail.id,
          name: userDetail.name,
          email: userDetail.email,
          role: userDetail.role,
          clientId: userDetail.clientId ?? "",
          isActive: userDetail.isActive,
        });
      }
    } catch (error) {
      console.error("Error loading user details:", error);
      notifications.show({
        message: "Failed to load user details.",
        color: "red",
      });
    } finally {
      setEditDataLoading(false);
    }
  };

  const handleSubmit = (values: typeof form.values) => {
    setLoading(true);
    if (mode === "add") {
      createUser.mutate({
        name: values.name,
        email: values.email,
        role: values.role as User["role"],
        password: values.password,
        isActive: values.isActive,
        clientId: isClientRole(values.role as UserRole)
          ? values.clientId
          : undefined,
      });
    } else if (mode === "edit" && id) {
      updateUser.mutate({
        id: values.id,
        name: values.name,
        email: values.email,
        role: values.role as User["role"],
        password: values.password || undefined,
        isActive: values.isActive,
        clientId: isClientRole(values.role as UserRole)
          ? values.clientId
          : undefined,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={mode === "add" ? "Add User" : "Edit User"}
      centered
    >
      <LoadingOverlay visible={editDataLoading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              {...form.getInputProps("name")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label="Email"
              {...form.getInputProps("email")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Role"
              data={filteredRoleOptions}
              {...form.getInputProps("role")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          {isClientRole(form.values.role as UserRole) &&
            session?.user.role !== UserRole.CLIENT_ADMIN && (
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
                withAsterisk
                searchable
                disabled={loading || clientsQuery.isLoading}
                placeholder={
                  clientsQuery.isLoading
                    ? "Loading clients..."
                    : "Select client"
                }
              />
            </Grid.Col>
          )}
          <Grid.Col span={12}>
            <PasswordInput
              label="Password"
              placeholder={
                mode === "edit" ? "Leave blank to keep current password" : ""
              }
              {...form.getInputProps("password")}
              withAsterisk={mode === "add"}
              disabled={loading}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Switch
              label="Active"
              checked={form.values.isActive}
              onChange={(e) =>
                form.setFieldValue("isActive", e.currentTarget.checked)
              }
              disabled={loading}
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
