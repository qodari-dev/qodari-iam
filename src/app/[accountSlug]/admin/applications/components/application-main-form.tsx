import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { CreateApplicationBodySchema } from '@/schemas/application';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { generateClientId, randomBase64Url } from '@/utils/random-base64-url';

type FormValues = z.infer<typeof CreateApplicationBodySchema>;

type ApplicationMainFormProps = {
  onUploadComplete?: (key: string) => void;
  onRemoveUnsaved?: (key: string | null) => void;
};

const statusOptions: Array<{ label: string; value: FormValues['status'] }> = [
  { label: 'Activo', value: 'active' },
  { label: 'Suspendido', value: 'suspended' },
];

const clientTypeOptions: Array<{ label: string; value: FormValues['clientType'] }> = [
  { label: 'Publico', value: 'public' },
  { label: 'Confidencial', value: 'confidential' },
];

function LogoutUrlsField() {
  const form = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'logoutUrl' as never,
  });

  return (
    <Field>
      <FieldLabel>URLs de logout</FieldLabel>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Controller
              name={`logoutUrl.${index}`}
              control={form.control}
              render={({ field: inputField, fieldState }) => (
                <div className="flex-1">
                  <Input
                    {...inputField}
                    placeholder="https://example.com/logout"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              )}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar URL de logout
        </Button>
      </div>
    </Field>
  );
}

function CallbackUrlsField() {
  const form = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'callbackUrls' as never,
  });

  return (
    <Field>
      <FieldLabel>URLs de callback</FieldLabel>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Controller
              name={`callbackUrls.${index}`}
              control={form.control}
              render={({ field: inputField, fieldState }) => (
                <div className="flex-1">
                  <Input
                    {...inputField}
                    placeholder="https://example.com/callback"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              )}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar URL de callback
        </Button>
      </div>
    </Field>
  );
}

export function ApplicationMainForm({
  onRemoveUnsaved,
  onUploadComplete,
}: ApplicationMainFormProps) {
  const form = useFormContext<FormValues>();
  return (
    <FieldGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>Descripcion</FieldLabel>
            <Textarea {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="logo"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>Logo</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Se usa en el encabezado de las pantallas de autenticacion de esta aplicacion.
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="image"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>Imagen del portal</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Se muestra en la tarjeta de la aplicacion dentro del portal del usuario.
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="imageAd"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>Imagen de la pagina de auth</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Se muestra en el panel derecho del login y recuperacion de contrasena.
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="homeUrl"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>URL de inicio</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="lg:col-span-2">
        <LogoutUrlsField />
      </div>
      <Controller
        name="clientType"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Tipo de cliente</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder="Aplicacion" />
              </SelectTrigger>
              <SelectContent>
                {clientTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientJwtSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>JWT secret del cliente</FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Generar"
                  title="Generar"
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, randomBase64Url(30));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>ID de cliente</FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Generar"
                  title="Generar"
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, generateClientId('cli_'));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>Secreto del cliente</FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Generar"
                  title="Generar"
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, randomBase64Url(48));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="authCodeExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Expiracion del codigo auth</FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="accessTokenExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Expiracion del access token</FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="refreshTokenExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Expiracion del refresh token</FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="lg:col-span-2">
        <CallbackUrlsField />
      </div>
      <Controller
        name="mfaEnabled"
        control={form.control}
        render={({ field }) => (
          <Field className="lg:col-span-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FieldLabel htmlFor={field.name}>Autenticacion multifactor (MFA)</FieldLabel>
                <p className="text-muted-foreground text-sm">
                  Requiere validar identidad con un codigo enviado por correo
                </p>
              </div>
              <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
            </div>
          </Field>
        )}
      />
      <Controller
        name="status"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
