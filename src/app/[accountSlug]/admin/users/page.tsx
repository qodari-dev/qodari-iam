import { PageLayout } from '@/components/sidebar/page-layout';
import { prefetchUsers } from '@/hooks/queries/use-user-queries';
import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Users } from './components/users';

export default async function UserPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const queryClient = new QueryClient();
  await prefetchUsers(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageLayout
        breadcrumbs={[
          { label: messages.admin.breadcrumb.root, href: '/admin' },
          { label: messages.admin.users.breadcrumb },
        ]}
        permissionKey="users:read"
      >
        <Users />
      </PageLayout>
    </HydrationBoundary>
  );
}
