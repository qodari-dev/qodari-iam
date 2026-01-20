import { api } from '@/clients/api';
import type { ListApiClientsQuery } from '@/schemas/api-client';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const apiClientsKeys = {
  all: ['api-clients'] as const,

  lists: () => [...apiClientsKeys.all, 'list'] as const,
  list: (filters: Partial<ListApiClientsQuery> = {}) => [...apiClientsKeys.lists(), filters] as const,

  details: () => [...apiClientsKeys.all, 'detail'] as const,
  detail: (id: string) => [...apiClientsKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListApiClientsQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['roles'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
  } as ListApiClientsQuery;
  return query;
}

export function useApiClients(filters: Partial<ListApiClientsQuery> = {}) {
  const query = defaultQuery(filters);

  return api.apiClient.list.useQuery({
    queryKey: apiClientsKeys.list(query),
    queryData: { query },
  });
}

export function useApiClient(
  id: string,
  options?: Partial<Pick<ListApiClientsQuery, 'include'>> & { enabled?: boolean }
) {
  return api.apiClient.getById.useQuery({
    queryKey: apiClientsKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateApiClient() {
  const queryClient = api.useQueryClient();

  return api.apiClient.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.lists() });
      toast.success('API Client created successfully');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateApiClient() {
  const queryClient = api.useQueryClient();

  return api.apiClient.update.useMutation({
    onSuccess: (_, variables) => {
      const clientId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.detail(clientId) });
      toast.success('API Client updated');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteApiClient() {
  const queryClient = api.useQueryClient();

  return api.apiClient.delete.useMutation({
    onSuccess: (_, variables) => {
      const clientId = variables.params.id;
      queryClient.removeQueries({ queryKey: apiClientsKeys.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.lists() });
      toast.success('API Client deleted');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useRegenerateApiClientSecret() {
  return api.apiClient.regenerateSecret.useMutation({
    onSuccess: () => {
      toast.success('Secret regenerated');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useSuspendApiClient() {
  const queryClient = api.useQueryClient();

  return api.apiClient.suspend.useMutation({
    onSuccess: (_, variables) => {
      const clientId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.detail(clientId) });
      toast.success('API Client suspended');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useActivateApiClient() {
  const queryClient = api.useQueryClient();

  return api.apiClient.activate.useMutation({
    onSuccess: (_, variables) => {
      const clientId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiClientsKeys.detail(clientId) });
      toast.success('API Client activated');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchApiClients(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListApiClientsQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: apiClientsKeys.list(query),
    queryFn: () => api.apiClient.list.query({ query }),
  });
  return;
}
