import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Applications } from './components/applications';
import { prefetchApplications } from '@/hooks/queries/use-application-queries';

export default async function ApplicationsPage() {
  const queryClient = new QueryClient();
  await prefetchApplications(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Applications' }]}
        permissionKey="applications:read"
      >
        <Applications />
      </PageLayout>
    </HydrationBoundary>
  );
}
