'use client';

import { api } from '@/clients/api';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useImageUploadWithCleanup } from '@/hooks/use-image-upload-with-cleanup';
import { useI18n } from '@/i18n/provider';
import { ACCOUNT_IMAGE_AD_UPLOAD_TYPE, ACCOUNT_LOGO_UPLOAD_TYPE } from '@/lib/upload';
import { UpdateAccountBodySchema } from '@/schemas/account';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof UpdateAccountBodySchema>;

export function AccountSettings() {
  const { locale, messages } = useI18n();
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
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
    },
    onSuccess() {
      toast.success(messages.admin.settings.toast.savedTitle, {
        description: messages.admin.settings.toast.savedDescription,
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
        title={messages.admin.settings.title}
        description={messages.admin.settings.description}
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
                    <FieldLabel htmlFor={field.name}>
                      {messages.admin.settings.fields.name}
                    </FieldLabel>
                    <Input {...field} value={field.value ?? ''} aria-invalid={fieldState.invalid} />
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
                name="logo"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{messages.admin.settings.fields.logo}</FieldLabel>
                    <p className="text-muted-foreground mb-2 text-sm">
                      {messages.admin.settings.fields.logoDescription}
                    </p>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      uploadType={ACCOUNT_LOGO_UPLOAD_TYPE}
                      onUploadComplete={onUploadComplete}
                      onRemoveUnsaved={onRemoveUnsaved}
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
                name="imageAd"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {messages.admin.settings.fields.authImage}
                    </FieldLabel>
                    <p className="text-muted-foreground mb-2 text-sm">
                      {messages.admin.settings.fields.authImageDescription}
                    </p>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      uploadType={ACCOUNT_IMAGE_AD_UPLOAD_TYPE}
                      onUploadComplete={onUploadComplete}
                      onRemoveUnsaved={onRemoveUnsaved}
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
            </FieldGroup>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span>{messages.admin.settings.actions.saving}</span>
                  </div>
                ) : (
                  messages.admin.settings.actions.save
                )}
              </Button>
            </div>
          </form>
        </div>
      </PageContent>
    </>
  );
}
