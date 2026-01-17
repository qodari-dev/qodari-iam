import { api } from '@/clients/api';
import { env } from '@/env';
import { AuthStoreProvider } from '@/stores/auth-store-provider';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

type Props = {
  params: Promise<{ accountSlug: string }>;
  children: ReactNode;
};

export default async function PortalLayout({ params, children }: Props) {
  const { accountSlug } = await params;

  const result = await api.auth.me.query({
    query: { appSlug: env.IAM_APP_SLUG },
  });

  if (result.status === 401) {
    redirect(`/${accountSlug}/login?redirect=${encodeURIComponent(`/${accountSlug}/portal`)}`);
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  const auth = result.body;

  return <AuthStoreProvider initialAuth={auth}>{children}</AuthStoreProvider>;
}
