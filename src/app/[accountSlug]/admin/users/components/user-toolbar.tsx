'use client';

import { Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter, SimpleSelectFilter } from '@/components/data-table';
import { userStatusOptions } from '@/schemas/user';
import { booleanOptions } from '@/schemas/shared';
import { useHasPermission } from '@/stores/auth-store-provider';

// ============================================================================
// Props Interface
// ============================================================================

interface UsersToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Status filter (multi-select)
  statusFilter: string[];
  onStatusFilterChange: (values: string[]) => void;

  // Is Admin filter (single-select)
  isAdminFilter?: string;
  onIsAdminFilterChange: (value: string | undefined) => void;

  // Actions
  onReset: () => void;
  onRefresh?: () => void;
  onCreate?: () => void;

  // Loading states
  isRefreshing?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function UsersToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isAdminFilter,
  onIsAdminFilterChange,
  onReset,
  onRefresh,
  onCreate,
  isRefreshing = false,
}: UsersToolbarProps) {
  const isFiltered = searchValue || statusFilter.length > 0 || isAdminFilter;
  const canCreateUsers = useHasPermission('users:create');

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder="Search by email, first name, last name..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />

        {/* Status Filter (Multi-select) */}
        <DataTableFacetedFilter
          title="Status"
          options={[...userStatusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />

        {/* Is Admin Filter (Single-select) */}
        <SimpleSelectFilter
          title="Admin"
          options={[...booleanOptions]}
          value={isAdminFilter}
          onValueChange={onIsAdminFilterChange}
        />

        {/* Reset Button */}
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {onRefresh && (
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
        )}

        {/* Create Button */}
        {onCreate && canCreateUsers && (
          <Button type="button" size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>
    </div>
  );
}
