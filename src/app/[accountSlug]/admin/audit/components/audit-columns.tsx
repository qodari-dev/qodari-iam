'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
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

function StatusBadge({ status }: { status: AuditStatus }) {
  const { messages } = useI18n();
  const statusConfig: Record<
    AuditStatus,
    {
      label: string;
      variant: 'default' | 'secondary' | 'outline' | 'destructive';
      icon: typeof CheckCircle;
    }
  > = {
    success: {
      label: messages.admin.audit.labels.status.success,
      variant: 'default',
      icon: CheckCircle,
    },
    failure: {
      label: messages.admin.audit.labels.status.failure,
      variant: 'destructive',
      icon: XCircle,
    },
  };
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
  const { messages } = useI18n();
  const isUser = actorType === 'user';

  return (
    <div className="flex items-center gap-2">
      {isUser ? (
        <User className="text-muted-foreground h-4 w-4" />
      ) : (
        <Bot className="text-muted-foreground h-4 w-4" />
      )}
      <span className="truncate">
        {name ||
          (isUser
            ? messages.admin.audit.labels.actor.unknownUser
            : messages.admin.audit.labels.actor.unknownClient)}
      </span>
    </div>
  );
}

// ============================================================================
// Action Badge
// ============================================================================

function ActionBadge({ action }: { action: string }) {
  const { messages } = useI18n();
  const actionConfig: Record<
    AuditAction,
    {
      label: string;
      variant: 'default' | 'secondary' | 'outline' | 'destructive';
      icon: typeof Plus;
    }
  > = {
    create: {
      label: messages.admin.audit.labels.action.create,
      variant: 'default',
      icon: Plus,
    },
    update: {
      label: messages.admin.audit.labels.action.update,
      variant: 'secondary',
      icon: Pencil,
    },
    delete: {
      label: messages.admin.audit.labels.action.delete,
      variant: 'destructive',
      icon: Trash2,
    },
    read: {
      label: messages.admin.audit.labels.action.read,
      variant: 'outline',
      icon: Eye,
    },
    login: {
      label: messages.admin.audit.labels.action.login,
      variant: 'default',
      icon: LogIn,
    },
    logout: {
      label: messages.admin.audit.labels.action.logout,
      variant: 'secondary',
      icon: LogOut,
    },
    other: {
      label: messages.admin.audit.labels.action.other,
      variant: 'outline',
      icon: MoreHorizontal,
    },
  };
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

export function useAuditColumns(): ColumnDef<AuditLog>[] {
  const { messages } = useI18n();

  return [
  // Created At Column
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={messages.admin.audit.columns.date} />
    ),
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
    header: messages.admin.audit.columns.actor,
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={messages.admin.audit.columns.action} />
    ),
    cell: ({ row }) => <ActionBadge action={row.getValue('action')} />,
  },

  // Resource Column
  {
    accessorKey: 'resource',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={messages.admin.audit.columns.resource} />
    ),
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
              {messages.admin.audit.columns.resourceId}: {resourceId}
            </span>
          )}
        </div>
      );
    },
  },

  // Application Column
  {
    accessorKey: 'applicationName',
    header: messages.admin.audit.columns.application,
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={messages.admin.audit.columns.status} />
    ),
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },

  // IP Address Column (hidden by default)
  {
    accessorKey: 'ipAddress',
    header: messages.admin.audit.columns.ipAddress,
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
          <span className="sr-only">{messages.admin.audit.columns.viewDetails}</span>
        </Button>
      );
    },
  },
  ];
}
