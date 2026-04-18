'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import { Role } from '@/schemas/role';
import type { ColumnDef } from '@tanstack/react-table';
import { RoleRowActions } from './role-row-actions';
import { formatDate } from '@/utils/formatters';
import { truncateText } from '@/utils/truncate-text';

export function useRoleColumns(): ColumnDef<Role>[] {
  const { messages } = useI18n();

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.roles.columns.name} />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'application',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.roles.columns.application} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.application?.name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.roles.columns.description} />
      ),
      cell: ({ row }) => {
        const description = row.original.description ?? '-';

        return (
          <span className="text-muted-foreground text-sm" title={description}>
            {truncateText(description)}
          </span>
        );
      },
    },
    {
      id: 'permissionsCount',
      header: messages.admin.roles.columns.permissions,
      cell: ({ row }) => {
        const perms = row.original?.rolePermissions ?? [];
        return (
          <Badge variant="outline" className="text-xs">
            {messages.admin.roles.columns.permissionsCount(perms.length)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.roles.columns.created} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span>{formatDate(row.original.createdAt)}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ table, row }) => <RoleRowActions row={row} table={table} />,
    },
  ];
}
