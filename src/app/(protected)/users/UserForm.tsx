"use client";

import {
  Button,
  Grid,
  Group,
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
import { useEffect, useState } from "react";
import { createUserSchema, updateUserSchema } from "~/schemas/user.schema";

import { api } from "~/trpc/react";

export const userRoleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
  { value: "CLIENT", label: "Client" },
];

interface Props {
  mode: "add" | "edit";
  opened: boolean;
  close: () => void;
  initialData?: User | null;
}

export default function UserForm({ mode, opened, close, initialData }: Props) {
  const utils = api.useUtils();
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

  const clientsQuery = api.clients.getAll.useQuery({ page: 1, pageSize: 100 });

  useEffect(() => {
    if (mode === "add") {
      form.reset();
    }
    if (mode === "edit" && initialData) {
      form.setValues({
        id: initialData.id,
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        password: "",
        isActive: initialData.isActive,
        clientId: initialData.clientId ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, opened]);

  const createUser = api.users.create.useMutation({
    onSuccess: async () => {
      notifications.show({
        message: "User has been created successfully.",
        color: "green",
      });
      await utils.users.getAll.invalidate();
      setLoading(false);
      close();
    },
    onError: (error) => {
      console.log(JSON.parse(JSON.stringify(error)));
      const zodErrors = error.shape?.data?.zodError;

      if (zodErrors) {
        const fieldErrors = Object.entries(zodErrors.fieldErrors);
        console.log("Zod Errors:", fieldErrors);
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
      await utils.users.getAll.invalidate();
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
      createUser.mutate({
        name: values.name,
        email: values.email,
        role: values.role as User["role"],
        password: values.password,
        isActive: values.isActive,
        clientId: values.role === UserRole.CLIENT ? values.clientId : undefined,
      });
    } else if (mode === "edit" && initialData) {
      updateUser.mutate({
        id: values.id,
        name: values.name,
        email: values.email,
        role: values.role as User["role"],
        password: values.password || undefined,
        isActive: values.isActive,
        clientId: values.role === UserRole.CLIENT ? values.clientId : undefined,
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
              data={userRoleOptions}
              {...form.getInputProps("role")}
              withAsterisk
              disabled={loading}
            />
          </Grid.Col>
          {form.values.role === UserRole.CLIENT && (
            <Grid.Col span={12}>
              <Select
                label="Client"
                data={
                  clientsQuery.data?.clients.map((c) => ({
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
