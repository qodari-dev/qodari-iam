'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
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
import { useCreateRole, useUpdateRole } from '@/hooks/queries/use-role-queries';
import { CreateRoleBodySchema, Role } from '@/schemas/role';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { RoleMainForm } from './role-main-form';
import { RolePermissionsForm } from './role-permissions-form';

type FormValues = z.infer<typeof CreateRoleBodySchema>;

export function RoleForm({
  role,
  opened,
  onOpened,
}: {
  role: Role | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { locale, messages } = useI18n();
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateRoleBodySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      applicationId: '',
      permissions: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: role?.name ?? '',
        slug: role?.slug ?? '',
        description: role?.description ?? '',
        applicationId: role?.applicationId ?? '',
        permissions:
          role?.rolePermissions?.map((rp) => ({
            permissionId: rp.permissionId,
          })) ?? [],
      });
    }
  }, [opened, role, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateRole();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateRole();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      slug: values.slug.trim().toLowerCase(),
    };
    if (role) {
      await update({ params: { id: role.id }, body: payload });
    } else {
      await create({ body: payload });
    }
    onOpened(false);
  };

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {role ? messages.admin.roles.form.editTitle : messages.admin.roles.form.createTitle}
          </SheetTitle>
          <SheetDescription>{messages.admin.roles.form.description}</SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit, (errors) => onSubmitError(errors, undefined, locale))}
            className="px-4"
          >
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="main">{messages.admin.roles.form.tabs.general}</TabsTrigger>
                <TabsTrigger value="permissions">
                  {messages.admin.roles.form.tabs.permissions}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="main">
                <RoleMainForm />
              </TabsContent>

              <TabsContent value="permissions">
                <RolePermissionsForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            {messages.admin.roles.form.actions.save}
          </Button>
          <SheetClose asChild>
            <Button variant="outline">{messages.admin.roles.form.actions.close}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
