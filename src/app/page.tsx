import { redirect } from 'next/navigation';
import { api } from '@/clients/api';

export default async function RootPage() {
  const result = await api.auth.me.query({
    query: undefined,
  });

  if (result.status === 401) {
    redirect('/auth/login');
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  redirect('/portal');
}
