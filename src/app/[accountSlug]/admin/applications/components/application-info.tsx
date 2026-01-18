import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Application } from '@/schemas/application';
import { formatDate } from '@/utils/formatters';
import { getStorageUrl } from '@/utils/storage';
import Image from 'next/image';

export function ApplicationInfo({
  application,
  opened,
  onOpened,
}: {
  application: Application | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!application) return null;

  const logoUrl = getStorageUrl(application.logo);

  const sections: DescriptionSection[] = [
    {
      title: 'Basics',
      columns: 2,
      items: [
        { label: 'Name', value: application.name },
        { label: 'Slug', value: application.slug },
        { label: 'Client Type', value: application.clientType },
        {
          label: 'Status',
          value: (
            <Badge variant={application.status === 'active' ? 'default' : 'secondary'}>
              {application.status}
            </Badge>
          ),
        },
        {
          label: 'Logo',
          value: logoUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
              <Image src={logoUrl} alt={application.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            '—'
          ),
        },
      ],
    },
    {
      title: 'URLs',
      columns: 1,
      items: [
        { label: 'Home URL', value: application.homeUrl ?? '—' },
        { label: 'Logout URL', value: application.logoutUrl ?? '—' },
        {
          label: 'Callback URLs',
          value:
            application.callbackUrls && application.callbackUrls.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {application.callbackUrls.map((url, index) => (
                  <li key={index} className="text-sm break-all">
                    {url}
                  </li>
                ))}
              </ul>
            ) : (
              '—'
            ),
        },
      ],
    },
    {
      title: 'Permissions',
      items: [
        {
          label: 'Defined Permissions',
          value: application.permissions?.length ? (
            <div className="flex flex-wrap gap-1">
              {application.permissions.map((p) => (
                <Badge key={`${p.resource}:${p.action}`} variant="outline" className="text-[11px]">
                  {p.resource}:{p.action}
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
        { label: 'Created', value: formatDate(application.createdAt) },
        { label: 'Updated', value: formatDate(application.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Application</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
