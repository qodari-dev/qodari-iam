'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateApplication,
  useUpdateApplication,
} from '@/hooks/queries/use-application-queries';
import { useI18n } from '@/i18n/provider';
import { Application, CreateApplicationBodySchema } from '@/schemas/application';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApplicationMainForm } from './application-main-form';
import { ApplicationPermissionsForm } from './application-permissions-form';
import { useImageUploadWithCleanup } from '@/hooks/use-image-upload-with-cleanup';

type FormValues = z.infer<typeof CreateApplicationBodySchema>;

export function ApplicationForm({
  application,
  opened,
  onOpened,
}: {
  application: Application | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { locale, messages } = useI18n();
  const formId = useId();
  const { onUploadComplete, onRemoveUnsaved, markAsSaved } = useImageUploadWithCleanup();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateApplicationBodySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      status: 'active',
      clientType: 'public',
      clientId: '',
      clientSecret: '',
      clientJwtSecret: '',
      authCodeExp: 300,
      accessTokenExp: 900,
      refreshTokenExp: 604800,
      logo: null,
      image: null,
      imageAd: null,
      homeUrl: '',
      logoutUrl: [],
      callbackUrls: [],
      permissions: [],
      mfaEnabled: false,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: application?.name ?? '',
        slug: application?.slug ?? '',
        description: application?.description ?? '',
        status: application?.status ?? 'active',
        clientType: application?.clientType ?? 'public',
        clientId: application?.clientId ?? '',
        clientSecret: application?.clientSecret ?? '',
        clientJwtSecret: application?.clientJwtSecret ?? '',
        authCodeExp: application?.authCodeExp ?? 300,
        accessTokenExp: application?.accessTokenExp ?? 900,
        refreshTokenExp: application?.refreshTokenExp ?? 604800,
        logo: application?.logo ?? null,
        image: application?.image ?? null,
        imageAd: application?.imageAd ?? null,
        homeUrl: application?.homeUrl ?? '',
        logoutUrl: application?.logoutUrl ?? [],
        callbackUrls: application?.callbackUrls ?? [],
        mfaEnabled: application?.mfaEnabled ?? false,
        permissions:
          application?.permissions?.map((p) => ({
            name: p.name,
            resource: p.resource,
            action: p.action,
            description: p.description ?? '',
          })) ?? [],
      });
    }
  }, [opened, application, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateApplication();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateApplication();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      slug: values.slug.trim().toLowerCase(),
    };
    if (application) {
      await update({ params: { id: application.id }, body: payload });
    } else {
      await create({ body: payload });
    }
    markAsSaved([values.logo, values.image, values.imageAd]);
    onOpened(false);
  };

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {application
              ? messages.admin.applications.form.editTitle
              : messages.admin.applications.form.createTitle}
          </SheetTitle>
          <SheetDescription>{messages.admin.applications.form.description}</SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit, (errors) => onSubmitError(errors, undefined, locale))}
            className="px-4"
          >
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="main">{messages.admin.applications.form.tabs.general}</TabsTrigger>
                <TabsTrigger value="permissions">
                  {messages.admin.applications.form.tabs.permissions}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="main" className="space-y-4 pt-2">
                <ApplicationMainForm
                  onRemoveUnsaved={onRemoveUnsaved}
                  onUploadComplete={onUploadComplete}
                />
              </TabsContent>

              <TabsContent value="permissions" className="pt-2">
                <ApplicationPermissionsForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            {messages.admin.applications.form.actions.save}
          </Button>
          <SheetClose asChild>
            <Button variant="outline">{messages.admin.applications.form.actions.close}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
