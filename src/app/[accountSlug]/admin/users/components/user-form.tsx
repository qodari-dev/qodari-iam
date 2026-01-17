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
import { CreateUserBodySchema, User } from '@/schemas/user';
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
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateUserBodySchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      status: 'pending_verification',
      isAdmin: false,
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
        status: user?.status ?? 'pending_verification',
        isAdmin: user?.isAdmin ?? false,
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
          <SheetTitle>User</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="main">Main</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
              </TabsList>
              <TabsContent value="main">
                <UserMainForm />
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
