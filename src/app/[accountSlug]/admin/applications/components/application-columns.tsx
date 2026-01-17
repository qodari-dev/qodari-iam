'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Application } from '@/schemas/application';
import type { ColumnDef } from '@tanstack/react-table';
import { ApplicationRowActions } from './application-row-actions';
import { formatDate } from '@/utils/formatters';

const statusVariant: Record<Application['status'], 'default' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'destructive',
};

export const applicationColumns: ColumnDef<Application>[] = [
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
    accessorKey: 'clientType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Client Type" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[11px] uppercase">
        {row.original.clientType}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string;
      return (
        <div className="flex flex-col">
          <span>{formatDate(date)}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <ApplicationRowActions row={row} table={table} />,
  },
];
