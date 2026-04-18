import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchAuditLogs } from '@/hooks/queries/use-audit-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AuditLogs } from './components/audit-logs';

export default async function AuditPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const queryClient = new QueryClient();
  await prefetchAuditLogs(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: messages.admin.breadcrumb.root, href: '/admin' },
          { label: messages.admin.audit.breadcrumb },
        ]}
        permissionKey="audit:read"
      >
        <AuditLogs />
      </PageLayout>
    </HydrationBoundary>
  );
}
