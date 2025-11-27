"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { api } from "@/clients/api";
import { LoginBodySchema } from "@/schemas/auth";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useCallback } from "react";
import { getTsRestErrorMessage } from "@/utils/get-ts-rest-error-message";

type LoginFormValues = z.infer<typeof LoginBodySchema>;

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutateAsync: login, isPending } = api.auth.login.useMutation({
    onError(error) {
      console.log(error);
      toast.error("Error", { description: getTsRestErrorMessage(error) });
    },
  });

  const onSubmit = useCallback(
    async (values: LoginFormValues) => {
      const result = await login({
        body: values,
      });

      const data = result.body;
      console.log(data);
      const next = searchParams.get("next") ?? "/";
      router.push(next);
    },
    [login, router, searchParams],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa con tu cuenta de Qodari IAM.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="tu@email.com"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" />
                  <span>Ingresando...</span>
                </div>
              ) : (
                "Ingresar"
              )}
            </Button>

            <Button variant="link" className="w-full" asChild>
              <Link href="/auth/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
