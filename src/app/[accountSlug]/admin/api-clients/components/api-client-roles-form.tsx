'use client';

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
import { CreateApiClientBodySchema } from '@/schemas/api-client';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
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

type FormValues = z.infer<typeof CreateApiClientBodySchema>;

export function ApiClientRolesForm() {
  const form = useFormContext<FormValues>();

  const roleIds = useMemo(() => {
    return form.getValues('roleIds') ?? [];
  }, [form]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const selectedRoleIdsSet = useMemo(() => new Set(roleIds), [roleIds]);

  const hasRoles = useMemo(() => roleIds.length > 0, [roleIds.length]);

  const resetDialogState = useCallback(() => {
    setSelectedRoleId(null);
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

  const { data: rolesResponse, isLoading: isLoadingRoles } = useRoles({
    limit: 1000,
    sort: [{ field: 'name', order: 'asc' }],
    include: ['application'],
  });
  const availableRoles = useMemo(() => {
    return rolesResponse?.body?.data ?? [];
  }, [rolesResponse]);

  // Group roles by application
  const rolesByApp = useMemo(() => {
    const grouped: Record<string, { appName: string; roles: Role[] }> = {};
    for (const role of availableRoles) {
      const appId = role.applicationId;
      const appName = (role.application as { name: string } | undefined)?.name ?? 'App desconocida';
      if (!grouped[appId]) {
        grouped[appId] = { appName, roles: [] };
      }
      grouped[appId].roles.push(role);
    }
    return Object.values(grouped);
  }, [availableRoles]);

  const handleSave = () => {
    const value = selectedRoleId?.trim();
    if (!value) {
      setError('Selecciona un rol');
      return;
    }

    if (selectedRoleIdsSet.has(value)) {
      setError('El rol ya fue agregado');
      return;
    }

    form.setValue('roleIds', [...roleIds, value]);

    setIsDialogOpen(false);
    resetDialogState();
  };

  const handleRemove = (roleId: string) => {
    form.setValue(
      'roleIds',
      roleIds.filter((id) => id !== roleId)
    );
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setError(null);
  };

  const getRoleById = (roleId: string) => {
    return availableRoles.find((r) => r.id === roleId);
  };

  const getRoleDisplay = (roleId: string) => {
    const match = getRoleById(roleId);
    if (!match) return roleId;
    return match.name;
  };

  const getRoleApp = (roleId: string) => {
    const match = getRoleById(roleId);
    if (!match) return '';
    return (match.application as { name: string } | undefined)?.name ?? '';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Roles asignados</p>
          <p className="text-muted-foreground text-sm">
            Asigna roles para dar acceso a aplicaciones especificas. El cliente solo podra obtener
            tokens para aplicaciones donde tenga al menos un rol asignado.
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
              <DialogTitle>Agregar rol</DialogTitle>
              <DialogDescription>
                Selecciona un rol para este cliente API. El rol define los permisos del cliente
                cuando accede a una aplicacion.
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
                      <span className="truncate text-left">
                        {getRoleDisplay(selectedRoleId)} ({getRoleApp(selectedRoleId)})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Selecciona un rol</span>
                    )}

                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingRoles ? 'Cargando roles...' : 'No se encontraron roles'}
                      </CommandEmpty>
                      {rolesByApp.map(({ appName, roles }) => (
                        <CommandGroup key={appName} heading={appName}>
                          {roles.map((role) => {
                            const isDisabled = selectedRoleIdsSet.has(role.id);
                            const isSelected = selectedRoleId === role.id;
                            return (
                              <CommandItem
                                key={role.id}
                                value={`${role.name} ${appName}`}
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
                                    Agregado
                                  </Badge>
                                )}
                                {isSelected && !isDisabled && (
                                  <Check className="text-primary ml-auto h-4 w-4" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      ))}
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
                Agregar rol
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRoles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Aplicacion</TableHead>
              <TableHead className="w-20 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleIds.map((roleId) => (
              <TableRow key={roleId}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{getRoleDisplay(roleId)}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {getRoleById(roleId)?.slug ?? ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getRoleApp(roleId)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => handleRemove(roleId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Quitar rol</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          Sin roles asignados. Agrega roles para permitir acceso a aplicaciones.
        </div>
      )}
    </div>
  );
}
