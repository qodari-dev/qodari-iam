import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApplications } from '@/hooks/queries/use-application-queries';
import { useI18n } from '@/i18n/provider';
import { CreateRoleBodySchema } from '@/schemas/role';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateRoleBodySchema>;

export function RoleMainForm() {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();

  const { data: apps } = useApplications({ limit: 100 });
  const appOptions =
    apps?.body?.data?.map((app) => ({
      label: app.name,
      value: app.id,
    })) ?? [];

  return (
    <FieldGroup>
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{messages.admin.roles.form.fields.name}</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  {
                    message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale),
                  },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="slug"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  {
                    message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale),
                  },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.roles.form.fields.description}
            </FieldLabel>
            <Textarea {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && (
              <FieldError
                errors={[
                  {
                    message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale),
                  },
                ]}
              />
            )}
          </Field>
        )}
      />
      <Controller
        name="applicationId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.roles.form.fields.application}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder={messages.admin.roles.form.fields.applicationPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {appOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && (
              <FieldError
                errors={[
                  {
                    message: getTsRestErrorMessage({ message: fieldState.error?.message }, locale),
                  },
                ]}
              />
            )}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
