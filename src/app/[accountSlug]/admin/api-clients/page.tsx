import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchApiClients } from '@/hooks/queries/use-api-client-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ApiClients } from './components/api-clients';

export default async function ApiClientsPage() {
  const queryClient = new QueryClient();
  await prefetchApiClients(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'API Clients' }]}
        permissionKey="api-clients:read"
      >
        <ApiClients />
      </PageLayout>
    </HydrationBoundary>
  );
}
