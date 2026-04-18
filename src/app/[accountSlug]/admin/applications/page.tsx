import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Applications } from './components/applications';
import { prefetchApplications } from '@/hooks/queries/use-application-queries';

export default async function ApplicationsPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const queryClient = new QueryClient();
  await prefetchApplications(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: messages.admin.breadcrumb.root, href: '/admin' },
          { label: messages.admin.applications.breadcrumb },
        ]}
        permissionKey="applications:read"
      >
        <Applications />
      </PageLayout>
    </HydrationBoundary>
  );
}
