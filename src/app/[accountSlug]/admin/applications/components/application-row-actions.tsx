'use client';

import { toast } from 'sonner';
import { Eye, Pencil, Trash, Copy, Lock } from 'lucide-react';
import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { Application } from '@/schemas/application';
import { Row, Table } from '@tanstack/react-table';
import { useHasPermission } from '@/stores/auth-store-provider';

interface ApplicationRowActionsProps {
  row: Row<Application>;
  table: Table<Application>;
}

export function ApplicationRowActions({ row, table }: ApplicationRowActionsProps) {
  const app = row.original;
  const meta = table.options.meta;
  const canReadApps = useHasPermission('applications:read');
  const canUpdateApps = useHasPermission('applications:update');
  const canDeleteApps = useHasPermission('applications:delete');

  const handleCopySlug = () => {
    navigator.clipboard.writeText(app.slug);
    toast.success('Slug copiado al portapapeles');
  };

  const actions: (RowAction<Application> | RowActionGroup<Application>)[] = [
    {
      label: 'Copy Slug',
      icon: Copy,
      onClick: handleCopySlug,
      hidden: !canReadApps,
    },
    {
      label: 'View Details',
      icon: Eye,
      onClick: meta?.onRowView,
      hidden: !canReadApps,
    },
    {
      label: 'Report Roles',
      icon: Lock,
      onClick: meta?.onRowReport,
      hidden: !canReadApps,
    },
    {
      label: 'Edit Application',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateApps,
    },
    {
      label: 'Delete Application',
      icon: Trash,
      variant: 'destructive',
      onClick: meta?.onRowDelete,
      hidden: !canDeleteApps,
    },
  ];

  return <DataTableRowActions row={app} actions={actions} />;
}
