'use client';

import { Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter, SimpleSelectFilter } from '@/components/data-table';
import { useI18n } from '@/i18n/provider';
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

  // Is Employee filter (single-select)
  isEmployeeFilter?: string;
  onIsEmployeeFilterChange: (value: string | undefined) => void;

  // Lock filter (single-select)
  lockFilter?: string;
  onLockFilterChange: (value: string | undefined) => void;

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
  isEmployeeFilter,
  onIsEmployeeFilterChange,
  lockFilter,
  onLockFilterChange,
  onReset,
  onRefresh,
  onCreate,
  isRefreshing = false,
}: UsersToolbarProps) {
  const { messages } = useI18n();
  const isFiltered =
    searchValue || statusFilter.length > 0 || isAdminFilter || isEmployeeFilter || lockFilter;
  const canCreateUsers = useHasPermission('users:create');
  const adminOptions = [
    { label: messages.admin.users.toolbar.options.yes, value: 'true' },
    { label: messages.admin.users.toolbar.options.no, value: 'false' },
  ] as const;
  const employeeOptions = [
    { label: messages.admin.users.toolbar.options.yes, value: 'true' },
    { label: messages.admin.users.toolbar.options.no, value: 'false' },
  ] as const;
  const lockOptions = [{ label: messages.admin.users.toolbar.options.locked, value: 'locked' }] as const;
  const statusOptions = [
    { label: messages.admin.users.labels.status.active, value: 'active' },
    { label: messages.admin.users.labels.status.suspended, value: 'suspended' },
  ] as const;

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder={messages.admin.users.toolbar.searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />

        {/* Status Filter (Multi-select) */}
        <DataTableFacetedFilter
          title={messages.admin.users.toolbar.filters.status}
          options={[...statusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />

        {/* Is Admin Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.users.toolbar.filters.administrator}
          options={[...adminOptions]}
          value={isAdminFilter}
          onValueChange={onIsAdminFilterChange}
        />

        {/* Is Employee Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.users.toolbar.filters.employee}
          options={[...employeeOptions]}
          value={isEmployeeFilter}
          onValueChange={onIsEmployeeFilterChange}
        />

        {/* Lock Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.users.toolbar.filters.lock}
          options={[...lockOptions]}
          value={lockFilter}
          onValueChange={onLockFilterChange}
        />

        {/* Reset Button */}
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            {messages.admin.users.toolbar.reset}
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
            {messages.admin.users.toolbar.refresh}
          </Button>
        )}

        {/* Create Button */}
        {onCreate && canCreateUsers && (
          <Button type="button" size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            {messages.admin.users.toolbar.create}
          </Button>
        )}
      </div>
    </div>
  );
}
