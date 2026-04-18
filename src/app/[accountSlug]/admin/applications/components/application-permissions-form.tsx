'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import {
  CreateApplicationBodySchema,
  PermissionInput,
  PermissionInputSchema,
} from '@/schemas/application';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateApplicationBodySchema>;

export function ApplicationPermissionsForm() {
  const { locale, messages } = useI18n();
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'permissions',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<PermissionInput>({
    resolver: zodResolver(PermissionInputSchema),
    defaultValues: { name: '', resource: '', action: '', description: '' },
  });

  const hasPermissions = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({ name: '', resource: '', action: '', description: '' });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      name: current?.name ?? '',
      resource: current?.resource ?? '',
      action: current?.action ?? '',
      description: current?.description ?? '',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: PermissionInput) => {
    const isDuplicate = fields.some(
      (f, idx) =>
        f.resource === values.resource && f.action === values.action && idx !== editingIndex
    );

    if (isDuplicate) {
      toast.error(messages.admin.applications.form.permissions.duplicateError);
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{messages.admin.applications.form.permissions.title}</p>
          <p className="text-muted-foreground text-sm">
            {messages.admin.applications.form.permissions.description}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              {messages.admin.applications.form.permissions.add}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null
                  ? messages.admin.applications.form.permissions.editTitle
                  : messages.admin.applications.form.permissions.addTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="name"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="permName">
                      {messages.admin.applications.form.permissions.fields.name}
                    </FieldLabel>
                    <Input id="permName" {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.error && (
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
              <Controller
                name="resource"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="permResource">
                      {messages.admin.applications.form.permissions.fields.resource}
                    </FieldLabel>
                    <Input id="permResource" {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.error && (
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
              <Controller
                name="action"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="permAction">
                      {messages.admin.applications.form.permissions.fields.action}
                    </FieldLabel>
                    <Input id="permAction" {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.error && (
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
              <Controller
                name="description"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="permDescription">
                      {messages.admin.applications.form.permissions.fields.description}
                    </FieldLabel>
                    <Textarea
                      id="permDescription"
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="min-h-20"
                    />
                    {fieldState.error && (
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
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {messages.common.cancel}
                </Button>
              </DialogClose>
              <Button type="button" onClick={dialogForm.handleSubmit(onSave)}>
                {editingIndex !== null
                  ? messages.admin.applications.form.permissions.saveChanges
                  : messages.admin.applications.form.permissions.add}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasPermissions ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.admin.applications.form.permissions.table.name}</TableHead>
              <TableHead>{messages.admin.applications.form.permissions.table.resource}</TableHead>
              <TableHead>{messages.admin.applications.form.permissions.table.action}</TableHead>
              <TableHead className="w-[120px] text-right">
                {messages.admin.applications.form.permissions.table.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{field.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.resource}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.action}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditClick(index)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">
                      {messages.admin.applications.form.permissions.table.edit}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">
                      {messages.admin.applications.form.permissions.table.delete}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          {messages.admin.applications.form.permissions.empty}
        </div>
      )}
    </div>
  );
}
