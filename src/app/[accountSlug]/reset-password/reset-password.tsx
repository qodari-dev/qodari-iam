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
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type ResetFormValues = z.infer<typeof ResetPasswordBodySchema>;

interface ResetPasswordProps {
  accountSlug: string;
  appSlug?: string;
}

export default function ResetPassword({ accountSlug, appSlug }: ResetPasswordProps) {
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

  const { mutateAsync: resetPassword, isPending } = api.auth.resetPassword.useMutation({
    onError(error) {
      toast.error('Error', { description: getTsRestErrorMessage(error) });
    },
    onSuccess(data) {
      toast.success('Contraseña actualizada', {
        description: data.body.message,
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
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              El enlace para restablecer la contraseña no es válido o está incompleto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={forgotPasswordUrl}>Solicitar un nuevo enlace</Link>
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
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your new password below
          </p>
        </div>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password">New password</FieldLabel>
                <Input
                  {...field}
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
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
              <span>Saving...</span>
            </div>
          ) : (
            'Save New Password'
          )}
        </Button>

        <Button variant="link" className="w-full" asChild>
          <Link href={loginUrl}>Back to Login</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
