'use client';

import { toast } from 'sonner';
import { Eye, Pencil, Trash, Copy, UserCheck, Ban, ShieldCheck, ShieldOff } from 'lucide-react';
import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { User } from '@/schemas/user';
import { Row, Table } from '@tanstack/react-table';

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
  const user = row.original;
  const meta = table.options.meta;
  // ---- Action Handlers ----

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success('Email copied to clipboard');
  };

  // ---- Build Actions ----

  const actions: (RowAction<User> | RowActionGroup<User>)[] = [
    // Copy Actions
    {
      label: 'Copy Email',
      icon: Copy,
      onClick: handleCopyEmail,
    },

    // Navigation Group
    {
      label: 'Navigation',
      actions: [
        {
          label: 'View Details',
          icon: Eye,
          onClick: meta?.onRowView,
        },
        {
          label: 'Edit User',
          icon: Pencil,
          onClick: meta?.onRowEdit,
        },
      ],
    },

    // Status Group
    {
      label: 'Status',
      actions: [
        {
          label: 'Activate',
          icon: UserCheck,
          onClick: meta?.onRowDelete,
        },
        {
          label: 'Suspend',
          icon: Ban,
          onClick: meta?.onRowDelete,
          variant: 'destructive',
        },
      ],
    },

    // Admin Toggle
    {
      label: user.isAdmin ? 'Remove Admin' : 'Make Admin',
      icon: user.isAdmin ? ShieldOff : ShieldCheck,
      onClick: meta?.onRowDelete,
    },

    // Delete
    {
      label: 'Delete User',
      icon: Trash,
      onClick: meta?.onRowDelete,
      variant: 'destructive',
    },
  ];

  return <DataTableRowActions row={user} actions={actions} />;
}
