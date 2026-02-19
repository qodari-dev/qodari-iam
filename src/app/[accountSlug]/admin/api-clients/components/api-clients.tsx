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
import { apiClientColumns } from './api-client-columns';

import { PageContent, PageHeader } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import {
  useActivateApiClient,
  useApiClients,
  useDeleteApiClient,
  useSuspendApiClient,
} from '@/hooks/queries/use-api-client-queries';
import { ApiClientInclude, ApiClientItem, ApiClientSortField } from '@/schemas/api-client';
import { RowData, TableMeta } from '@tanstack/react-table';
import { ApiClientForm } from './api-client-form';
import { ApiClientInfo } from './api-client-info';
import { ApiClientsToolbar } from './api-client-toolbar';
import { ApiClientInfoCrendentials } from './api-client-regenerate';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowViewCredentials?: (row: TData) => void;
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
    onRowSuspend?: (row: TData) => void;
    onRowActivate?: (row: TData) => void;
  }
}

export function ApiClients() {
  const [apiClient, setApiClient] = React.useState<ApiClientItem>();

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
  } = useDataTable<ApiClientSortField, ApiClientInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['roles'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useApiClients(queryParams);

  const { mutateAsync: deleteApiClient, isPending: isDeleting } = useDeleteApiClient();
  const { mutateAsync: activateApiClient, isPending: isActivating } = useActivateApiClient();
  const { mutateAsync: suspendApiClient, isPending: isSuspending } = useSuspendApiClient();

  // ---- Handlers ----

  // Extract filters for the toolbar
  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status) return [];
    if (typeof status === 'object' && 'in' in status) {
      return (status as { in: string[] }).in;
    }
    if (typeof status === 'string') return [status];
    return [];
  }, [filters.status]);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setApiClient(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setApiClient, setOpenedInfoSheet]
  );

  const [openedInfoCredentialsSheet, setOpenedInfoCredentialsSheet] = React.useState(false);
  const handleInfoCredentialsSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setApiClient(undefined);
      }
      setOpenedInfoCredentialsSheet(open);
    },
    [setApiClient, setOpenedInfoCredentialsSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setApiClient(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setApiClient, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!apiClient?.id) return;
    await deleteApiClient({ params: { id: apiClient.id } });
    setApiClient(undefined);
    setOpenedDeleteDialog(false);
  }, [apiClient, setApiClient, setOpenedDeleteDialog, deleteApiClient]);

  const [openedSuspendDialog, setOpenedSuspendDialog] = React.useState(false);
  const handleSuspend = React.useCallback(async () => {
    if (!apiClient?.id) return;
    await suspendApiClient({ params: { id: apiClient.id } });
    setApiClient(undefined);
    setOpenedSuspendDialog(false);
  }, [apiClient, setApiClient, setOpenedSuspendDialog, suspendApiClient]);

  const [openedActivateDialog, setOpenedActivateDialog] = React.useState(false);
  const handleActivate = React.useCallback(async () => {
    if (!apiClient?.id) return;
    await activateApiClient({ params: { id: apiClient.id } });
    setApiClient(undefined);
    setOpenedActivateDialog(false);
  }, [apiClient, setApiClient, setOpenedActivateDialog, activateApiClient]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowInfoCredentialOpen = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedInfoCredentialsSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedDeleteDialog(true);
  }, []);
  const handleRowSuspend = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedSuspendDialog(true);
  }, []);
  const handleRowActivate = React.useCallback((row: ApiClientItem) => {
    setApiClient(row);
    setOpenedActivateDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<ApiClientItem>>(
    () => ({
      onRowView: handleRowOpen,
      onRowViewCredentials: handleRowInfoCredentialOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
      onRowSuspend: handleRowSuspend,
      onRowActivate: handleRowActivate,
    }),
    [
      handleRowOpen,
      handleRowDelete,
      handleRowEdit,
      handleRowSuspend,
      handleRowActivate,
      handleRowInfoCredentialOpen,
    ]
  );

  return (
    <>
      <PageHeader
        title="Clientes API"
        description="Administra clientes API para autenticacion machine-to-machine."
      />
      <PageContent>
        <DataTable
          columns={apiClientColumns}
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
            <ApiClientsToolbar
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
              onReset={resetFilters}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No se encontraron clientes API. Intenta ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <ApiClientInfoCrendentials
        apiClient={apiClient}
        opened={openedInfoCredentialsSheet}
        onOpened={handleInfoCredentialsSheetChange}
      />
      <ApiClientInfo
        apiClient={apiClient}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <ApiClientForm
        apiClient={apiClient}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara el cliente API y se invalidaran todos
              sus tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting && <Spinner />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openedSuspendDialog} onOpenChange={setOpenedSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender cliente API?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente API quedara suspendido. No podra obtener tokens hasta ser reactivado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedSuspendDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSuspending} onClick={handleSuspend}>
              {isSuspending && <Spinner />}
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openedActivateDialog} onOpenChange={setOpenedActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activar cliente API?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reactivara el cliente API y le permitira obtener tokens nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedActivateDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isActivating} onClick={handleActivate}>
              {isActivating && <Spinner />}
              Activar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
