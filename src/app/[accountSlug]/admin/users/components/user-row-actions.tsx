'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { useI18n } from '@/i18n/provider';
import { User } from '@/schemas/user';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Ban, Copy, Eye, LockOpen, Pencil, Trash, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Props Interface
// ============================================================================

interface UserRowActionsProps {
  row: Row<User>;
  table: Table<User>;
}

// ============================================================================
// Main Component
// ============================================================================

export function UserRowActions({ row, table }: UserRowActionsProps) {
  const { messages } = useI18n();
  const user = row.original;
  const meta = table.options.meta;
  const canUpdateUsers = useHasPermission('users:update');
  const canDeleteUsers = useHasPermission('users:delete');
  const isLocked = Boolean(user.lockedUntil);

  // ---- Action Handlers ----

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success(messages.admin.users.toast.emailCopied);
    } catch {
      toast.error(messages.common.copyToClipboardFailed);
    }
  };

  // ---- Build Actions ----

  const actions: (RowAction<User> | RowActionGroup<User>)[] = [
    // Copy Actions
    {
      label: messages.admin.users.actions.copyEmail,
      icon: Copy,
      onClick: handleCopyEmail,
    },
    {
      label: messages.admin.users.actions.viewDetails,
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: messages.admin.users.actions.edit,
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateUsers,
    },

    // Status Group
    {
      label: messages.admin.users.actions.status,
      actions: [
        {
          label: messages.admin.users.actions.activate,
          icon: UserCheck,
          onClick: meta?.onRowActivate,
          hidden: !canUpdateUsers || user.status === 'active',
        },
        {
          label: messages.admin.users.actions.suspend,
          icon: Ban,
          onClick: meta?.onRowSuspend,
          variant: 'destructive',
          hidden: !canUpdateUsers || user.status === 'suspended',
        },
        {
          label: messages.admin.users.actions.unlock,
          icon: LockOpen,
          onClick: meta?.onRowUnlock,
          hidden: !canUpdateUsers || !isLocked,
        },
        {
          label: messages.admin.users.actions.delete,
          icon: Trash,
          onClick: meta?.onRowDelete,
          variant: 'destructive',
          hidden: !canDeleteUsers,
        },
      ],
    },
  ];

  return <DataTableRowActions row={user} actions={actions} />;
}
