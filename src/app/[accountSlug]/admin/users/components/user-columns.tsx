'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { User, UserStatus } from '@/schemas/user';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle, Lock, ShieldCheck, User as UserIcon, XCircle } from 'lucide-react';
import { UserRowActions } from './user-row-actions';

// ============================================================================
// Status Badge Component
// ============================================================================

const statusConfig: Record<
  UserStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon: typeof CheckCircle;
  }
> = {
  active: {
    label: 'Activo',
    variant: 'default',
    icon: CheckCircle,
  },
  suspended: {
    label: 'Suspendido',
    variant: 'destructive',
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: UserStatus }) {
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
  if (isAdmin) {
    return (
      <Badge variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
        <ShieldCheck className="h-3 w-3" />
        Administrador
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <UserIcon className="h-3 w-3" />
      Usuario
    </Badge>
  );
}

function EmployeeBadge({ isEmployee }: { isEmployee: boolean }) {
  if (isEmployee) {
    return <Badge className="gap-1">Empleado</Badge>;
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      Externo
    </Badge>
  );
}

// ============================================================================
// Roles Display
// ============================================================================

function RolesBadges({ roles }: { roles?: User['userRoles'] }) {
  if (!roles || roles.length === 0) {
    return <span className="text-muted-foreground text-sm">Sin roles</span>;
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
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.email}</span>
        </div>
      );
    },
  },

  // First Name Column (hideable)
  {
    accessorKey: 'firstName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => row.getValue('firstName') ?? '—',
    enableHiding: true,
  },

  // Last Name Column (hideable)
  {
    accessorKey: 'lastName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apellido" />,
    cell: ({ row }) => row.getValue('lastName') ?? '—',
    enableHiding: true,
  },

  // Status Column
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const isLocked = Boolean(row.original.lockedUntil);

      if (isLocked) {
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Bloqueado
          </Badge>
        );
      }

      return <StatusBadge status={row.getValue('status')} />;
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id));
    },
  },

  // Is Admin Column
  {
    accessorKey: 'isAdmin',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
    cell: ({ row }) => <AdminBadge isAdmin={row.getValue('isAdmin')} />,
    filterFn: (row, id, value: boolean) => {
      return row.getValue(id) === value;
    },
  },

  {
    accessorKey: 'isEmployee',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => <EmployeeBadge isEmployee={row.getValue('isEmployee')} />,
    filterFn: (row, id, value: boolean) => {
      return row.getValue(id) === value;
    },
  },

  // Roles Column (from include)
  {
    id: 'roles',
    header: 'Roles asignados',
    cell: ({ row }) => <RolesBadges roles={row.original.userRoles} />,
    enableSorting: false,
  },

  // Created At Column
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{formatDate(row.original.createdAt)}</span>
        </div>
      );
    },
  },

  // Last Login Column
  {
    accessorKey: 'lastLoginAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ultimo acceso" />,
    cell: ({ row }) => {
      const date = row.original.lastLoginAt;
      if (!date) {
        return <span className="text-muted-foreground">Nunca</span>;
      }
      return (
        <div className="flex flex-col">
          <span>{formatDate(date)}</span>
          <span className="text-muted-foreground text-xs">{format(new Date(date), 'h:mm a')}</span>
        </div>
      );
    },
  },

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <UserRowActions row={row} table={table} />,
  },
];
