'use client';

import { Eye, Pencil, Trash } from 'lucide-react';
import { DataTableRowActions, type RowAction } from '@/components/data-table';
import { useI18n } from '@/i18n/provider';
import { Role } from '@/schemas/role';
import { Row, Table } from '@tanstack/react-table';
import { useHasPermission } from '@/stores/auth-store-provider';

interface RoleRowActionsProps {
  row: Row<Role>;
  table: Table<Role>;
}

export function RoleRowActions({ row, table }: RoleRowActionsProps) {
  const { messages } = useI18n();
  const role = row.original;
  const meta = table.options.meta;
  const canReadRoles = useHasPermission('roles:read');
  const canUpdateRoles = useHasPermission('roles:update');
  const canDeleteRoles = useHasPermission('roles:delete');

  const actions: RowAction<Role>[] = [
    {
      label: messages.admin.roles.actions.viewDetails,
      icon: Eye,
      onClick: meta?.onRowView,
      hidden: !canReadRoles,
    },
    {
      label: messages.admin.roles.actions.edit,
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateRoles,
    },
    {
      label: messages.admin.roles.actions.delete,
      icon: Trash,
      variant: 'destructive',
      onClick: meta?.onRowDelete,
      hidden: !canDeleteRoles,
    },
  ];

  return <DataTableRowActions row={role} actions={actions} label={messages.common.dataTable.actions} />;
}
