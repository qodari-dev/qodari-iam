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
import { Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { Switch } from '@/components/ui/switch';

type FormValues = z.infer<typeof CreateApplicationBodySchema>;

type ApplicationMainFormProps = {
  onUploadComplete?: (key: string) => void;
  onRemoveUnsaved?: (key: string | null) => void;
};

const statusOptions: Array<{ label: string; value: FormValues['status'] }> = [
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

const clientTypeOptions: Array<{ label: string; value: FormValues['clientType'] }> = [
  { label: 'Public', value: 'public' },
  { label: 'Confidential', value: 'confidential' },
];

function CallbackUrlsField() {
  const form = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'callbackUrls' as never,
  });

  return (
    <Field>
      <FieldLabel>Callback URLs</FieldLabel>
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
          Add Callback URL
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
    <FieldGroup>
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Name</FieldLabel>
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
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Description</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientType"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Client Type</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder="Application" />
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
        name="clientId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Client ID</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Client Secret</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="authCodeExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Auth Code Expiration</FieldLabel>
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
            <FieldLabel htmlFor={field.name}>Access Token Expiration</FieldLabel>
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
            <FieldLabel htmlFor={field.name}>Refresh Token Expiration</FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="clientJwtSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Client JWT Secret</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="logo"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Logo</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Used in the header of authentication pages for this app.
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
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Portal Image</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Shown in the app card on the user portal.
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
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Auth Page Image</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              Shown in the right panel of login and password reset pages.
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
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Home URL</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="logoutUrl"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Logout URL</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <CallbackUrlsField />
      <Controller
        name="mfaEnabled"
        control={form.control}
        render={({ field }) => (
          <Field>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FieldLabel htmlFor={field.name}>Multi-Factor Authentication (MFA)</FieldLabel>
                <p className="text-muted-foreground text-sm">
                  Require users to verify their identity with a code sent to their email
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
            <FieldLabel htmlFor={field.name}>Status</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder="Status" />
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
