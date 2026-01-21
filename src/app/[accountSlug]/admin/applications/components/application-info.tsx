import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Application } from '@/schemas/application';
import { formatDate } from '@/utils/formatters';
import { getStorageUrl } from '@/utils/storage';
import { Check, Copy } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

export function ApplicationInfo({
  application,
  opened,
  onOpened,
}: {
  application: Application | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const [copiedField, setCopiedField] = useState<
    'clientId' | 'clientSecret' | 'clientJwtSecret' | null
  >(null);

  const copyToClipboard = async (
    text: string,
    field: 'clientId' | 'clientSecret' | 'clientJwtSecret'
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };
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
              <Image
                src={logoUrl}
                alt={application.name}
                fill
                className="object-cover"
                unoptimized
              />
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
              <ul className="list-inside list-disc space-y-1">
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
          <div className="mt-4 space-y-4">
            <h4 className="text-md font-semibold">Credentials</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jwt Secret</label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
                  {application.clientJwtSecret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(application.clientJwtSecret, 'clientJwtSecret')}
                >
                  {copiedField === 'clientJwtSecret' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
                  {application.clientId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(application.clientId, 'clientId')}
                >
                  {copiedField === 'clientId' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
                  **********************
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(application.clientSecret, 'clientSecret')}
                >
                  {copiedField === 'clientSecret' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
