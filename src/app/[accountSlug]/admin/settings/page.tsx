import { PageLayout } from '@/components/sidebar/page-layout';
import { AccountSettings } from './components/account-settings';

export default function SettingsPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Configuracion' }]}
      permissionKey="admin:access"
    >
      <AccountSettings />
    </PageLayout>
  );
}
