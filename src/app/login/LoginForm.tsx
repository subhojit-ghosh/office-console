"use client";

import classes from "./LoginForm.module.css";

import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: zodResolver(
      z.object({
        email: z
          .string()
          .email({ message: "Invalid email" })
          .nonempty("Email is required"),
        password: z.string().nonempty("Password is required"),
      }),
    ),
  });

  const submitHandler = async () => {
    setIsLoading(true);
    const res = await signIn("credentials", {
      email: form.values.email,
      password: form.values.password,
      redirect: false,
    });

    if (res?.error) {
      form.setFieldError("api", "Invalid email or password");
    } else {
      notifications.show({
        message: "Login successful. Redirecting to dashboard...",
        color: "green",
      });
      router.push("/dashboard");
    }
    setIsLoading(false);
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
        Office Console
      </Title>
      <Paper withBorder shadow="sm" p={22} mt={30}>
        <form onSubmit={form.onSubmit(submitHandler)}>
          <TextInput
            label="Email"
            withAsterisk
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            mt="md"
            withAsterisk
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          {!!form.errors.api && (
            <Alert
              variant="light"
              color="red"
              title={form.errors.api}
              icon={<IconInfoCircle />}
              mt="xl"
            />
          )}
          <Button
            fullWidth
            mt="xl"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            Login
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
