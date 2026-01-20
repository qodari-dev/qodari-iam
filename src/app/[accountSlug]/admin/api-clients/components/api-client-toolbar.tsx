'use client';

import { DataTableFacetedFilter } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClientStatusOptions } from '@/schemas/api-client';
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
  const hasFilters = statusFilter.length > 0 || searchValue.length > 0;
  const canCreateApiClients = useHasPermission('api-clients:create');

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        <Input
          placeholder="Search by name or client ID..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="md:max-w-xs"
        />
        <DataTableFacetedFilter
          title="Status"
          options={[...apiClientStatusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            Reset
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
          Refresh
        </Button>
        {canCreateApiClients && (
          <Button size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            New API Client
          </Button>
        )}
      </div>
    </div>
  );
}
