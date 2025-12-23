'use client';

import { Eye, Pencil, Trash } from 'lucide-react';
import { DataTableRowActions, type RowAction } from '@/components/data-table';
import { Role } from '@/schemas/role';
import { Row, Table } from '@tanstack/react-table';
import { useHasPermission } from '@/stores/auth-store-provider';

interface RoleRowActionsProps {
  row: Row<Role>;
  table: Table<Role>;
}

export function RoleRowActions({ row, table }: RoleRowActionsProps) {
  const role = row.original;
  const meta = table.options.meta;
  const canReadRoles = useHasPermission('roles:read');
  const canUpdateRoles = useHasPermission('roles:update');
  const canDeleteRoles = useHasPermission('roles:delete');

  const actions: RowAction<Role>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: meta?.onRowView,
      hidden: !canReadRoles,
    },
    {
      label: 'Edit Role',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateRoles,
    },
    {
      label: 'Delete Role',
      icon: Trash,
      variant: 'destructive',
      onClick: meta?.onRowDelete,
      hidden: !canDeleteRoles,
    },
  ];

  return <DataTableRowActions row={role} actions={actions} />;
}
