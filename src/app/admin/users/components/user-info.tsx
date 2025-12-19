import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Mail, User as UserIcon, Phone, Shield, Calendar, Clock, Users } from 'lucide-react';
import { User } from '@/schemas/user';
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
        { label: 'Email', value: user.email, icon: <Mail /> },
        { label: 'Phone', value: user.phone, icon: <Phone /> },
        { label: 'First Name', value: user.firstName, icon: <UserIcon /> },
        { label: 'Last Name', value: user.lastName, icon: <UserIcon /> },
      ],
    },
    {
      title: 'Account Status',
      columns: 2,
      items: [
        {
          label: 'Status',
          icon: <Shield />,
          value: (
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {user.status}
            </Badge>
          ),
        },
        {
          label: 'Admin',
          icon: <Shield />,
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
          icon: <Users />,
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
          icon: <Calendar />,
          value: format(new Date(user.createdAt), 'PPP'),
        },
        {
          label: 'Last Login',
          icon: <Clock />,
          value: user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP p') : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Are you absolutely sure {user?.email}?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
