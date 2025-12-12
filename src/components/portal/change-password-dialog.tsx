import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChangePasswordBodySchema } from '@/schemas/auth';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

type Props = {
  opened: boolean;
  onOpened(opened: boolean): void;
};

type FormValues = z.infer<typeof ChangePasswordBodySchema>;

export function ChangePasswordDialog({ opened, onOpened }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(ChangePasswordBodySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { mutateAsync: changePassword, isPending } = api.auth.changePassword.useMutation({
    onError(error) {
      toast.error('Error', { description: getTsRestErrorMessage(error) });
    },
    onSuccess() {
      toast.success('Contraseña actualizada');
      form.reset();
      onOpened(false);
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      await changePassword({
        body: values,
      });
    },
    [changePassword]
  );

  return (
    <Dialog open={opened} onOpenChange={onOpened}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Provide a info</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
                  <Input
                    {...field}
                    id="current-password"
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="••••••••"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <FieldGroup>
            <Controller
              name="newPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <Input
                    {...field}
                    id="new-password"
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
          <FieldGroup>
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  <Input
                    {...field}
                    id="confirm-password"
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="••••••••"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Updating
                </span>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
