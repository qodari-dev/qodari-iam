import { PageLayout } from '@/components/sidebar/page-layout';

export default async function AdminPage() {
  return <PageLayout breadcrumbs={[{ label: 'Dashboard' }]}>&nbsp;</PageLayout>;
}
