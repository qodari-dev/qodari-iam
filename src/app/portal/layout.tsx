import { api } from '@/clients/api';
import { env } from '@/env';
import { AuthStoreProvider } from '@/stores/auth-store-provider';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const result = await api.auth.me.query({
    query: { appSlug: env.IAM_APP_SLUG },
  });

  if (result.status === 401) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal')}`);
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  const auth = result.body;

  return <AuthStoreProvider initialAuth={auth}>{children}</AuthStoreProvider>;
}
