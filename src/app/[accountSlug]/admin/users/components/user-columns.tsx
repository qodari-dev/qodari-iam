'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import { User, UserStatus } from '@/schemas/user';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Lock, ShieldCheck, User as UserIcon, XCircle } from 'lucide-react';
import { UserRowActions } from './user-row-actions';

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: UserStatus }) {
  const { messages } = useI18n();
  const statusConfig: Record<
    UserStatus,
    {
      label: string;
      variant: 'default' | 'secondary' | 'outline' | 'destructive';
      icon: typeof CheckCircle;
    }
  > = {
    active: {
      label: messages.admin.users.labels.status.active,
      variant: 'default',
      icon: CheckCircle,
    },
    suspended: {
      label: messages.admin.users.labels.status.suspended,
      variant: 'destructive',
      icon: XCircle,
    },
  };
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Admin Badge
// ============================================================================

function AdminBadge({ isAdmin }: { isAdmin: boolean }) {
  const { messages } = useI18n();
  if (isAdmin) {
    return (
      <Badge variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
        <ShieldCheck className="h-3 w-3" />
        {messages.admin.users.columns.administrator}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <UserIcon className="h-3 w-3" />
      {messages.admin.users.columns.user}
    </Badge>
  );
}

function EmployeeBadge({ isEmployee }: { isEmployee: boolean }) {
  const { messages } = useI18n();
  if (isEmployee) {
    return <Badge className="gap-1">{messages.admin.users.columns.employee}</Badge>;
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      {messages.admin.users.columns.external}
    </Badge>
  );
}

// ============================================================================
// Roles Display
// ============================================================================

function RolesBadges({ roles }: { roles?: User['userRoles'] }) {
  const { messages } = useI18n();
  if (!roles || roles.length === 0) {
    return <span className="text-muted-foreground text-sm">{messages.admin.users.columns.noRoles}</span>;
  }

  const displayRoles = roles.slice(0, 2);
  const remaining = roles.length - 2;

  return (
    <div className="flex flex-wrap gap-1">
      {displayRoles.map((ur) => (
        <Badge key={ur.role?.id} variant="secondary" className="text-xs">
          {ur.role?.name}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          {messages.admin.users.columns.moreRoles(remaining)}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================

function formatShortDate(value: Date | string | null | undefined, locale: 'en' | 'es') {
  if (!value) return '—';
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatShortTime(value: Date | string, locale: 'en' | 'es') {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function useUserColumns(): ColumnDef<User>[] {
  const { locale, messages } = useI18n();

  return [
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.email} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.firstName} />
      ),
      cell: ({ row }) => row.getValue('firstName') ?? '—',
      enableHiding: true,
    },
    {
      accessorKey: 'lastName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.lastName} />
      ),
      cell: ({ row }) => row.getValue('lastName') ?? '—',
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.status} />
      ),
      cell: ({ row }) => {
        const isLocked = Boolean(row.original.lockedUntil);

        if (isLocked) {
          return (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              {messages.admin.users.columns.locked}
            </Badge>
          );
        }

        return <StatusBadge status={row.getValue('status')} />;
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'isAdmin',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.role} />
      ),
      cell: ({ row }) => <AdminBadge isAdmin={row.getValue('isAdmin')} />,
      filterFn: (row, id, value: boolean) => {
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'isEmployee',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.type} />
      ),
      cell: ({ row }) => <EmployeeBadge isEmployee={row.getValue('isEmployee')} />,
      filterFn: (row, id, value: boolean) => {
        return row.getValue(id) === value;
      },
    },
    {
      id: 'roles',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.assignedRoles} />
      ),
      cell: ({ row }) => <RolesBadges roles={row.original.userRoles} />,
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.created} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span>{formatShortDate(row.original.createdAt, locale)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.users.columns.lastLogin} />
      ),
      cell: ({ row }) => {
        const date = row.original.lastLoginAt;
        if (!date) {
          return <span className="text-muted-foreground">{messages.admin.users.columns.never}</span>;
        }
        return (
          <div className="flex flex-col">
            <span>{formatShortDate(date, locale)}</span>
            <span className="text-muted-foreground text-xs">{formatShortTime(date, locale)}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ table, row }) => <UserRowActions row={row} table={table} />,
    },
  ];
}
