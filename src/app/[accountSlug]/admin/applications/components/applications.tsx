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
import { useI18n } from '@/i18n/provider';
import { Application, ApplicationInclude, ApplicationSortField } from '@/schemas/application';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { useApplicationColumns } from './application-columns';
import { ApplicationForm } from './application-form';
import { ApplicationsToolbar } from './application-toolbar';
import { ApplicationInfo } from './application-info';
import { toast } from 'sonner';
import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowReport?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Applications() {
  const { locale, messages } = useI18n();
  const [application, setApplication] = React.useState<Application>();
  const applicationColumns = useApplicationColumns();

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

  const { data, isLoading, isFetching, refetch } = useApplications(queryParams);

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

  const handleRowReport = React.useCallback(async (row: Application) => {
    try {
      const result = await api.application.report.query({ params: { id: row.id } });
      if (result.status === 200) {
        const blob = new Blob([result.body], {
          type: 'text/csv',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = messages.admin.applications.report.fileName(
          new Date().toISOString().split('T')[0]
        );
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast.error(getTsRestErrorMessage(error, locale));
    }
  }, [locale, messages.admin.applications.report]);

  const tableMeta = React.useMemo<TableMeta<Application>>(
    () => ({
      onRowView: handleRowView,
      onRowReport: handleRowReport,
      onRowEdit: handleRowEdit,
      onRowDelete: handleRowDelete,
    }),
    [handleRowView, handleRowEdit, handleRowDelete, handleRowReport]
  );

  return (
    <>
      <PageHeader
        title={messages.admin.applications.title}
        description={messages.admin.applications.description}
      />
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
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage={messages.admin.applications.empty}
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
            <AlertDialogTitle>{messages.admin.applications.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {application?.name
                ? messages.admin.applications.deleteDialog.description(application.name)
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2 h-4 w-4" />}
              {messages.admin.applications.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
