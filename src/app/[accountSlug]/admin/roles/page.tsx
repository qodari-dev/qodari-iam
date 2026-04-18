import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { PageLayout } from '@/components/sidebar/page-layout';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Roles } from './components/roles';
import { prefetchRoles } from '@/hooks/queries/use-role-queries';

export default async function RolesPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const queryClient = new QueryClient();
  await prefetchRoles(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: messages.admin.breadcrumb.root, href: '/admin' },
          { label: messages.admin.roles.breadcrumb },
        ]}
        permissionKey="roles:read"
      >
        <Roles />
      </PageLayout>
    </HydrationBoundary>
  );
}
