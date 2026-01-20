'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/clients/api';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordBodySchema } from '@/schemas/auth';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type ForgotFormValues = z.infer<typeof ForgotPasswordBodySchema>;

interface ForgetPasswordProps {
  accountSlug: string;
  appSlug?: string;
}

export default function ForgetPassword({ accountSlug, appSlug }: ForgetPasswordProps) {
  // Build login URL with app param if we have one
  const loginUrl = `/${accountSlug}/login${appSlug ? `?app=${appSlug}` : ''}`;
  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(ForgotPasswordBodySchema),
    defaultValues: {
      accountSlug,
      email: '',
    },
  });

  const { mutateAsync: forgotPassword, isPending } = api.auth.forgotPassword.useMutation({
    onError(error) {
      toast.error('Error', { description: getTsRestErrorMessage(error) });
    },
    onSuccess(data) {
      toast.success('Solicitud enviada', {
        description: data.body.message,
      });
    },
  });

  const onSubmit = useCallback(
    async (values: ForgotFormValues) => {
      await forgotPassword({
        body: values,
      });
      form.reset();
    },
    [forgotPassword, form]
  );

  return (
    <AuthLayout accountSlug={accountSlug} appSlug={appSlug}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email to get a reset link
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
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Sending...</span>
            </div>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        <Button variant="link" className="w-full" asChild>
          <Link href={loginUrl}>Back to Login</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
