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
import { useI18n } from '@/i18n/provider';
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
  const { messages } = useI18n();
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
      setError(messages.admin.users.form.roles.selectError);
      return;
    }

    const duplicateIndex = fields.findIndex((f, idx) => f.roleId === value && idx !== editingIndex);
    if (duplicateIndex !== -1) {
      setError(messages.admin.users.form.roles.duplicateError);
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
          <p className="text-sm font-medium">{messages.admin.users.form.roles.title}</p>
          <p className="text-muted-foreground text-sm">
            {messages.admin.users.form.roles.description}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              {messages.admin.users.form.roles.add}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null
                  ? messages.admin.users.form.roles.editTitle
                  : messages.admin.users.form.roles.addTitle}
              </DialogTitle>
              <DialogDescription>
                {messages.admin.users.form.roles.addDescription}
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error} className="gap-2">
              <FieldLabel htmlFor="roleId">{messages.admin.users.form.roles.selectRole}</FieldLabel>
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
                      <span className="text-muted-foreground">
                        {messages.admin.users.form.roles.selectRolePlaceholder}
                      </span>
                    )}

                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0">
                  <Command>
                    <CommandInput placeholder={messages.admin.users.form.roles.searchPlaceholder} />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingRoles
                          ? messages.admin.users.form.roles.loading
                          : messages.admin.users.form.roles.empty}
                      </CommandEmpty>
                      <CommandGroup heading={messages.admin.users.form.tabs.roles}>
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
                                  {messages.admin.users.form.roles.selected}
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
                  {messages.common.cancel}
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                {editingIndex !== null
                  ? messages.admin.users.form.roles.saveEdit
                  : messages.admin.users.form.roles.saveAdd}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRoles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">{messages.admin.users.form.roles.table.role}</TableHead>
              <TableHead className="w-[120px] text-right">
                {messages.admin.users.form.roles.table.actions}
              </TableHead>
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
                    <span className="sr-only">{messages.admin.users.form.roles.table.edit}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{messages.admin.users.form.roles.table.delete}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          {messages.admin.users.form.roles.noRoles}
        </div>
      )}
    </div>
  );
}
