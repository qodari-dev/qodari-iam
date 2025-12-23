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
import { Application, CreateApplicationBodySchema } from '@/schemas/application';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApplicationMainForm } from './application-main-form';
import { ApplicationPermissionsForm } from './application-permissions-form';

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
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateApplicationBodySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      status: 'active',
      clientType: 'public',
      logo: '',
      homeUrl: '',
      logoutUrl: '',
      callbackUrl: '',
      permissions: [],
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
        logo: application?.logo ?? '',
        homeUrl: application?.homeUrl ?? '',
        logoutUrl: application?.logoutUrl ?? '',
        callbackUrl: application?.callbackUrl ?? '',
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
    onOpened(false);
  };

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{application ? 'Edit Application' : 'New Application'}</SheetTitle>
          <SheetDescription>
            Define how this application identifies, authenticates y qué permisos ofrece.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="main" className="w-full">
              <TabsList>
                <TabsTrigger value="main">Main</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              <TabsContent value="main" className="space-y-4 pt-2">
                <ApplicationMainForm />
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
            Save
          </Button>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
