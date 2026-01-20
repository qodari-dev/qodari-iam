'use client';

import { Download, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter, SimpleSelectFilter } from '@/components/data-table';
import { auditActionOptions, auditStatusOptions, actorTypeOptions } from '@/schemas/audit';
import { api } from '@/clients/api';
import { toast } from 'sonner';

// ============================================================================
// Props Interface
// ============================================================================

interface AuditToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Action filter (multi-select)
  actionFilter: string[];
  onActionFilterChange: (values: string[]) => void;

  // Status filter (single-select)
  statusFilter?: string;
  onStatusFilterChange: (value: string | undefined) => void;

  // Actor type filter (single-select)
  actorTypeFilter?: string;
  onActorTypeFilterChange: (value: string | undefined) => void;

  // Actions
  onReset: () => void;
  onRefresh?: () => void;

  // Loading states
  isRefreshing?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function AuditToolbar({
  searchValue,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
  statusFilter,
  onStatusFilterChange,
  actorTypeFilter,
  onActorTypeFilterChange,
  onReset,
  onRefresh,
  isRefreshing = false,
}: AuditToolbarProps) {
  const isFiltered = searchValue || actionFilter.length > 0 || statusFilter || actorTypeFilter;

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const result = await api.audit.export.query({
        query: { format },
      });

      if (result.status === 200) {
        const blob = new Blob([result.body], {
          type: format === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Exported audit logs as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to export audit logs');
    }
  };

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder="Search by resource, user, or client..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />

        {/* Action Filter (Multi-select) */}
        <DataTableFacetedFilter
          title="Action"
          options={[...auditActionOptions]}
          value={actionFilter}
          onValueChange={onActionFilterChange}
        />

        {/* Status Filter (Single-select) */}
        <SimpleSelectFilter
          title="Status"
          options={[...auditStatusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />

        {/* Actor Type Filter (Single-select) */}
        <SimpleSelectFilter
          title="Actor"
          options={[...actorTypeOptions]}
          value={actorTypeFilter}
          onValueChange={onActorTypeFilterChange}
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
        {/* Export Buttons */}
        <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-9">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('json')} className="h-9">
          <Download className="mr-2 h-4 w-4" />
          JSON
        </Button>

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
      </div>
    </div>
  );
}
