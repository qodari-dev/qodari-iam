'use client';
import { Button } from '@/components/ui/button';
import { PageHeader, PageContent } from '@/components/layout';
import { useUsers } from '@/hooks/queries/use-user-queries';

export function Users() {
  const { data } = useUsers();
  console.log(data);

  return (
    <>
      <PageHeader title="Users" description="Manage users." actions={<Button>New</Button>} />
      <PageContent>
        <div>some table</div>
      </PageContent>
    </>
  );
}
