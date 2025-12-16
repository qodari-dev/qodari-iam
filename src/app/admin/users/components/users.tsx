'use client';
import { Button } from '@/components/ui/button';
import { PageHeader, PageContent } from '@/components/layout';
import { useUsers } from '@/hooks/queries/use-user-queries';
import { DataTable } from './data-table';
import { columns } from './columns';

export function Users() {
  const { data } = useUsers();

  return (
    <>
      <PageHeader title="Users" description="Manage users." actions={<Button>New</Button>} />
      <PageContent>
        <div>some table</div>
        <DataTable columns={columns} data={data?.body?.data ?? []} />
      </PageContent>
    </>
  );
}
