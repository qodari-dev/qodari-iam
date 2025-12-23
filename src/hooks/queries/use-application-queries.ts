import { api } from '@/clients/api';
import type { ListApplicationsQuery } from '@/schemas/application';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const applicationsKeys = {
  all: ['applications'] as const,

  lists: () => [...applicationsKeys.all, 'list'] as const,
  list: (filters: Partial<ListApplicationsQuery> = {}) =>
    [...applicationsKeys.lists(), filters] as const,

  details: () => [...applicationsKeys.all, 'detail'] as const,
  detail: (params: string | { id: string; include?: string[] }) =>
    [...applicationsKeys.details(), params] as const,
};

function defaultQuery(filters?: Partial<ListApplicationsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['permissions'],
    sort: filters?.sort ?? [{ field: 'createdAt', order: 'desc' }],
    where: filters?.where,
    search: filters?.search,
  } as ListApplicationsQuery;
  return query;
}

export function useApplications(filters: Partial<ListApplicationsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.application.list.useQuery({
    queryKey: applicationsKeys.list(query),
    queryData: { query },
  });
}

export function useApplication(
  id: string,
  options?: Pick<ListApplicationsQuery, 'include'> & { enabled?: boolean }
) {
  return api.application.getById.useQuery({
    queryKey: applicationsKeys.detail({ id }),
    queryData: {
      params: { id },
      query: { include: options?.include ?? defaultQuery().include },
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateApplication() {
  const queryClient = api.useQueryClient();

  return api.application.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      toast.success('Aplicación creada exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateApplication() {
  const queryClient = api.useQueryClient();

  return api.application.update.useMutation({
    onSuccess: (_, variables) => {
      const appId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationsKeys.detail(appId) });
      toast.success('Aplicación actualizada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteApplication() {
  const queryClient = api.useQueryClient();

  return api.application.delete.useMutation({
    onSuccess: (_, variables) => {
      const appId = variables.params.id;
      queryClient.removeQueries({ queryKey: applicationsKeys.detail(appId) });
      queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      toast.success('Aplicación eliminada');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchApplications(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListApplicationsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: applicationsKeys.list(query),
    queryFn: () => api.application.list.query({ query }),
  });
  return;
}
