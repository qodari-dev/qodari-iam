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
  const roleIds = form.watch('roleIds') ?? [];

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
      const appName = (role.application as { name: string } | undefined)?.name ?? 'Unknown App';
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
      setError('Select a role');
      return;
    }

    if (selectedRoleIdsSet.has(value)) {
      setError('Role already added');
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
          <p className="text-sm font-medium">Assigned Roles</p>
          <p className="text-muted-foreground text-sm">
            Assign roles to grant the API client access to specific applications. The client will
            only be able to obtain tokens for applications where it has at least one role assigned.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Role</DialogTitle>
              <DialogDescription>
                Select a role to assign to this API client. Roles determine which permissions the
                client will have when accessing an application.
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error} className="gap-2">
              <FieldLabel htmlFor="roleId">Select Role</FieldLabel>
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
                      <span className="text-muted-foreground">Select role</span>
                    )}

                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0">
                  <Command>
                    <CommandInput placeholder="Search by name..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingRoles ? 'Loading roles...' : 'No roles found'}
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
                                    Added
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
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                Add Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRoles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
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
                    <span className="sr-only">Remove role</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No roles assigned. Add roles to allow this API client to access applications.
        </div>
      )}
    </div>
  );
}
