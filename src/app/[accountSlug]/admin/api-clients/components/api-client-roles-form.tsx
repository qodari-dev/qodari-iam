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
import { useI18n } from '@/i18n/provider';
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
  const { messages } = useI18n();
  const form = useFormContext<FormValues>();
  const watchedRoleIds = form.watch('roleIds');
  const roleIds = useMemo(() => watchedRoleIds ?? [], [watchedRoleIds]);

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
      const appName =
        (role.application as { name: string } | undefined)?.name ??
        messages.admin.apiClients.form.roles.unknownApp;
      if (!grouped[appId]) {
        grouped[appId] = { appName, roles: [] };
      }
      grouped[appId].roles.push(role);
    }
    return Object.values(grouped);
  }, [availableRoles, messages.admin.apiClients.form.roles.unknownApp]);

  const handleSave = () => {
    const value = selectedRoleId?.trim();
    if (!value) {
      setError(messages.admin.apiClients.form.roles.selectError);
      return;
    }

    if (selectedRoleIdsSet.has(value)) {
      setError(messages.admin.apiClients.form.roles.duplicateError);
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
          <p className="text-sm font-medium">{messages.admin.apiClients.form.roles.title}</p>
          <p className="text-muted-foreground text-sm">
            {messages.admin.apiClients.form.roles.description}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              {messages.admin.apiClients.form.roles.add}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{messages.admin.apiClients.form.roles.addTitle}</DialogTitle>
              <DialogDescription>
                {messages.admin.apiClients.form.roles.addDescription}
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error} className="gap-2">
              <FieldLabel htmlFor="roleId">{messages.admin.apiClients.form.roles.selectRole}</FieldLabel>
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
                      <span className="text-muted-foreground">
                        {messages.admin.apiClients.form.roles.selectRolePlaceholder}
                      </span>
                    )}

                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0">
                  <Command>
                    <CommandInput placeholder={messages.admin.apiClients.form.roles.searchPlaceholder} />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingRoles
                          ? messages.admin.apiClients.form.roles.loading
                          : messages.admin.apiClients.form.roles.empty}
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
                                    {messages.admin.apiClients.form.roles.selected}
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
                  {messages.admin.apiClients.form.actions.cancel}
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                {messages.admin.apiClients.form.roles.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRoles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.admin.apiClients.form.roles.table.role}</TableHead>
              <TableHead>{messages.admin.apiClients.form.roles.table.application}</TableHead>
              <TableHead className="w-20 text-right">
                {messages.admin.apiClients.form.roles.table.actions}
              </TableHead>
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
                    <span className="sr-only">{messages.admin.apiClients.form.roles.table.remove}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          {messages.admin.apiClients.form.roles.noRoles}
        </div>
      )}
    </div>
  );
}
