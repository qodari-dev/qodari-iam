'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreateApiClientBodySchema } from '@/schemas/api-client';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateApiClientBodySchema>;

export function ApiClientMainForm({ isEditing }: { isEditing: boolean }) {
  const form = useFormContext<FormValues>();
  const errors = form.formState.errors;

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          placeholder="e.g., Third Party Integration"
          {...form.register('name')}
        />
        <FieldDescription>A descriptive name for this API client.</FieldDescription>
        <FieldError errors={errors.name ? [errors.name] : undefined} />
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Optional description..."
          rows={3}
          {...form.register('description')}
        />
        <FieldDescription>
          Optional notes about what this API client is used for.
        </FieldDescription>
        <FieldError errors={errors.description ? [errors.description] : undefined} />
      </Field>

      <Field data-invalid={!!errors.accessTokenExp}>
        <FieldLabel htmlFor="accessTokenExp">Access Token Expiration (seconds)</FieldLabel>
        <Input
          id="accessTokenExp"
          type="number"
          min={60}
          max={3600}
          placeholder="600"
          {...form.register('accessTokenExp', { valueAsNumber: true })}
        />
        <FieldDescription>
          How long access tokens are valid (60-3600 seconds). Default is 600 seconds (10 minutes).
        </FieldDescription>
        <FieldError errors={errors.accessTokenExp ? [errors.accessTokenExp] : undefined} />
      </Field>

      {!isEditing && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Client Credentials</h4>
          <p className="text-muted-foreground mt-1 text-sm">
            After creating this API client, you will be shown the client ID and secret.
            Make sure to save the secret securely - it cannot be retrieved later.
          </p>
        </div>
      )}
    </div>
  );
}
