import { api } from '@/clients/api';
import { env } from '@/env';
import { AuthStoreProvider } from '@/stores/auth-store-provider';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const result = await api.auth.me.query({
    query: { appSlug: env.IAM_APP_SLUG },
    headers: { cookie: cookieHeader },
  });

  if (result.status === 401) {
    redirect(`/auth/login?next=${encodeURIComponent('/admin')}`);
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  const auth = result.body;

  return <AuthStoreProvider initialAuth={auth}>{children}</AuthStoreProvider>;
}
