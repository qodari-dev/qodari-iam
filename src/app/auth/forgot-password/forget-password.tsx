'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/clients/api';
import { ForgotPasswordBodySchema } from '@/schemas/auth';

import { Button } from '@/components/ui/button';
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

type ForgotFormValues = z.infer<typeof ForgotPasswordBodySchema>;

export default function ForgetPassword() {
  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(ForgotPasswordBodySchema),
    defaultValues: {
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
                    <span>Login...</span>
                  </div>
                ) : (
                  'Forget Password'
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
