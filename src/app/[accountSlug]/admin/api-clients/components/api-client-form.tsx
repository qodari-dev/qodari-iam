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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useCreateApiClient, useUpdateApiClient } from '@/hooks/queries/use-api-client-queries';
import { useI18n } from '@/i18n/provider';
import { ApiClientItem, CreateApiClientBodySchema } from '@/schemas/api-client';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiClientMainForm } from './api-client-main-form';
import { ApiClientRolesForm } from './api-client-roles-form';
import { ApiClientCredentials } from './api-client-credentials';

type FormValues = z.infer<typeof CreateApiClientBodySchema>;

export function ApiClientForm({
  apiClient,
  opened,
  onOpened,
}: {
  apiClient: ApiClientItem | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { locale, messages } = useI18n();
  const formId = useId();
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateApiClientBodySchema),
    defaultValues: {
      name: '',
      description: '',
      accessTokenExp: 600,
      roleIds: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: apiClient?.name ?? '',
        description: apiClient?.description ?? '',
        accessTokenExp: apiClient?.accessTokenExp ?? 600,
        roleIds: (apiClient?.roles as { roleId: string }[] | undefined)?.map((r) => r.roleId) ?? [],
      });
    }
  }, [opened, apiClient, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateApiClient();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateApiClient();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (apiClient) {
        await update({ params: { id: apiClient.id }, body: values });
        onOpened(false);
      } else {
        const result = await create({ body: values });
        if (result.status === 201) {
          // Show credentials after creation
          setCreatedCredentials({
            clientId: result.body.clientId,
            clientSecret: result.body.clientSecret,
          });
        }
      }
    },
    [apiClient, create, update, onOpened]
  );

  const handleClose = useCallback(() => {
    setCreatedCredentials(null);
    onOpened(false);
  }, [onOpened]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCreatedCredentials(null);
      }
      onOpened(open);
    },
    [onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {apiClient
              ? messages.admin.apiClients.form.editTitle
              : messages.admin.apiClients.form.createTitle}
          </SheetTitle>
          <SheetDescription>
            {apiClient
              ? messages.admin.apiClients.form.editDescription
              : messages.admin.apiClients.form.createDescription}
          </SheetDescription>
        </SheetHeader>

        {createdCredentials ? (
          <ApiClientCredentials
            clientId={createdCredentials.clientId}
            clientSecret={createdCredentials.clientSecret}
            onClose={handleClose}
          />
        ) : (
          <>
            <FormProvider {...form}>
              <form
                id={formId}
                onSubmit={form.handleSubmit(onSubmit, (errors) =>
                  onSubmitError(errors, undefined, locale)
                )}
                className="px-4"
              >
                <Tabs defaultValue="main" className="w-full">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="main">{messages.admin.apiClients.form.tabs.general}</TabsTrigger>
                    <TabsTrigger value="roles">{messages.admin.apiClients.form.tabs.roles}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="main">
                    <ApiClientMainForm isEditing={!!apiClient} />
                  </TabsContent>
                  <TabsContent value="roles">
                    <ApiClientRolesForm />
                  </TabsContent>
                </Tabs>
              </form>
            </FormProvider>

            <SheetFooter>
              <Button type="submit" form={formId} disabled={isLoading}>
                {isLoading && <Spinner />}
                {apiClient
                  ? messages.admin.apiClients.form.actions.save
                  : messages.admin.apiClients.form.actions.create}
              </Button>
              <SheetClose asChild>
                <Button variant="outline">{messages.admin.apiClients.form.actions.cancel}</Button>
              </SheetClose>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
