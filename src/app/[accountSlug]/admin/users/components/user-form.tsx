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
import { useCreateUser, useUpdateUser } from '@/hooks/queries/use-user-queries';
import { useI18n } from '@/i18n/provider';
import { CreateUserBodySchema, UpdateUserBodySchema, User } from '@/schemas/user';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { UserMainForm } from './user-main-form';
import { UserRolesForm } from './user-roles-form';

type FormValues = z.infer<typeof CreateUserBodySchema>;

export function UserForm({
  user,
  opened,
  onOpened,
}: {
  user: User | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { locale, messages } = useI18n();
  const formId = useId();

  const schema = useMemo(() => (user ? UpdateUserBodySchema : CreateUserBodySchema), [user]);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      status: 'active',
      isAdmin: false,
      isEmployee: false,
      roles: [],
      password: '',
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        email: user?.email ?? '',
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        phone: user?.phone ?? '',
        status: user?.status ?? 'active',
        isAdmin: user?.isAdmin ?? false,
        isEmployee: user?.isEmployee ?? false,
        roles: user?.userRoles?.map(({ roleId }) => ({ roleId })) ?? [],
        password: '',
      });
    }
  }, [opened, user, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateUser();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateUser();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (user) {
        await update({ params: { id: user.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [user, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {user ? messages.admin.users.form.editTitle : messages.admin.users.form.createTitle}
          </SheetTitle>
          <SheetDescription>{messages.admin.users.form.description}</SheetDescription>
        </SheetHeader>
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
                <TabsTrigger value="main">{messages.admin.users.form.tabs.general}</TabsTrigger>
                <TabsTrigger value="roles">{messages.admin.users.form.tabs.roles}</TabsTrigger>
              </TabsList>
              <TabsContent value="main">
                <UserMainForm isEdit={!!user} />
              </TabsContent>
              <TabsContent value="roles">
                <UserRolesForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            {messages.admin.users.form.actions.save}
          </Button>
          <SheetClose asChild>
            <Button variant="outline">{messages.admin.users.form.actions.close}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
