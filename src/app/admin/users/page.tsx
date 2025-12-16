import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchUsers } from '@/hooks/queries/use-user-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Users } from './components/users';

export default async function AdminPage() {
  const queryClient = new QueryClient();
  await prefetchUsers(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Usuarios' }]}
        permissionKey="xxxxx"
      >
        <Users />
      </PageLayout>
    </HydrationBoundary>
  );
}
