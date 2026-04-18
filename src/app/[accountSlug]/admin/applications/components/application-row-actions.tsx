'use client';

import { toast } from 'sonner';
import { Eye, Pencil, Trash, Copy, Lock } from 'lucide-react';
import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { useI18n } from '@/i18n/provider';
import { Application } from '@/schemas/application';
import { Row, Table } from '@tanstack/react-table';
import { useHasPermission } from '@/stores/auth-store-provider';

interface ApplicationRowActionsProps {
  row: Row<Application>;
  table: Table<Application>;
}

export function ApplicationRowActions({ row, table }: ApplicationRowActionsProps) {
  const { messages } = useI18n();
  const app = row.original;
  const meta = table.options.meta;
  const canReadApps = useHasPermission('applications:read');
  const canUpdateApps = useHasPermission('applications:update');
  const canDeleteApps = useHasPermission('applications:delete');

  const handleCopySlug = () => {
    navigator.clipboard.writeText(app.slug);
    toast.success(messages.common.copiedToClipboard);
  };

  const actions: (RowAction<Application> | RowActionGroup<Application>)[] = [
    {
      label: messages.admin.applications.actions.copySlug,
      icon: Copy,
      onClick: handleCopySlug,
      hidden: !canReadApps,
    },
    {
      label: messages.admin.applications.actions.viewDetails,
      icon: Eye,
      onClick: meta?.onRowView,
      hidden: !canReadApps,
    },
    {
      label: messages.admin.applications.actions.rolesReport,
      icon: Lock,
      onClick: meta?.onRowReport,
      hidden: !canReadApps,
    },
    {
      label: messages.admin.applications.actions.edit,
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateApps,
    },
    {
      label: messages.admin.applications.actions.delete,
      icon: Trash,
      variant: 'destructive',
      onClick: meta?.onRowDelete,
      hidden: !canDeleteApps,
    },
  ];

  return <DataTableRowActions row={app} actions={actions} label={messages.common.dataTable.actions} />;
}
