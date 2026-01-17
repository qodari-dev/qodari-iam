import { redirect, notFound } from 'next/navigation';
import { api } from '@/clients/api';
import { env } from '@/env';

export default async function RootPage() {
  const defaultAccountSlug = env.IAM_DEFAULT_ACCOUNT_SLUG;

  // If no default account is configured, show 404
  if (!defaultAccountSlug) {
    notFound();
  }

  // Check if user is authenticated
  const result = await api.auth.me.query({
    query: undefined,
  });

  if (result.status === 401) {
    // Not authenticated, redirect to login
    redirect(`/${defaultAccountSlug}/login`);
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  // Authenticated, redirect to portal
  redirect(`/${defaultAccountSlug}/portal`);
}
