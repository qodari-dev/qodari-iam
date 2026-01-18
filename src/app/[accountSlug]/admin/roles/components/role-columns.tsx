'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/schemas/role';
import type { ColumnDef } from '@tanstack/react-table';
import { RoleRowActions } from './role-row-actions';
import { formatDate } from '@/utils/formatters';
import { truncateText } from '@/utils/truncate-text';

export const roleColumns: ColumnDef<Role>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">{row.original.slug}</span>
      </div>
    ),
  },
  {
    accessorKey: 'application',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Application" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.application?.name ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
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
    header: 'Permissions',
    cell: ({ row }) => {
      const perms = row.original?.rolePermissions ?? [];
      return (
        <Badge variant="outline" className="text-xs">
          {perms.length} perm
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
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
