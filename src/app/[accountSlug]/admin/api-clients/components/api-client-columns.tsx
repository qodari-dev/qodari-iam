'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import { ApiClientItem } from '@/schemas/api-client';
import { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { ApiClientRowActions } from './api-client-row-actions';

function formatAccessTokenExpiry(seconds: number, locale: 'en' | 'es') {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (locale === 'en') {
    if (minutes === 0) return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
    if (secs === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${secs} ${
      secs === 1 ? 'second' : 'seconds'
    }`;
  }

  if (minutes === 0) return `${secs} ${secs === 1 ? 'segundo' : 'segundos'}`;
  if (secs === 0) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} ${secs} ${
    secs === 1 ? 'segundo' : 'segundos'
  }`;
}

export function useApiClientColumns(): ColumnDef<ApiClientItem>[] {
  const { locale, messages } = useI18n();
  const dateLocale = locale === 'en' ? enUS : es;

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.apiClients.columns.name} />
      ),
      cell: ({ row }) => {
        const name = row.original.name;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground font-mono text-xs">{row.original.clientId}</span>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      id: 'roles',
      header: () => (
        <span className="text-muted-foreground text-xs font-medium">
          {messages.admin.apiClients.columns.roles}
        </span>
      ),
      cell: ({ row }) => {
        const roles = row.original.roles ?? [];
        if (roles.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const visible = roles.slice(0, 3);
        const extra = roles.length - visible.length;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((r) => r.role && (
              <Badge key={r.role.id} variant="outline" className="text-xs">
                {r.role.name}
              </Badge>
            ))}
            {extra > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{extra}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.apiClients.columns.status} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status === 'active'
              ? messages.admin.apiClients.labels.status.active
              : messages.admin.apiClients.labels.status.suspended}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.status);
      },
    },
    {
      accessorKey: 'accessTokenExp',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={messages.admin.apiClients.columns.accessTokenExp}
        />
      ),
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-sm">
            {formatAccessTokenExpiry(row.original.accessTokenExp, locale)}
          </span>
        );
      },
    },
    {
      accessorKey: 'lastUsedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.apiClients.columns.lastUsed} />
      ),
      cell: ({ row }) => {
        const lastUsedAt = row.original.lastUsedAt;
        if (!lastUsedAt) {
          return <span className="text-muted-foreground text-sm">{messages.admin.apiClients.columns.never}</span>;
        }
        const date = new Date(lastUsedAt);
        return (
          <span
            className="text-muted-foreground text-sm"
            title={format(date, 'PPpp', { locale: dateLocale })}
          >
            {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.apiClients.columns.created} />
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span
            className="text-muted-foreground text-sm"
            title={format(date, 'PPpp', { locale: dateLocale })}
          >
            {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row, table }) => {
        return <ApiClientRowActions row={row} table={table} />;
      },
    },
  ];
}
