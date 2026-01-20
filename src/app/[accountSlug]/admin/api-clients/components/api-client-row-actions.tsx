'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiClientItem } from '@/schemas/api-client';
import { Row, Table } from '@tanstack/react-table';
import { Edit, Eye, Lock, MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';

interface ApiClientRowActionsProps {
  row: Row<ApiClientItem>;
  table: Table<ApiClientItem>;
}

export function ApiClientRowActions({ row, table }: ApiClientRowActionsProps) {
  const apiClient = row.original;
  const meta = table.options.meta;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="data-[state=open]:bg-muted flex h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => meta?.onRowView?.(apiClient)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => meta?.onRowViewCredentials?.(apiClient)}>
          <Lock className="mr-2 h-4 w-4" />
          Credentials
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => meta?.onRowEdit?.(apiClient)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {apiClient.status === 'active' ? (
          <DropdownMenuItem onClick={() => meta?.onRowSuspend?.(apiClient)}>
            <Pause className="mr-2 h-4 w-4" />
            Suspend
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => meta?.onRowActivate?.(apiClient)}>
            <Play className="mr-2 h-4 w-4" />
            Activate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => meta?.onRowDelete?.(apiClient)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
