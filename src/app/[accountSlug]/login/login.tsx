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
import { useI18n } from '@/i18n/provider';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import Link from 'next/link';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
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
  const { locale, messages } = useI18n();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: {
      accountSlug,
      appSlug,
      email: '',
      password: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync: login, isPending } = api.auth.login.useMutation({
    onError(error) {
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
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
            <h1 className="text-2xl font-bold">{messages.auth.login.title}</h1>
            <p className="text-muted-foreground text-sm text-balance">
              {messages.auth.login.description}
            </p>
          </div>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">{messages.auth.login.email}</FieldLabel>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    placeholder={messages.auth.login.emailPlaceholder}
                  />
                  {fieldState.invalid && (
                    <FieldError
                      errors={[
                        {
                          message: getTsRestErrorMessage(
                            { message: fieldState.error?.message },
                            locale
                          ),
                        },
                      ]}
                    />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-password">{messages.auth.login.password}</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="size-4" />
                      ) : (
                        <EyeIcon className="size-4" />
                      )}
                    </button>
                  </div>
                  {fieldState.invalid && (
                    <FieldError
                      errors={[
                        {
                          message: getTsRestErrorMessage(
                            { message: fieldState.error?.message },
                            locale
                          ),
                        },
                      ]}
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>{messages.auth.login.submitting}</span>
              </div>
            ) : (
              messages.auth.login.submit
            )}
          </Button>

          <Button variant="link" className="w-full" asChild>
            <Link href={forgotPasswordUrl}>{messages.auth.login.forgotPassword}</Link>
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
