'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/clients/api';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordBodySchema } from '@/schemas/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/i18n/provider';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type ResetFormValues = z.infer<typeof ResetPasswordBodySchema>;

interface ResetPasswordProps {
  accountSlug: string;
  appSlug?: string;
}

export default function ResetPassword({ accountSlug, appSlug }: ResetPasswordProps) {
  const { locale, messages } = useI18n();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const router = useRouter();

  // Build URLs with app param if we have one
  const loginUrl = `/${accountSlug}/login${appSlug ? `?app=${appSlug}` : ''}`;
  const forgotPasswordUrl = `/${accountSlug}/forgot-password${appSlug ? `?app=${appSlug}` : ''}`;

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(ResetPasswordBodySchema),
    defaultValues: {
      accountSlug,
      token: tokenFromUrl,
      password: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync: resetPassword, isPending } = api.auth.resetPassword.useMutation({
    onError(error) {
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
    },
    onSuccess(data) {
      toast.success(messages.auth.resetPassword.successTitle, {
        description: getTsRestErrorMessage({ message: data.body.message }, locale),
      });
      router.push(loginUrl);
    },
  });

  const onSubmit = useCallback(
    async (values: ResetFormValues) => {
      await resetPassword({
        body: values,
      });
    },
    [resetPassword]
  );

  if (!tokenFromUrl) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{messages.auth.resetPassword.invalidLinkTitle}</CardTitle>
            <CardDescription>{messages.auth.resetPassword.invalidLinkDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={forgotPasswordUrl}>{messages.auth.resetPassword.requestNewLink}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthLayout accountSlug={accountSlug} appSlug={appSlug}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{messages.auth.resetPassword.title}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {messages.auth.resetPassword.description}
          </p>
        </div>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password">
                  {messages.auth.resetPassword.newPassword}
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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
              <span>{messages.auth.resetPassword.submitting}</span>
            </div>
          ) : (
            messages.auth.resetPassword.submit
          )}
        </Button>

        <Button variant="link" className="w-full" asChild>
          <Link href={loginUrl}>{messages.auth.resetPassword.backToLogin}</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
