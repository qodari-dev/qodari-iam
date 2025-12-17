'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, useDataTable } from '@/components/data-table';
import { userColumns } from './columns';

// ============================================================================
// Importar tus hooks existentes
// ============================================================================
import { useUsers } from '@/hooks/queries/use-user-queries';
import { PageContent, PageHeader } from '@/components/layout';
import { UsersToolbar } from './user-toolbar';
import { UserInclude, UserSortField } from '@/schemas/user';
import { DataTableSimple } from '@/components/data-table/data-table-simple';
import { userColumnsSimple } from './columns-simple';

// ============================================================================
// Page Component
// ============================================================================

export function Users() {
  const router = useRouter();

  // ---- Data Table State ----
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
  } = useDataTable<UserSortField, UserInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['roles'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  // ---- Fetch Users con tu hook existente ----
  const { data, isLoading, isFetching, refetch } = useUsers(queryParams);

  // ---- Mutations con tus hooks existentes ----
  //const deleteUserMutation = useDeleteUser();
  //const updateUserMutation = useUpdateUser();

  // ---- Handlers ----
  const handleCreate = () => {
    router.push('/admin/users/new');
  };

  const handleExport = () => {
    console.log('Export users with params:', queryParams);
  };

  // Extraer filtros para el toolbar
  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status) return [];
    if (typeof status === 'object' && 'in' in status) {
      return (status as { in: string[] }).in;
    }
    if (typeof status === 'string') return [status];
    return [];
  }, [filters.status]);

  const isAdminFilter = React.useMemo(() => {
    const isAdmin = filters.isAdmin;
    if (isAdmin === true) return 'true';
    if (isAdmin === false) return 'false';
    return undefined;
  }, [filters.isAdmin]);

  return (
    <>
      <PageHeader title="Users" description="Manage users." />
      <PageContent>
        <DataTable
          columns={userColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          enableRowSelection
          pageSizeOptions={[10, 20, 30, 50]}
          toolbar={
            <UsersToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={(values) => {
                if (values.length === 0) {
                  handleFilterChange('status', undefined);
                } else {
                  handleFilterChange('status', { in: values });
                }
              }}
              isAdminFilter={isAdminFilter}
              onIsAdminFilterChange={(value) => {
                if (value === undefined) {
                  handleFilterChange('isAdmin', undefined);
                } else {
                  handleFilterChange('isAdmin', value === 'true');
                }
              }}
              onReset={resetFilters}
              onRefresh={() => refetch()}
              onExport={handleExport}
              onCreate={handleCreate}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No users found. Try adjusting your filters."
        />
        <DataTableSimple
          columns={userColumnsSimple}
          data={data?.body?.data ?? []}
          // Search (client-side)
          searchable // Mostrar input de búsqueda
          //searchPlaceholder // Placeholder del input
          searchColumn="global" // "global" = todas las columnas, o nombre de columna específica
          // Pagination (client-side)
          paginated={true} // Habilitar paginación
          defaultPageSize={2} // Tamaño por defecto
          pageSizeOptions={[2, 5, 10, 20]}
          // Selection
          enableRowSelection
          onRowSelectionChange={(rows) => {
            console.log(rows);
          }}
          // Customization
          compact // Modo compacto para nested tables
          toolbar // Slot para toolbar adicional
          //emptyMessage
        />
      </PageContent>
    </>
  );
}
