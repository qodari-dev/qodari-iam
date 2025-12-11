'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/clients/api';
import { ResetPasswordBodySchema } from '@/schemas/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { GalleryVerticalEnd } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type ResetFormValues = z.infer<typeof ResetPasswordBodySchema>;

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const router = useRouter();

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(ResetPasswordBodySchema),
    defaultValues: {
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
      router.push('/auth/login');
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
              <Link href="/auth/forgot-password">Solicitar un nuevo enlace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Acme Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your email to get a reset link
                </p>
              </div>
              <FieldGroup>
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="reset-password">Nueva contraseña</FieldLabel>
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
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Save New Password'
                )}
              </Button>

              <Button variant="link" className="w-full" asChild>
                <Link href="/auth/login">Back to Login</Link>
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1000}
          height={1000}
        />
      </div>
    </div>
  );
}
