'use client';

import { DataTable, useDataTable } from '@/components/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageContent, PageHeader } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteRole, useRoles } from '@/hooks/queries/use-role-queries';
import { Role, RoleInclude, RoleSortField } from '@/schemas/role';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { roleColumns } from './role-columns';
import { RoleForm } from './role-form';
import { RolesToolbar } from './role-toolbar';
import { RoleInfo } from './role-info';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Roles() {
  const [role, setRole] = React.useState<Role>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<RoleSortField, RoleInclude>({
    defaultPageSize: 20,
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
    defaultIncludes: ['application', 'permissions'],
  });

  const { data, isLoading, isFetching, refetch } = useRoles(queryParams);

  const { mutateAsync: deleteRole, isPending: isDeleting } = useDeleteRole();

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);

  const handleCreate = () => {
    setRole(undefined);
    setOpenedFormSheet(true);
  };

  const handleRowView = React.useCallback((row: Role) => {
    setRole(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: Role) => {
    setRole(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: Role) => {
    setRole(row);
    setOpenedDeleteDialog(true);
  }, []);

  const handleDelete = React.useCallback(async () => {
    if (!role?.id) return;
    await deleteRole({ params: { id: role.id } });
    setOpenedDeleteDialog(false);
    setRole(undefined);
  }, [role, deleteRole]);

  const tableMeta = React.useMemo<TableMeta<Role>>(
    () => ({
      onRowView: handleRowView,
      onRowEdit: handleRowEdit,
      onRowDelete: handleRowDelete,
    }),
    [handleRowView, handleRowEdit, handleRowDelete]
  );

  return (
    <>
      <PageHeader
        title="Roles"
        description="Manage roles and assign permissions per application."
      />
      <PageContent>
        <DataTable
          columns={roleColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          enableRowSelection={false}
          toolbar={
            <RolesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          meta={tableMeta}
        />
      </PageContent>

      <RoleInfo role={role} opened={openedInfoSheet} onOpened={setOpenedInfoSheet} />
      <RoleForm role={role} opened={openedFormSheet} onOpened={setOpenedFormSheet} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete{' '}
              <strong>{role?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
