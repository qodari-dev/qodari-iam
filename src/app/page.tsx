import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '@/clients/api';
import { SESSION_COOKIE_NAME } from '@/server/utils/session';

export default async function RootPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    redirect('/auth/login');
  }

  const cookieHeader = `${SESSION_COOKIE_NAME}=${sessionCookie.value}`;

  const result = await api.auth.me.query({
    query: undefined,
    headers: { cookie: cookieHeader },
  });

  if (result.status === 401) {
    redirect('/auth/login');
  }

  if (result.status !== 200) {
    throw new Error('Failed to load auth context');
  }

  redirect('/portal');
}
