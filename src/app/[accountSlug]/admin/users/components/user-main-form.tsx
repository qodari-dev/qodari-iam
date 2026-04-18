import { Controller, useFormContext } from 'react-hook-form';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useI18n } from '@/i18n/provider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CreateUserBodySchema } from '@/schemas/user';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateUserBodySchema>;

export function UserMainForm({ isEdit }: { isEdit?: boolean }) {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();
  return (
    <FieldGroup className="">
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="email">{messages.admin.users.form.fields.email}</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="firstName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="firstName">{messages.admin.users.form.fields.firstName}</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="lastName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="lastName">{messages.admin.users.form.fields.lastName}</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="phone"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="phone">{messages.admin.users.form.fields.phone}</FieldLabel>
            <Input
              {...field}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="isAdmin"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="isAdmin">{messages.admin.users.form.fields.isAdmin}</FieldLabel>
            <div>
              <Switch
                id="isAdmin"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="isEmployee"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="isEmployee">{messages.admin.users.form.fields.isEmployee}</FieldLabel>
            <div>
              <Switch
                id="isEmployee"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="password">
              {isEdit
                ? messages.admin.users.form.fields.passwordOptional
                : messages.admin.users.form.fields.password}
            </FieldLabel>
            <Input
              {...field}
              type="password"
              autoComplete="current-password"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  { message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale) },
                ]}
              />
            )}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
