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
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useI18n } from '@/i18n/provider';
import { toast } from 'sonner';

type Props = {
  opened: boolean;
  onOpened(opened: boolean): void;
};

type FormValues = z.infer<typeof ChangePasswordBodySchema>;

export function ChangePasswordDialog({ opened, onOpened }: Props) {
  const { locale, messages } = useI18n();
  const form = useForm<FormValues>({
    resolver: zodResolver(ChangePasswordBodySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { mutateAsync: changePassword, isPending } = api.auth.changePassword.useMutation({
    onError(error) {
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
    },
    onSuccess() {
      toast.success(messages.auth.changePassword.successTitle);
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
            <DialogTitle>{messages.auth.changePassword.title}</DialogTitle>
            <DialogDescription>{messages.auth.changePassword.description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="current-password">
                    {messages.auth.changePassword.currentPassword}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id="current-password"
                      type={showCurrent ? 'text' : 'password'}
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
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
          <FieldGroup>
            <Controller
              name="newPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-password">
                    {messages.auth.changePassword.newPassword}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
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
          <FieldGroup>
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="confirm-password">
                    {messages.auth.changePassword.confirmPassword}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
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

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{messages.common.cancel}</Button>
            </DialogClose>
            <Button type="submit">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  {messages.auth.changePassword.submitting}
                </span>
              ) : (
                messages.auth.changePassword.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
