'use client';

import { api } from '@/clients/api';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useImageUploadWithCleanup } from '@/hooks/use-image-upload-with-cleanup';
import { UpdateAccountBodySchema } from '@/schemas/account';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof UpdateAccountBodySchema>;

export function AccountSettings() {
  const { data, isLoading } = api.account.get.useQuery({
    queryKey: ['account'],
    queryData: {},
  });

  const { onUploadComplete, onRemoveUnsaved, markAsSaved } = useImageUploadWithCleanup();

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateAccountBodySchema),
    defaultValues: {
      name: '',
      logo: null,
      imageAd: null,
    },
  });

  useEffect(() => {
    if (data?.body) {
      form.reset({
        name: data.body.name,
        logo: data.body.logo,
        imageAd: data.body.imageAd,
      });
    }
  }, [data, form]);

  const { mutateAsync: updateAccount, isPending } = api.account.update.useMutation({
    onError(error) {
      toast.error('Error', { description: getTsRestErrorMessage(error) });
    },
    onSuccess() {
      toast.success('Settings saved', {
        description: 'Account settings have been updated successfully.',
      });
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      await updateAccount({ body: values });
      markAsSaved([values.logo, values.imageAd]);
    },
    [updateAccount, markAsSaved]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Account Settings"
        description="Manage your account branding and appearance settings."
      />
      <PageContent>
        <div className="max-w-xl">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Account Name</FieldLabel>
                    <Input {...field} value={field.value ?? ''} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="logo"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Logo</FieldLabel>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Used in the header of authentication pages.
                    </p>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onUploadComplete={onUploadComplete}
                      onRemoveUnsaved={onRemoveUnsaved}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="imageAd"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Auth Page Image</FieldLabel>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Shown in the right panel of login and password reset pages.
                    </p>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onUploadComplete={onUploadComplete}
                      onRemoveUnsaved={onRemoveUnsaved}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </PageContent>
    </>
  );
}
