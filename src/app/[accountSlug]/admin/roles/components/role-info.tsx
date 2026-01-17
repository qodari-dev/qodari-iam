import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Role } from '@/schemas/role';
import { formatDate } from '@/utils/formatters';

export function RoleInfo({
  role,
  opened,
  onOpened,
}: {
  role: Role | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!role) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Basics',
      columns: 2,
      items: [
        { label: 'Name', value: role.name },
        { label: 'Slug', value: role.slug },
        { label: 'Application', value: role?.application?.name ?? '—' },
      ],
    },
    {
      title: 'Permissions',
      items: [
        {
          label: 'Assigned Permissions',
          value: role?.rolePermissions?.length ? (
            <div className="flex flex-wrap gap-1">
              {role.rolePermissions.map((rp) => (
                <Badge
                  key={rp.permission?.id ?? rp.permissionId}
                  variant="outline"
                  className="text-[11px]"
                >
                  {rp.permission?.resource}:{rp.permission?.action}
                </Badge>
              ))}
            </div>
          ) : (
            '—'
          ),
        },
      ],
    },
    {
      title: 'Activity',
      columns: 2,
      items: [
        { label: 'Created', value: formatDate(role.createdAt) },
        { label: 'Updated', value: formatDate(role.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Role</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
