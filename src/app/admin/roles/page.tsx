import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Roles } from './components/roles';
import { prefetchRoles } from '@/hooks/queries/use-role-queries';

export default async function RolesPage() {
  const queryClient = new QueryClient();
  await prefetchRoles(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Roles' }]}
        permissionKey="roles:read"
      >
        <Roles />
      </PageLayout>
    </HydrationBoundary>
  );
}
