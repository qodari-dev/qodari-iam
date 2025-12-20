import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { User } from '@/schemas/user';
import { formatDate } from '@/utils/formatters';
import { format } from 'date-fns';

export function UserInfo({
  user,
  opened,
  onOpened,
}: {
  user: User | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!user) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Basic Information',
      columns: 2,
      items: [
        { label: 'First Name', value: user.firstName },
        { label: 'Last Name', value: user.lastName },
        { label: 'Email', value: user.email },
        { label: 'Phone', value: user.phone },
      ],
    },
    {
      title: 'Account Status',
      columns: 2,
      items: [
        {
          label: 'Status',
          value: (
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {user.status}
            </Badge>
          ),
        },
        {
          label: 'Admin',
          value: (
            <Badge variant={user.isAdmin ? 'default' : 'outline'}>
              {user.isAdmin ? 'Yes' : 'No'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Roles',
      items: [
        {
          label: 'Assigned Roles',
          value: user.userRoles?.length ? (
            <div className="flex flex-wrap gap-1">
              {user.userRoles.map(({ role }) => (
                <Badge key={role?.id} variant="outline">
                  {role?.name}
                </Badge>
              ))}
            </div>
          ) : null,
          hidden: !user.userRoles?.length,
        },
      ],
    },
    {
      title: 'Activity',
      columns: 2,
      items: [
        {
          label: 'Created',
          value: formatDate(user.createdAt),
        },
        {
          label: 'Updated',
          value: formatDate(user.updatedAt),
        },
        {
          label: 'Last Login',
          value: user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP p') : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Info</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
