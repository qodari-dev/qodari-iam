'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import { Application } from '@/schemas/application';
import { getStorageUrl } from '@/utils/storage';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, KeyRound } from 'lucide-react';
import Image from 'next/image';
import { ApplicationRowActions } from './application-row-actions';

const statusVariant: Record<Application['status'], 'default' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'destructive',
};

function AppAvatar({ app }: { app: Application }) {
  const logoUrl = getStorageUrl(app.logo) ?? getStorageUrl(app.image);

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={app.name}
        width={32}
        height={32}
        className="size-8 rounded-md object-cover shrink-0"
        unoptimized
      />
    );
  }

  return (
    <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
      {app.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function useApplicationColumns(): ColumnDef<Application>[] {
  const { messages } = useI18n();

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.applications.columns.name} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <AppAvatar app={row.original} />
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.slug}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      header: () => (
        <span className="text-muted-foreground text-xs font-medium">
          {messages.admin.applications.columns.security}
        </span>
      ),
      cell: ({ row }) => {
        const permCount = row.original.permissions?.length ?? 0;
        const mfaEnabled = row.original.mfaEnabled;

        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <KeyRound className="size-3" />
              {permCount}
            </Badge>
            {mfaEnabled ? (
              <Badge variant="default" className="gap-1 text-xs">
                <ShieldCheck className="size-3" />
                MFA
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                <ShieldCheck className="size-3" />
                MFA
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'clientType',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={messages.admin.applications.columns.clientType}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[11px] uppercase">
          {row.original.clientType === 'public'
            ? messages.admin.applications.columns.clientTypePublic
            : messages.admin.applications.columns.clientTypeConfidential}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.applications.columns.status} />
      ),
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} className="capitalize">
          {row.original.status === 'active'
            ? messages.admin.applications.columns.statusActive
            : messages.admin.applications.columns.statusSuspended}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={messages.admin.applications.columns.created} />
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return <span>{formatDate(date)}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ table, row }) => <ApplicationRowActions row={row} table={table} />,
    },
  ];
}
