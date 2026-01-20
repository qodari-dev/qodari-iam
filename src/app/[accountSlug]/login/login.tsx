'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/clients/api';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginBodySchema } from '@/schemas/auth';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type LoginFormValues = z.infer<typeof LoginBodySchema>;

interface LoginProps {
  accountSlug: string;
  appSlug: string;
  redirect?: string;
}

export default function Login({ accountSlug, appSlug, redirect }: LoginProps) {
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: {
      accountSlug,
      appSlug,
      email: '',
      password: '',
    },
  });

  const { mutateAsync: login, isPending } = api.auth.login.useMutation({
    onError(error) {
      toast.error('Error', { description: getTsRestErrorMessage(error) });
    },
  });

  const onSubmit = useCallback(
    async (values: LoginFormValues) => {
      const result = await login({
        body: values,
      });

      // Check if MFA is required
      if (result.status === 200 && 'mfaRequired' in result.body && result.body.mfaRequired) {
        const mfaUrl = new URL(`/${accountSlug}/mfa`, window.location.origin);
        mfaUrl.searchParams.set('app', appSlug);
        mfaUrl.searchParams.set('token', result.body.mfaToken);
        mfaUrl.searchParams.set('email', result.body.maskedEmail);
        if (redirect) {
          mfaUrl.searchParams.set('redirect', redirect);
        }
        router.push(mfaUrl.pathname + mfaUrl.search);
        return;
      }

      // Redirect to the specified URL or default to the portal
      const next = redirect ?? `/${accountSlug}/portal`;
      router.push(next);
    },
    [login, router, redirect, accountSlug, appSlug]
  );

  // Build forgot password URL with app param if we have one
  const forgotPasswordUrl = `/${accountSlug}/forgot-password${appSlug ? `?app=${appSlug}` : ''}`;

  return (
    <AuthLayout accountSlug={accountSlug} appSlug={appSlug}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Login to your account</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your email below to login to your account
            </p>
          </div>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="tu@email.com"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="••••••••"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Login...</span>
              </div>
            ) : (
              'Login'
            )}
          </Button>

          <Button variant="link" className="w-full" asChild>
            <Link href={forgotPasswordUrl}>Forgot your password?</Link>
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
