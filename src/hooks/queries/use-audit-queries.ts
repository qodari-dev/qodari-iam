import { api } from '@/clients/api';
import type { ListAuditLogsQuery, AuditLogExportQuery } from '@/schemas/audit';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const auditLogsKeys = {
  all: ['auditLogs'] as const,

  lists: () => [...auditLogsKeys.all, 'list'] as const,
  list: (filters: Partial<ListAuditLogsQuery> = {}) => [...auditLogsKeys.lists(), filters] as const,

  details: () => [...auditLogsKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogsKeys.details(), id] as const,

  exports: () => [...auditLogsKeys.all, 'export'] as const,
  export: (filters: Partial<AuditLogExportQuery> = {}) => [...auditLogsKeys.exports(), filters] as const,
};

function defaultQuery(filters?: Partial<ListAuditLogsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? [],
    sort: filters?.sort ?? [{ field: 'createdAt', order: 'desc' as const }],
    where: filters?.where,
    search: filters?.search,
  } as ListAuditLogsQuery;
  return query;
}

export function useAuditLogs(filters: Partial<ListAuditLogsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.audit.list.useQuery({
    queryKey: auditLogsKeys.list(query),
    queryData: { query },
  });
}

export function useAuditLog(
  id: string,
  options?: Partial<Pick<ListAuditLogsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.audit.getById.useQuery({
    queryKey: auditLogsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? [] } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateAuditLog() {
  const queryClient = api.useQueryClient();

  return api.audit.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditLogsKeys.lists() });
      toast.success('Audit log created');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchAuditLogs(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListAuditLogsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: auditLogsKeys.list(query),
    queryFn: () => api.audit.list.query({ query }),
  });
  return;
}

export function useExportAuditLogs() {
  return api.audit.export.useQuery;
}
