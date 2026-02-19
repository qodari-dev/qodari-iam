'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { ApiClientItem } from '@/schemas/api-client';
import { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiClientRowActions } from './api-client-row-actions';
import { formatExpiry } from '@/utils/formatters';

export const apiClientColumns: ColumnDef<ApiClientItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const name = row.original.name;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground font-mono text-xs">{row.original.clientId}</span>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? 'Activo' : 'Suspendido'}
        </Badge>
      );
    },
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.original.status);
    },
  },
  {
    accessorKey: 'accessTokenExp',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Expiracion del token" />,
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground text-sm">
          {formatExpiry(row.original.accessTokenExp)}
        </span>
      );
    },
  },
  {
    accessorKey: 'lastUsedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ultimo uso" />,
    cell: ({ row }) => {
      const lastUsedAt = row.original.lastUsedAt;
      if (!lastUsedAt) {
        return <span className="text-muted-foreground text-sm">Nunca</span>;
      }
      const date = new Date(lastUsedAt);
      return (
        <span className="text-muted-foreground text-sm" title={format(date, 'PPpp')}>
          {formatDistanceToNow(date, { addSuffix: true, locale: es })}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <span className="text-muted-foreground text-sm" title={format(date, 'PPpp')}>
          {formatDistanceToNow(date, { addSuffix: true, locale: es })}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      return <ApiClientRowActions row={row} table={table} />;
    },
  },
];
