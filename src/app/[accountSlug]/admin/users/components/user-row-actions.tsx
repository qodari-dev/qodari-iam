'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
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
  const user = row.original;
  const meta = table.options.meta;
  const canUpdateUsers = useHasPermission('users:update');
  const canDeleteUsers = useHasPermission('users:delete');
  const isLocked = Boolean(user.lockedUntil);

  // ---- Action Handlers ----

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success('Correo copiado al portapapeles');
  };

  // ---- Build Actions ----

  const actions: (RowAction<User> | RowActionGroup<User>)[] = [
    // Copy Actions
    {
      label: 'Copiar correo',
      icon: Copy,
      onClick: handleCopyEmail,
    },
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Editar usuario',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdateUsers,
    },

    // Status Group
    {
      label: 'Estado',
      actions: [
        {
          label: 'Activar',
          icon: UserCheck,
          onClick: meta?.onRowActivate,
          hidden: !canUpdateUsers || user.status === 'active',
        },
        {
          label: 'Suspender',
          icon: Ban,
          onClick: meta?.onRowSuspend,
          variant: 'destructive',
          hidden: !canUpdateUsers || user.status === 'suspended',
        },
        {
          label: 'Desbloquear',
          icon: LockOpen,
          onClick: meta?.onRowUnlock,
          hidden: !canUpdateUsers || !isLocked,
        },
        {
          label: 'Eliminar usuario',
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
