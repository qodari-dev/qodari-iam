'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, Pencil, Trash, Copy, UserCheck, Ban, ShieldCheck, ShieldOff } from 'lucide-react';
import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { User, UserStatus } from '@/schemas/user';

// ============================================================================
// Props Interface
// ============================================================================

interface UserRowActionsProps {
  user: User;
  onDelete?: (user: User) => Promise<void>;
  onStatusChange?: (user: User, status: UserStatus) => Promise<void>;
  onToggleAdmin?: (user: User) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function UserRowActions({
  user,
  onDelete,
  onStatusChange,
  onToggleAdmin,
}: UserRowActionsProps) {
  const router = useRouter();

  // ---- Action Handlers ----

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('User ID copied to clipboard');
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success('Email copied to clipboard');
  };

  const handleView = () => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleEdit = () => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm(`Are you sure you want to delete ${user.email}?`)) {
      return;
    }

    try {
      await onDelete(user);
      toast.success('User deleted successfully');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleActivate = async () => {
    if (!onStatusChange) return;
    try {
      await onStatusChange(user, 'active');
      toast.success('User activated');
    } catch {
      toast.error('Failed to activate user');
    }
  };

  const handleSuspend = async () => {
    if (!onStatusChange) return;
    try {
      await onStatusChange(user, 'suspended');
      toast.success('User suspended');
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleToggleAdmin = async () => {
    if (!onToggleAdmin) return;
    try {
      await onToggleAdmin(user);
      toast.success(user.isAdmin ? 'Admin privileges removed' : 'Admin privileges granted');
    } catch {
      toast.error('Failed to update admin status');
    }
  };

  // ---- Build Actions ----

  const actions: (RowAction<User> | RowActionGroup<User>)[] = [
    // Copy Actions
    {
      label: 'Copy ID',
      icon: Copy,
      onClick: handleCopyId,
    },
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
          onClick: handleView,
        },
        {
          label: 'Edit User',
          icon: Pencil,
          onClick: handleEdit,
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
          onClick: handleActivate,
          hidden: user.status === 'active',
          disabled: !onStatusChange,
        },
        {
          label: 'Suspend',
          icon: Ban,
          onClick: handleSuspend,
          hidden: user.status === 'suspended',
          disabled: !onStatusChange,
          variant: 'destructive',
        },
      ],
    },

    // Admin Toggle
    {
      label: user.isAdmin ? 'Remove Admin' : 'Make Admin',
      icon: user.isAdmin ? ShieldOff : ShieldCheck,
      onClick: handleToggleAdmin,
      disabled: !onToggleAdmin,
    },

    // Delete
    {
      label: 'Delete User',
      icon: Trash,
      onClick: handleDelete,
      variant: 'destructive',
      disabled: !onDelete,
    },
  ];

  return <DataTableRowActions row={user} actions={actions} />;
}
