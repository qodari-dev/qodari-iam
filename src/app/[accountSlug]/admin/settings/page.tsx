import { getMessages } from '@/i18n';
import { getCurrentLocale } from '@/i18n/server';
import { PageLayout } from '@/components/sidebar/page-layout';
import { AccountSettings } from './components/account-settings';

export default async function SettingsPage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);

  return (
    <PageLayout
      breadcrumbs={[
        { label: messages.admin.breadcrumb.root, href: '/admin' },
        { label: messages.admin.settings.breadcrumb },
      ]}
      permissionKey="admin:access"
    >
      <AccountSettings />
    </PageLayout>
  );
}
