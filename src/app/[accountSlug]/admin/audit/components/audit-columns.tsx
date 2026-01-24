'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AuditLog, AuditAction, AuditStatus, ActorType } from '@/schemas/audit';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  User,
  Bot,
  Eye,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  MoreHorizontal,
} from 'lucide-react';

// ============================================================================
// Status Badge Component
// ============================================================================

const statusConfig: Record<
  AuditStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon: typeof CheckCircle;
  }
> = {
  success: {
    label: 'Success',
    variant: 'default',
    icon: CheckCircle,
  },
  failure: {
    label: 'Failure',
    variant: 'destructive',
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: AuditStatus }) {
  const config = statusConfig[status] ?? statusConfig.success;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Actor Type Badge
// ============================================================================

function ActorBadge({ actorType, name }: { actorType: ActorType; name: string | null }) {
  const isUser = actorType === 'user';

  return (
    <div className="flex items-center gap-2">
      {isUser ? (
        <User className="text-muted-foreground h-4 w-4" />
      ) : (
        <Bot className="text-muted-foreground h-4 w-4" />
      )}
      <span className="truncate">{name || (isUser ? 'Unknown User' : 'Unknown Client')}</span>
    </div>
  );
}

// ============================================================================
// Action Badge
// ============================================================================

const actionConfig: Record<
  AuditAction,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon: typeof Plus;
  }
> = {
  create: {
    label: 'Create',
    variant: 'default',
    icon: Plus,
  },
  update: {
    label: 'Update',
    variant: 'secondary',
    icon: Pencil,
  },
  delete: {
    label: 'Delete',
    variant: 'destructive',
    icon: Trash2,
  },
  read: {
    label: 'Read',
    variant: 'outline',
    icon: Eye,
  },
  login: {
    label: 'Login',
    variant: 'default',
    icon: LogIn,
  },
  logout: {
    label: 'Logout',
    variant: 'secondary',
    icon: LogOut,
  },
  other: {
    label: 'Other',
    variant: 'outline',
    icon: MoreHorizontal,
  },
};

function ActionBadge({ action }: { action: string }) {
  const config = actionConfig[action as AuditAction] ?? actionConfig.other;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================

export const auditColumns: ColumnDef<AuditLog>[] = [
  // Created At Column
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return (
        <div className="flex flex-col">
          <span>{formatDate(date)}</span>
          <span className="text-muted-foreground text-xs">
            {format(new Date(date), 'h:mm:ss a')}
          </span>
        </div>
      );
    },
  },

  // Actor Column
  {
    id: 'actor',
    header: 'Actor',
    cell: ({ row }) => {
      const { actorType, userName, apiClientName } = row.original;
      const name = actorType === 'user' ? userName : apiClientName;
      return <ActorBadge actorType={actorType as ActorType} name={name} />;
    },
    enableSorting: false,
  },

  // Action Column
  {
    accessorKey: 'action',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
    cell: ({ row }) => <ActionBadge action={row.getValue('action')} />,
  },

  // Resource Column
  {
    accessorKey: 'resource',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Resource" />,
    cell: ({ row }) => {
      const { resourceKey, resourceLabel, resourceId } = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{resourceKey}</span>
          {resourceLabel && (
            <span className="text-muted-foreground max-w-[200px] truncate text-xs">
              {resourceLabel}
            </span>
          )}
          {!resourceLabel && resourceId && (
            <span className="text-muted-foreground max-w-[200px] truncate text-xs">
              ID: {resourceId}
            </span>
          )}
        </div>
      );
    },
  },

  // Application Column
  {
    accessorKey: 'applicationName',
    header: 'Application',
    cell: ({ row }) => {
      const appName = row.original.applicationName;
      return appName ? (
        <Badge variant="outline">{appName}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    enableSorting: false,
  },

  // Status Column
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },

  // IP Address Column (hidden by default)
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => {
      const ip = row.original.ipAddress;
      return ip ? (
        <span className="font-mono text-xs">{ip}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    enableHiding: true,
  },

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => {
      const meta = table.options.meta as { onRowView?: (row: AuditLog) => void } | undefined;
      return (
        <Button variant="ghost" size="sm" onClick={() => meta?.onRowView?.(row.original)}>
          <Eye className="h-4 w-4" />
          <span className="sr-only">View details</span>
        </Button>
      );
    },
  },
];
