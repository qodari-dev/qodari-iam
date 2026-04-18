import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
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
  const { messages } = useI18n();
  if (!role) return null;

  const sections: DescriptionSection[] = [
    {
      title: messages.admin.roles.info.sections.basic,
      columns: 2,
      items: [
        { label: messages.admin.roles.info.fields.name, value: role.name },
        { label: messages.admin.roles.info.fields.slug, value: role.slug },
        { label: messages.admin.roles.info.fields.application, value: role?.application?.name ?? '—' },
      ],
    },
    {
      title: messages.admin.roles.info.sections.permissions,
      items: [
        {
          label: messages.admin.roles.info.fields.assignedPermissions,
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
      title: messages.admin.roles.info.sections.activity,
      columns: 2,
      items: [
        { label: messages.admin.roles.info.fields.created, value: formatDate(role.createdAt) },
        { label: messages.admin.roles.info.fields.updated, value: formatDate(role.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{messages.admin.roles.info.title}</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
