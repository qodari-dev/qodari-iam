'use client';

import { Download, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter, SimpleSelectFilter } from '@/components/data-table';
import {
  AuditStatusEnum,
  ActorTypeEnum,
  AuditActionEnum,
} from '@/schemas/audit';
import { api } from '@/clients/api';
import { useI18n } from '@/i18n/provider';
import { toast } from 'sonner';
import { useApplications } from '@/hooks/queries/use-application-queries';
import { useMemo } from 'react';
import { useUsers } from '@/hooks/queries/use-user-queries';
import { useApiClients } from '@/hooks/queries/use-api-client-queries';
import { DatePickerWithRangeFilter } from '@/components/data-table/data-table-faceted-filter';
import { DateRange } from 'react-day-picker';
import { z } from 'zod';

// ============================================================================
// Props Interface
// ============================================================================

interface AuditToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;

  rangeDateFilter?: DateRange;
  onRangeDateFilterChange: (value: DateRange | undefined) => void;

  applicationFilter?: string;
  onApplicationFilterChange: (value: string | undefined) => void;

  userFilter?: string;
  onUserFilterChange: (value: string | undefined) => void;

  apiClientFilter?: string;
  onApiClientFilterChange: (value: string | undefined) => void;

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
  rangeDateFilter,
  onRangeDateFilterChange,
  applicationFilter,
  onApplicationFilterChange,
  userFilter,
  onUserFilterChange,
  apiClientFilter,
  onApiClientFilterChange,
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
  const { messages } = useI18n();
  const isFiltered = searchValue || actionFilter.length > 0 || statusFilter || actorTypeFilter;
  const auditActionOptions = [
    { label: messages.admin.audit.labels.action.create, value: 'create' },
    { label: messages.admin.audit.labels.action.update, value: 'update' },
    { label: messages.admin.audit.labels.action.delete, value: 'delete' },
    { label: messages.admin.audit.labels.action.read, value: 'read' },
    { label: messages.admin.audit.labels.action.login, value: 'login' },
    { label: messages.admin.audit.labels.action.logout, value: 'logout' },
    { label: messages.admin.audit.labels.action.other, value: 'other' },
  ] as const;
  const auditStatusOptions = [
    { label: messages.admin.audit.labels.status.success, value: 'success' },
    { label: messages.admin.audit.labels.status.failure, value: 'failure' },
  ] as const;
  const actorTypeOptions = [
    { label: messages.admin.audit.labels.actor.user, value: 'user' },
    { label: messages.admin.audit.labels.actor.apiClient, value: 'api_client' },
  ] as const;

  const { data: applications } = useApplications();

  const applicationFilterData = useMemo(() => {
    if (!applications) return [];
    if (!applications.body.data) return [];
    return applications.body?.data.map((app) => ({
      label: app.name,
      value: app.id,
    }));
  }, [applications]);

  const { data: users } = useUsers();

  const userFilterData = useMemo(() => {
    if (!users) return [];
    if (!users.body.data) return [];
    return users.body?.data.map((user) => ({
      label: user.email,
      value: user.id,
    }));
  }, [users]);

  const { data: apiClients } = useApiClients();

  const apiClientFilterData = useMemo(() => {
    if (!apiClients) return [];
    if (!apiClients.body.data) return [];
    return apiClients.body?.data.map((apiClient) => ({
      label: apiClient.name,
      value: apiClient.id,
    }));
  }, [apiClients]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const parsedStatus = AuditStatusEnum.safeParse(statusFilter);
      const status = parsedStatus.success ? parsedStatus.data : undefined;

      const parsedActorType = ActorTypeEnum.safeParse(actorTypeFilter);
      const actorType = parsedActorType.success ? parsedActorType.data : undefined;

      const parsedAction = z.array(AuditActionEnum).safeParse(actionFilter);
      const action = parsedAction.success ? parsedAction.data : undefined;

      const result = await api.audit.export.query({
        query: {
          format,
          actorType,
          userId: userFilter ?? undefined,
          apiClientId: apiClientFilter ?? undefined,
          applicationId: applicationFilter ?? undefined,
          action,
          status,
          from: rangeDateFilter?.from ?? undefined,
          to: rangeDateFilter?.to ?? undefined,
          search: searchValue ?? undefined,
        },
      });

      if (result.status === 200) {
        const blob = new Blob([result.body], {
          type: format === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = messages.admin.audit.toolbar.fileName(
          new Date().toISOString().split('T')[0],
          format
        );
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(messages.admin.audit.toolbar.exportSuccess(format.toUpperCase()));
      }
    } catch (error) {
      console.log(error);
      toast.error(messages.admin.audit.toolbar.exportError);
    }
  };

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder={messages.admin.audit.toolbar.searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />
        <DatePickerWithRangeFilter
          value={rangeDateFilter}
          onValueChange={onRangeDateFilterChange}
        />

        {/* Application Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.audit.toolbar.filters.application}
          options={applicationFilterData}
          value={applicationFilter}
          onValueChange={onApplicationFilterChange}
        />
        {/* User Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.audit.toolbar.filters.user}
          options={userFilterData}
          value={userFilter}
          onValueChange={onUserFilterChange}
        />
        {/* API Client Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.audit.toolbar.filters.apiClient}
          options={apiClientFilterData}
          value={apiClientFilter}
          onValueChange={onApiClientFilterChange}
        />

        {/* Action Filter (Multi-select) */}
        <DataTableFacetedFilter
          title={messages.admin.audit.toolbar.filters.action}
          options={[...auditActionOptions]}
          value={actionFilter}
          onValueChange={onActionFilterChange}
        />

        {/* Status Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.audit.toolbar.filters.status}
          options={[...auditStatusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />

        {/* Actor Type Filter (Single-select) */}
        <SimpleSelectFilter
          title={messages.admin.audit.toolbar.filters.actor}
          options={[...actorTypeOptions]}
          value={actorTypeFilter}
          onValueChange={onActorTypeFilterChange}
        />

        {/* Reset Button */}
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            {messages.admin.audit.toolbar.reset}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Export Buttons */}
        <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-9">
          <Download className="mr-2 h-4 w-4" />
          {messages.admin.audit.toolbar.exportCsv}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('json')} className="h-9">
          <Download className="mr-2 h-4 w-4" />
          {messages.admin.audit.toolbar.exportJson}
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
            {messages.admin.audit.toolbar.refresh}
          </Button>
        )}
      </div>
    </div>
  );
}
