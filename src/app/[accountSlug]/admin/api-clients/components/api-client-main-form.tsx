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
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input
          id="name"
          placeholder="ej. Integracion de terceros"
          {...form.register('name')}
        />
        <FieldDescription>Nombre descriptivo para este cliente API.</FieldDescription>
        <FieldError errors={errors.name ? [errors.name] : undefined} />
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">Descripcion</FieldLabel>
        <Textarea
          id="description"
          placeholder="Descripcion opcional..."
          rows={3}
          {...form.register('description')}
        />
        <FieldDescription>
          Notas opcionales sobre el uso de este cliente API.
        </FieldDescription>
        <FieldError errors={errors.description ? [errors.description] : undefined} />
      </Field>

      <Field data-invalid={!!errors.accessTokenExp}>
        <FieldLabel htmlFor="accessTokenExp">Expiracion del access token (segundos)</FieldLabel>
        <Input
          id="accessTokenExp"
          type="number"
          min={60}
          max={3600}
          placeholder="600"
          {...form.register('accessTokenExp', { valueAsNumber: true })}
        />
        <FieldDescription>
          Tiempo de validez del access token (60-3600 seg). Por defecto: 600 seg (10 min).
        </FieldDescription>
        <FieldError errors={errors.accessTokenExp ? [errors.accessTokenExp] : undefined} />
      </Field>

      {!isEditing && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Credenciales del cliente</h4>
          <p className="text-muted-foreground mt-1 text-sm">
            Al crear este cliente API veras el client ID y el secret.
            Guarda el secret de forma segura, no se podra recuperar despues.
          </p>
        </div>
      )}
    </div>
  );
}
