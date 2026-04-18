import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { User } from '@/schemas/user';

export function UserInfo({
  user,
  opened,
  onOpened,
}: {
  user: User | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { locale, messages } = useI18n();
  if (!user) return null;
  const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
  const isLocked = Boolean(user.lockedUntil);
  const statusLabel =
    user.status === 'active'
      ? messages.admin.users.labels.status.active
      : messages.admin.users.labels.status.suspended;
  const formatDateOnly = (value: Date | string | null | undefined) => {
    if (!value) return null;
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  };
  const formatDateTime = (value: Date | string | null | undefined) => {
    if (!value) return null;
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  };

  const sections: DescriptionSection[] = [
    {
      title: messages.admin.users.info.sections.basic,
      columns: 2,
      items: [
        { label: messages.admin.users.info.fields.firstName, value: user.firstName },
        { label: messages.admin.users.info.fields.lastName, value: user.lastName },
        { label: messages.admin.users.info.fields.email, value: user.email },
        { label: messages.admin.users.info.fields.phone, value: user.phone },
      ],
    },
    {
      title: messages.admin.users.info.sections.account,
      columns: 2,
      items: [
        {
          label: messages.admin.users.info.fields.status,
          value: (
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          ),
        },
        {
          label: messages.admin.users.info.fields.administrator,
          value: (
            <Badge variant={user.isAdmin ? 'default' : 'outline'}>
              {user.isAdmin ? messages.admin.users.info.labels.yes : messages.admin.users.info.labels.no}
            </Badge>
          ),
        },
        {
          label: messages.admin.users.info.fields.employee,
          value: (
            <Badge variant={user.isEmployee ? 'default' : 'outline'}>
              {user.isEmployee ? messages.admin.users.info.labels.yes : messages.admin.users.info.labels.no}
            </Badge>
          ),
        },
        {
          label: messages.admin.users.info.fields.locked,
          value: (
            <Badge variant={isLocked ? 'destructive' : 'secondary'}>
              {isLocked ? messages.admin.users.info.labels.yes : messages.admin.users.info.labels.no}
            </Badge>
          ),
        },
        {
          label: messages.admin.users.info.fields.failedAttempts,
          value: user.failedLoginAttempts,
        },
        {
          label: messages.admin.users.info.fields.lockedUntil,
          value: lockedUntil ? formatDateTime(lockedUntil) : null,
        },
      ],
    },
    {
      title: messages.admin.users.info.sections.roles,
      items: [
        {
          label: messages.admin.users.info.fields.assignedRoles,
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
      title: messages.admin.users.info.sections.activity,
      columns: 2,
      items: [
        {
          label: messages.admin.users.info.fields.created,
          value: formatDateOnly(user.createdAt),
        },
        {
          label: messages.admin.users.info.fields.updated,
          value: formatDateOnly(user.updatedAt),
        },
        {
          label: messages.admin.users.info.fields.lastLogin,
          value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{messages.admin.users.info.title}</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
