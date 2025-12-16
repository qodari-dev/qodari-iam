import { api } from '@/clients/api';
import type { ListUsersQuery } from '@/schemas/user';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usersKeys = {
  all: ['users'] as const,

  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters: Partial<ListUsersQuery> = {}) => [...usersKeys.lists(), filters] as const,

  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
};

function defaultQuery(filters: Partial<ListUsersQuery>) {
  const query = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    include: filters.include ?? ['roles', 'sessions'],
    sort: filters.sort ?? [],
    where: filters.where,
  } as ListUsersQuery;
  return query;
}

export function useUsers(filters: Partial<ListUsersQuery> = {}) {
  const query = defaultQuery(filters);

  return api.user.list.useQuery({
    queryKey: usersKeys.list(query),
    queryData: { query },
  });
}

export function useUser(id: string, options?: { enabled?: boolean }) {
  return api.user.getById.useQuery({
    queryKey: usersKeys.detail(id),
    queryData: { params: { id } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateUser() {
  const queryClient = api.useQueryClient();

  return api.user.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUpdateUser() {
  const queryClient = api.useQueryClient();

  return api.user.update.useMutation({
    onSuccess: (data, variables) => {
      const userId = variables.params.id;
      queryClient.setQueryData(usersKeys.detail(userId), data.body);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useDeleteUser() {
  const queryClient = api.useQueryClient();

  return api.user.delete.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.removeQueries({ queryKey: usersKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario eliminado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useSetUserPassword() {
  return api.user.setPassword.useMutation({
    onSuccess: () => {
      toast.success('Password actualizado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useSuspendUser() {
  const queryClient = api.useQueryClient();

  return api.user.suspend.useMutation({
    onSuccess: (data, variables) => {
      const userId = variables.params.id;
      queryClient.setQueryData(usersKeys.detail(userId), data.body);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario suspendido');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useActivateUser() {
  const queryClient = api.useQueryClient();

  return api.user.activate.useMutation({
    onSuccess: (data, variables) => {
      const userId = variables.params.id;
      queryClient.setQueryData(usersKeys.detail(userId), data.body);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario activado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useUnlockUser() {
  const queryClient = api.useQueryClient();

  return api.user.unlock.useMutation({
    onSuccess: (data, variables) => {
      const userId = variables.params.id;
      queryClient.setQueryData(usersKeys.detail(userId), data.body);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success('Usuario desbloqueado');
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export async function prefetchUsers(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: Partial<ListUsersQuery> = {}
) {
  const query = defaultQuery(filters);

  await queryClient.prefetchQuery({
    queryKey: usersKeys.list(query),
    queryFn: async () => {
      const result = await api.user.list.query({ query });
      if (result.status !== 200) {
        throw new Error('Error prefetching');
      }
      return result.body;
    },
  });
  return;
}
