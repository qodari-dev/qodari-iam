'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { useI18n } from '@/i18n/provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreateApiClientBodySchema } from '@/schemas/api-client';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateApiClientBodySchema>;

export function ApiClientMainForm({ isEditing }: { isEditing: boolean }) {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();
  const errors = form.formState.errors;

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">{messages.admin.apiClients.form.fields.name}</FieldLabel>
        <Input
          id="name"
          placeholder={messages.admin.apiClients.form.fields.namePlaceholder}
          {...form.register('name')}
        />
        <FieldDescription>{messages.admin.apiClients.form.fields.nameDescription}</FieldDescription>
        {errors.name && (
          <FieldError
            errors={[{ message: getTsRestErrorMessage({ message: errors.name.message }, locale) }]}
          />
        )}
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">{messages.admin.apiClients.form.fields.description}</FieldLabel>
        <Textarea
          id="description"
          placeholder={messages.admin.apiClients.form.fields.descriptionPlaceholder}
          rows={3}
          {...form.register('description')}
        />
        <FieldDescription>{messages.admin.apiClients.form.fields.descriptionDescription}</FieldDescription>
        {errors.description && (
          <FieldError
            errors={[
              {
                message: getTsRestErrorMessage({ message: errors.description.message }, locale),
              },
            ]}
          />
        )}
      </Field>

      <Field data-invalid={!!errors.accessTokenExp}>
        <FieldLabel htmlFor="accessTokenExp">
          {messages.admin.apiClients.form.fields.accessTokenExp}
        </FieldLabel>
        <Input
          id="accessTokenExp"
          type="number"
          min={60}
          max={3600}
          placeholder={messages.admin.apiClients.form.fields.accessTokenExpPlaceholder}
          {...form.register('accessTokenExp', { valueAsNumber: true })}
        />
        <FieldDescription>
          {messages.admin.apiClients.form.fields.accessTokenExpDescription}
        </FieldDescription>
        {errors.accessTokenExp && (
          <FieldError
            errors={[
              {
                message: getTsRestErrorMessage(
                  { message: errors.accessTokenExp.message },
                  locale
                ),
              },
            ]}
          />
        )}
      </Field>

      {!isEditing && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h4 className="text-sm font-medium">{messages.admin.apiClients.form.initialCredentials.title}</h4>
          <p className="text-muted-foreground mt-1 text-sm">
            {messages.admin.apiClients.form.initialCredentials.description}
          </p>
        </div>
      )}
    </div>
  );
}
