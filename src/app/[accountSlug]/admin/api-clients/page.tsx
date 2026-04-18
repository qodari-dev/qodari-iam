import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchApiClients } from '@/hooks/queries/use-api-client-queries';
import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ApiClients } from './components/api-clients';

export default async function ApiClientsPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const queryClient = new QueryClient();
  await prefetchApiClients(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: messages.admin.breadcrumb.root, href: '/admin' },
          { label: messages.admin.apiClients.breadcrumb },
        ]}
        permissionKey="api-clients:read"
      >
        <ApiClients />
      </PageLayout>
    </HydrationBoundary>
  );
}
