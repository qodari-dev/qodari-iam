import { api } from '@/clients/api';
import { useI18n } from '@/i18n/provider';
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

function defaultQuery(filters?: Partial<ListUsersQuery>) {
  const query = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    include: filters?.include ?? ['roles'],
    sort: filters?.sort ?? [],
    where: filters?.where,
    search: filters?.search,
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

export function useUser(
  id: string,
  options?: Partial<Pick<ListUsersQuery, 'include'>> & { enabled?: boolean }
) {
  return api.user.getById.useQuery({
    queryKey: usersKeys.detail(id),
    queryData: { params: { id }, query: { include: options?.include ?? defaultQuery().include } },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(messages.admin.users.toast.created);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useUpdateUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.update.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      toast.success(messages.admin.users.toast.updated);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useDeleteUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.delete.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.removeQueries({ queryKey: usersKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(messages.admin.users.toast.deleted);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useSetUserPassword() {
  const { locale, messages } = useI18n();
  return api.user.setPassword.useMutation({
    onSuccess: () => {
      toast.success(messages.admin.users.toast.passwordUpdated);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useSuspendUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.suspend.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      toast.success(messages.admin.users.toast.suspended);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useActivateUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.activate.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      toast.success(messages.admin.users.toast.activated);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
    },
  });
}

export function useUnlockUser() {
  const { locale, messages } = useI18n();
  const queryClient = api.useQueryClient();

  return api.user.unlock.useMutation({
    onSuccess: (_, variables) => {
      const userId = variables.params.id;
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      toast.success(messages.admin.users.toast.unlocked);
    },
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error, locale));
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
    queryFn: () => api.user.list.query({ query }),
  });
  return;
}
