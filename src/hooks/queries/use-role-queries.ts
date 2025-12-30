import { api } from '@/clients/api';
import type { ListRolesQuery } from '@/schemas/role';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const rolesKeys = {
  all: ['roles'] as const,

  lists: () => [...rolesKeys.all, 'list'] as const,
  list: (filters: Partial<ListRolesQuery> = {}) => [...rolesKeys.lists(), filters] as const,

  details: () => [...rolesKeys.all, 'detail'] as const,
  detail: (id: string) => [...rolesKeys.details(), id] as const,
};

function defaultQuery(filters?: Partial<ListRolesQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['application', 'permissions'],
    sort: filters?.sort ?? [{ field: 'createdAt', order: 'desc' }],
    where: filters?.where,
    search: filters?.search,
  } as ListRolesQuery;
  return query;
}

export function useRoles(filters: Partial<ListRolesQuery> = {}) {
  const query = defaultQuery(filters);

  return api.role.list.useQuery({
    queryKey: rolesKeys.list(query),
    queryData: { query },
  });
}

export function useRole(
  id: string,
  options?: Partial<Pick<ListRolesQuery, 'include'>> & { enabled?: boolean }
) {
  return api.role.getById.useQuery({
    queryKey: rolesKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateRole() {
  const queryClient = api.useQueryClient();

  return api.role.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
      toast.success('Role creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateRole() {
  const queryClient = api.useQueryClient();

  return api.role.update.useMutation({
    onSuccess: (_, variables) => {
      const roleId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: rolesKeys.detail(roleId) });
      toast.success('Role actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteRole() {
  const queryClient = api.useQueryClient();

  return api.role.delete.useMutation({
    onSuccess: (_, variables) => {
      const roleId = variables.params.id;
      queryClient.removeQueries({ queryKey: rolesKeys.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
      toast.success('Usuario eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchRoles(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListRolesQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: rolesKeys.list(query),
    queryFn: () => api.role.list.query({ query }),
  });
  return;
}
