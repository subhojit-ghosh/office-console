"use client";

import classes from "./LoginForm.module.css";

import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text as MantineText,
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
import { env } from "~/env";

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
    <div className={classes.container}>
      <div className={classes.paper}>
        <Title ta="center" className={classes.title}>
          {env.NEXT_PUBLIC_APP_TITLE}
        </Title>
        <MantineText className={classes.subtitle}>
          Sign in to your account to continue
        </MantineText>
        <Paper withBorder shadow="lg" p={32} radius="md">
          <form onSubmit={form.onSubmit(submitHandler)}>
            <TextInput
              label="Email"
              placeholder="your@email.com"
              withAsterisk
              key={form.key("email")}
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
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
              size="md"
            >
              Sign In
            </Button>
          </form>
        </Paper>
      </div>
    </div>
  );
}
