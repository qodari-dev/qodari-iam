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
import * as React from 'react';
import { userColumns } from './user-columns';

import { PageContent, PageHeader } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import {
  useActivateUser,
  useDeleteUser,
  useSuspendUser,
  useUsers,
} from '@/hooks/queries/use-user-queries';
import { User, UserInclude, UserSortField } from '@/schemas/user';
import { RowData, TableMeta } from '@tanstack/react-table';
import { UserForm } from './user-form';
import { UserInfo } from './user-info';
import { UsersToolbar } from './user-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
    onRowSuspend?: (row: TData) => void;
    onRowActivate?: (row: TData) => void;
  }
}

export function Users() {
  const [user, setUser] = React.useState<User>();

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

  const { data, isLoading, isFetching, refetch } = useUsers(queryParams);

  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutateAsync: activateUser, isPending: isActivating } = useActivateUser();
  const { mutateAsync: suspendUser, isPending: isSuspending } = useSuspendUser();

  // ---- Handlers ----

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

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setUser(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setUser, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setUser(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setUser, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!user?.id) return;
    await deleteUser({ params: { id: user.id } });
    setUser(undefined);
    setOpenedDeleteDialog(false);
  }, [user, setUser, setOpenedDeleteDialog, deleteUser]);

  const [openedSuspendDialog, setOpenedSuspendDialog] = React.useState(false);
  const handleSuspend = React.useCallback(async () => {
    if (!user?.id) return;
    await suspendUser({ params: { id: user.id } });
    setUser(undefined);
    setOpenedSuspendDialog(false);
  }, [user, setUser, setOpenedSuspendDialog, suspendUser]);

  const [openedActivateDialog, setOpenedActivateDialog] = React.useState(false);
  const handleActivate = React.useCallback(async () => {
    if (!user?.id) return;
    await activateUser({ params: { id: user.id } });
    setUser(undefined);
    setOpenedActivateDialog(false);
  }, [user, setUser, setOpenedActivateDialog, activateUser]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: User) => {
    setUser(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: User) => {
    setUser(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: User) => {
    setUser(row);
    setOpenedDeleteDialog(true);
  }, []);
  const handleRowSuspend = React.useCallback((row: User) => {
    setUser(row);
    setOpenedSuspendDialog(true);
  }, []);
  const handleRowActivate = React.useCallback((row: User) => {
    setUser(row);
    setOpenedActivateDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<User>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
      onRowSuspend: handleRowSuspend,
      onRowActivate: handleRowActivate,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit, handleRowSuspend, handleRowActivate]
  );

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
              onCreate={handleCreate}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No users found. Try adjusting your filters."
          meta={tableMeta}
        />
      </PageContent>

      <UserInfo user={user} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
      <UserForm user={user} opened={openedFormSheet} onOpened={handleFormSheetChange} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove
              your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting && <Spinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openedSuspendDialog} onOpenChange={setOpenedSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will suspend this account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedSuspendDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSuspending} onClick={handleSuspend}>
              {isDeleting && <Spinner />}
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={openedActivateDialog} onOpenChange={setOpenedActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will activate this account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedActivateDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={isActivating} onClick={handleActivate}>
              {isActivating && <Spinner />}
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
