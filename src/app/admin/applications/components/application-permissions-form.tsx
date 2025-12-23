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
import { cn } from '@/lib/utils';
import { CreateApplicationBodySchema } from '@/schemas/application';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateApplicationBodySchema>;

export function ApplicationPermissionsForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'permissions',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    resource: '',
    action: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const hasPermissions = useMemo(() => fields.length > 0, [fields.length]);

  const resetDialog = useCallback(() => {
    setDraft({ name: '', resource: '', action: '', description: '' });
    setEditingIndex(null);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) resetDialog();
    },
    [resetDialog]
  );

  const handleAddClick = () => {
    resetDialog();
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    setDraft({
      name: current?.name ?? '',
      resource: current?.resource ?? '',
      action: current?.action ?? '',
      description: current?.description ?? '',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!draft.name || !draft.resource || !draft.action) {
      setError('Nombre, recurso y acción son requeridos');
      return;
    }

    const duplicateIndex = fields.findIndex(
      (f, idx) => f.resource === draft.resource && f.action === draft.action && idx !== editingIndex
    );
    if (duplicateIndex !== -1) {
      setError('Ya existe un permiso con ese recurso y acción');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, draft);
    } else {
      append(draft);
    }
    setIsDialogOpen(false);
    resetDialog();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Permisos de la aplicación</p>
          <p className="text-muted-foreground text-sm">
            Define los permisos (resource + action) asociados a esta aplicación.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar permiso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar permiso' : 'Agregar permiso'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="permName">Nombre</FieldLabel>
                <Input
                  id="permName"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </Field>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="permResource">Recurso</FieldLabel>
                <Input
                  id="permResource"
                  value={draft.resource}
                  onChange={(e) => setDraft((d) => ({ ...d, resource: e.target.value }))}
                />
              </Field>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="permAction">Acción</FieldLabel>
                <Input
                  id="permAction"
                  value={draft.action}
                  onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="permDescription">Descripción</FieldLabel>
                <textarea
                  id="permDescription"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Field>
              {error && <FieldError errors={[{ message: error }]} />}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar permiso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasPermissions ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
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
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay permisos agregados.
        </div>
      )}
    </div>
  );
}
