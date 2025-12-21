import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateUserBodySchema } from '@/schemas/user';
import { cn } from '@/lib/utils';
import { Pencil, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useRoles } from '@/hooks/queries/use-role-queries';
import { Role } from '@/schemas/role';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type FormValues = z.infer<typeof CreateUserBodySchema>;

export function UserRolesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'roles',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const selectedRoleIds = useMemo(() => new Set(fields.map((f) => f.roleId)), [fields]);

  const hasRoles = useMemo(() => fields.length > 0, [fields.length]);

  const resetDialogState = useCallback(() => {
    setSelectedRoleId(null);
    setEditingIndex(null);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) {
        resetDialogState();
      }
    },
    [resetDialogState]
  );

  const handleAddClick = () => {
    resetDialogState();
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    setSelectedRoleId(current?.roleId ?? null);
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const { data: rolesResponse, isLoading: isLoadingRoles } = useRoles({
    limit: 1000,
    sort: [{ field: 'name', order: 'asc' }],
  });
  const availableRoles = rolesResponse?.body?.data ?? [];

  const handleSave = () => {
    const value = selectedRoleId?.trim();
    if (!value) {
      setError('Selecciona un rol');
      return;
    }

    const duplicateIndex = fields.findIndex((f, idx) => f.roleId === value && idx !== editingIndex);
    if (duplicateIndex !== -1) {
      setError('El rol ya fue agregado');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, { roleId: value });
    } else {
      append({ roleId: value });
    }

    setIsDialogOpen(false);
    resetDialogState();
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setError(null);
  };

  const getRoleDisplay = (roleId: string) => {
    const match = availableRoles.find((r) => r.id === roleId);
    if (!match) return roleId;
    return `${match.name} (${match.slug})`;
  };
  const getRoleDescription = (roleId: string) => {
    const match = availableRoles.find((r) => r.id === roleId);
    if (!match) return '';
    return `${match.description}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Roles asignados</p>
          <p className="text-muted-foreground text-sm">
            Agrega o edita los roles del usuario. Busca por nombre/slug y evita duplicados.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar rol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar rol' : 'Agregar rol'}</DialogTitle>
              <DialogDescription>
                Busca y selecciona el rol que deseas asignar al usuario.
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error} className="gap-2">
              <FieldLabel htmlFor="roleId">Seleccionar rol</FieldLabel>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedRoleId ? (
                      <span className="truncate text-left">{getRoleDisplay(selectedRoleId)}</span>
                    ) : (
                      <span className="text-muted-foreground">Select rol</span>
                    )}

                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o slug..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingRoles ? 'Cargando roles...' : 'No se encontraron roles'}
                      </CommandEmpty>
                      <CommandGroup heading="Roles">
                        {availableRoles.map((role) => {
                          const isCurrent =
                            editingIndex !== null && fields[editingIndex]?.roleId === role.id;
                          const isDisabled = selectedRoleIds.has(role.id) && !isCurrent;
                          const isSelected = selectedRoleId === role.id;
                          return (
                            <CommandItem
                              key={role.id}
                              value={role.name}
                              disabled={isDisabled}
                              onSelect={() => {
                                handleSelectRole(role);
                                setIsComboboxOpen(false);
                              }}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{role.name}</span>
                                <span className="text-muted-foreground text-xs">{role.slug}</span>
                              </div>
                              {isDisabled && (
                                <Badge variant="outline" className="ml-auto text-[10px]">
                                  Seleccionado
                                </Badge>
                              )}
                              {isSelected && !isDisabled && (
                                <Check className="text-primary ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {error && <FieldError errors={[{ message: error }]} />}
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar rol'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRoles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Role</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{getRoleDisplay(field.roleId)}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {getRoleDescription(field.roleId)}
                    </span>
                  </div>
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
                    <span className="sr-only">Editar rol</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar rol</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay roles agregados.
        </div>
      )}
    </div>
  );
}
