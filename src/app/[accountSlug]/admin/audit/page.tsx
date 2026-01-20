import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchAuditLogs } from '@/hooks/queries/use-audit-queries';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { AuditLogs } from './components/audit-logs';

export default async function AuditPage() {
  const queryClient = new QueryClient();
  await prefetchAuditLogs(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
        permissionKey="audit:read"
      >
        <AuditLogs />
      </PageLayout>
    </HydrationBoundary>
  );
}
