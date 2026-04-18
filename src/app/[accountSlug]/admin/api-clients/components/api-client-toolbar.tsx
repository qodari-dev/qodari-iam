'use client';

import { DataTableFacetedFilter } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, X } from 'lucide-react';
import { useHasPermission } from '@/stores/auth-store-provider';

interface ApiClientsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (values: string[]) => void;
  onReset: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ApiClientsToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onReset,
  onCreate,
  onRefresh,
  isRefreshing,
}: ApiClientsToolbarProps) {
  const { messages } = useI18n();
  const hasFilters = statusFilter.length > 0 || searchValue.length > 0;
  const canCreateApiClients = useHasPermission('api-clients:create');
  const statusOptions = [
    { label: messages.admin.apiClients.labels.status.active, value: 'active' },
    { label: messages.admin.apiClients.labels.status.suspended, value: 'suspended' },
  ];

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        <Input
          placeholder={messages.admin.apiClients.toolbar.searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="md:max-w-xs"
        />
        <DataTableFacetedFilter
          title={messages.admin.apiClients.toolbar.status}
          options={statusOptions}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            {messages.admin.apiClients.toolbar.reset}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-9"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {messages.admin.apiClients.toolbar.refresh}
        </Button>
        {canCreateApiClients && (
          <Button size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            {messages.admin.apiClients.toolbar.create}
          </Button>
        )}
      </div>
    </div>
  );
}
