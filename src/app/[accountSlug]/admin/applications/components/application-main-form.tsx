import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { CreateApplicationBodySchema } from '@/schemas/application';
import { useI18n } from '@/i18n/provider';
import {
  APPLICATION_IMAGE_AD_UPLOAD_TYPE,
  APPLICATION_IMAGE_UPLOAD_TYPE,
  APPLICATION_LOGO_UPLOAD_TYPE,
} from '@/lib/upload';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

type ApplicationMainFormProps = {
  onUploadComplete?: (key: string) => void;
  onRemoveUnsaved?: (key: string | null) => void;
};

function LogoutUrlsField() {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'logoutUrl' as never,
  });

  return (
    <Field>
      <FieldLabel>{messages.admin.applications.form.fields.logoutUrls}</FieldLabel>
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
          {messages.admin.applications.form.fields.addLogoutUrl}
        </Button>
      </div>
    </Field>
  );
}

function CallbackUrlsField() {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'callbackUrls' as never,
  });

  return (
    <Field>
      <FieldLabel>{messages.admin.applications.form.fields.callbackUrls}</FieldLabel>
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
          {messages.admin.applications.form.fields.addCallbackUrl}
        </Button>
      </div>
    </Field>
  );
}

export function ApplicationMainForm({
  onRemoveUnsaved,
  onUploadComplete,
}: ApplicationMainFormProps) {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();
  const lastAutoSlug = useRef('');
  const name = useWatch({ control: form.control, name: 'name' });

  useEffect(() => {
    const currentSlug = form.getValues('slug');
    if (currentSlug === '' || currentSlug === lastAutoSlug.current) {
      const generated = toSlug(name);
      lastAutoSlug.current = generated;
      form.setValue('slug', generated, { shouldValidate: false });
    }
  }, [name, form]);

  const statusOptions: Array<{ label: string; value: FormValues['status'] }> = [
    { label: messages.admin.applications.form.options.status.active, value: 'active' },
    { label: messages.admin.applications.form.options.status.suspended, value: 'suspended' },
  ];

  const clientTypeOptions: Array<{ label: string; value: FormValues['clientType'] }> = [
    { label: messages.admin.applications.form.options.clientType.public, value: 'public' },
    {
      label: messages.admin.applications.form.options.clientType.confidential,
      value: 'confidential',
    },
  ];

  return (
    <FieldGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{messages.admin.applications.form.fields.name}</FieldLabel>
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
        name="slug"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
            <InputGroup>
              <InputGroupInput
                {...field}
                aria-invalid={fieldState.invalid}
                className="font-mono text-sm"
                onChange={(e) => {
                  lastAutoSlug.current = '';
                  field.onChange(e);
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={messages.common.generate}
                  title={messages.common.generate}
                  size="icon-xs"
                  onClick={() => {
                    const generated = toSlug(form.getValues('name'));
                    lastAutoSlug.current = generated;
                    form.setValue('slug', generated, { shouldValidate: true });
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
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
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.description}
            </FieldLabel>
            <Textarea {...field} aria-invalid={fieldState.invalid} />
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
        name="logo"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>{messages.admin.applications.form.fields.logo}</FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              {messages.admin.applications.form.fields.logoDescription}
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              uploadType={APPLICATION_LOGO_UPLOAD_TYPE}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
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
        name="image"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.portalImage}
            </FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              {messages.admin.applications.form.fields.portalImageDescription}
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              uploadType={APPLICATION_IMAGE_UPLOAD_TYPE}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
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
        name="imageAd"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.authImage}
            </FieldLabel>
            <p className="text-muted-foreground mb-2 text-sm">
              {messages.admin.applications.form.fields.authImageDescription}
            </p>
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              uploadType={APPLICATION_IMAGE_AD_UPLOAD_TYPE}
              onUploadComplete={onUploadComplete}
              onRemoveUnsaved={onRemoveUnsaved}
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
        name="homeUrl"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.homeUrl}
            </FieldLabel>
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
      <div className="lg:col-span-2">
        <LogoutUrlsField />
      </div>
      <Controller
        name="clientType"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.clientType}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue
                  placeholder={messages.admin.applications.form.fields.clientTypePlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {clientTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        name="clientJwtSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.clientJwtSecret}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={messages.common.generate}
                  title={messages.common.generate}
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, randomBase64Url(30));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
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
        name="clientId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.clientId}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={messages.common.generate}
                  title={messages.common.generate}
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, generateClientId('cli_'));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
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
        name="clientSecret"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.clientSecret}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={messages.common.generate}
                  title={messages.common.generate}
                  size="icon-xs"
                  onClick={() => {
                    form.setValue(field.name, randomBase64Url(48));
                  }}
                >
                  <RefreshCw />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
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
        name="authCodeExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.authCodeExp}
            </FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
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
        name="accessTokenExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.accessTokenExp}
            </FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
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
        name="refreshTokenExp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {messages.admin.applications.form.fields.refreshTokenExp}
            </FieldLabel>
            <Input {...field} type="number" aria-invalid={fieldState.invalid} />
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
                <FieldLabel htmlFor={field.name}>
                  {messages.admin.applications.form.fields.mfa}
                </FieldLabel>
                <p className="text-muted-foreground text-sm">
                  {messages.admin.applications.form.fields.mfaDescription}
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
            <FieldLabel htmlFor={field.name}>{messages.admin.applications.form.fields.status}</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="">
                <SelectValue placeholder={messages.admin.applications.form.fields.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
