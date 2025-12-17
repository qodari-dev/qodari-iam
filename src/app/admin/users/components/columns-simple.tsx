'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { User } from '@/schemas/user';
import { DataTableColumnHeader } from '@/components/data-table';

export const userColumnsSimple: ColumnDef<User>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Id" />,
    cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,

    cell: ({ row }) => (
      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{row.original.email}</code>
    ),
  },
];
