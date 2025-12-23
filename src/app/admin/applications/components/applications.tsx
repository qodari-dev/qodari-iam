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
import { useApplications, useDeleteApplication } from '@/hooks/queries/use-application-queries';
import { Application, ApplicationInclude, ApplicationSortField } from '@/schemas/application';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { applicationColumns } from './application-columns';
import { ApplicationForm } from './application-form';
import { ApplicationsToolbar } from './application-toolbar';
import { ApplicationInfo } from './application-info';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Applications() {
  const [application, setApplication] = React.useState<Application>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<ApplicationSortField, ApplicationInclude>({
    defaultPageSize: 20,
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
    defaultIncludes: ['permissions'],
  });

  const { data, isLoading } = useApplications(queryParams);

  const { mutateAsync: deleteApplication, isPending: isDeleting } = useDeleteApplication();

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);

  const handleCreate = () => {
    setApplication(undefined);
    setOpenedFormSheet(true);
  };

  const handleRowView = React.useCallback((row: Application) => {
    setApplication(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: Application) => {
    setApplication(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: Application) => {
    setApplication(row);
    setOpenedDeleteDialog(true);
  }, []);

  const handleDelete = React.useCallback(async () => {
    if (!application?.id) return;
    await deleteApplication({ params: { id: application.id } });
    setOpenedDeleteDialog(false);
    setApplication(undefined);
  }, [application, deleteApplication]);

  const tableMeta = React.useMemo<TableMeta<Application>>(
    () => ({
      onRowView: handleRowView,
      onRowEdit: handleRowEdit,
      onRowDelete: handleRowDelete,
    }),
    [handleRowView, handleRowEdit, handleRowDelete]
  );

  return (
    <>
      <PageHeader title="Applications" description="Manage applications and their permissions." />
      <PageContent>
        <DataTable
          columns={applicationColumns}
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
            <ApplicationsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
            />
          }
          meta={tableMeta}
        />
      </PageContent>

      <ApplicationInfo
        application={application}
        opened={openedInfoSheet}
        onOpened={setOpenedInfoSheet}
      />
      <ApplicationForm
        application={application}
        opened={openedFormSheet}
        onOpened={setOpenedFormSheet}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete{' '}
              <strong>{application?.name}</strong>?
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
