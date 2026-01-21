'use client';

import { DataTable, useDataTable } from '@/components/data-table';
import * as React from 'react';
import { auditColumns } from './audit-columns';

import { PageContent, PageHeader } from '@/components/layout';
import { useAuditLogs } from '@/hooks/queries/use-audit-queries';
import { AuditLog, AuditLogSortField, AuditLogInclude } from '@/schemas/audit';
import { RowData, TableMeta } from '@tanstack/react-table';
import { AuditInfo } from './audit-info';
import { AuditToolbar } from './audit-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
  }
}

export function AuditLogs() {
  const [auditLog, setAuditLog] = React.useState<AuditLog>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    filters,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
    handleFilterChange,
    resetFilters,
  } = useDataTable<AuditLogSortField, AuditLogInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useAuditLogs(queryParams);

  // ---- Handlers ----

  // Extract filters for the toolbar
  const actionFilter = React.useMemo(() => {
    const action = filters.action;
    if (!action) return [];
    if (typeof action === 'object' && 'in' in action) {
      return (action as { in: string[] }).in;
    }
    if (typeof action === 'string') return [action];
    return [];
  }, [filters.action]);

  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status) return undefined;
    if (typeof status === 'string') return status;
    return undefined;
  }, [filters.status]);

  const actorTypeFilter = React.useMemo(() => {
    const actorType = filters.actorType;
    if (!actorType) return undefined;
    if (typeof actorType === 'string') return actorType;
    return undefined;
  }, [filters.actorType]);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAuditLog(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAuditLog, setOpenedInfoSheet]
  );

  const handleRowOpen = React.useCallback((row: AuditLog) => {
    setAuditLog(row);
    setOpenedInfoSheet(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<AuditLog>>(
    () => ({
      onRowView: handleRowOpen,
    }),
    [handleRowOpen]
  );

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="View and export audit logs for all operations in this account."
      />
      <PageContent>
        <DataTable
          columns={auditColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          pageSizeOptions={[20, 50, 100]}
          toolbar={
            <AuditToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              actionFilter={actionFilter}
              onActionFilterChange={(values) => {
                if (values.length === 0) {
                  handleFilterChange('action', undefined);
                } else {
                  handleFilterChange('action', { in: values });
                }
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => {
                handleFilterChange('status', value);
              }}
              actorTypeFilter={actorTypeFilter}
              onActorTypeFilterChange={(value) => {
                handleFilterChange('actorType', value);
              }}
              onReset={resetFilters}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No audit logs found. Try adjusting your filters."
          meta={tableMeta}
        />
      </PageContent>

      <AuditInfo auditLog={auditLog} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
    </>
  );
}
