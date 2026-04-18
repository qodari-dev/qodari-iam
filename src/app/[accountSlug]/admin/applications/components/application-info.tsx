import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
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
  const { messages } = useI18n();
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
      toast.success(messages.common.copiedToClipboard);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(messages.common.copyToClipboardFailed);
    }
  };
  if (!application) return null;

  const logoUrl = getStorageUrl(application.logo);
  const portalUrl = getStorageUrl(application.image);
  const authUrl = getStorageUrl(application.imageAd);
  const statusLabel =
    application.status === 'active'
      ? messages.admin.applications.info.labels.status.active
      : messages.admin.applications.info.labels.status.suspended;
  const clientTypeLabel =
    application.clientType === 'public'
      ? messages.admin.applications.info.labels.clientType.public
      : messages.admin.applications.info.labels.clientType.confidential;
  const mfaLabel = application.mfaEnabled
    ? messages.admin.applications.info.labels.mfa.enabled
    : messages.admin.applications.info.labels.mfa.disabled;

  const sections: DescriptionSection[] = [
    {
      title: messages.admin.applications.info.sections.basic,
      columns: 2,
      items: [
        { label: messages.admin.applications.info.fields.name, value: application.name },
        { label: messages.admin.applications.info.fields.slug, value: application.slug },
        { label: messages.admin.applications.info.fields.clientType, value: clientTypeLabel },
        {
          label: messages.admin.applications.info.fields.mfa,
          value: (
            <Badge variant={application.mfaEnabled ? 'default' : 'secondary'}>{mfaLabel}</Badge>
          ),
        },
        {
          label: messages.admin.applications.info.fields.status,
          value: (
            <Badge variant={application.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          ),
        },
        {
          label: messages.admin.applications.info.fields.logo,
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
        {
          label: messages.admin.applications.info.fields.portalImage,
          value: portalUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
              <Image
                src={portalUrl}
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
        {
          label: messages.admin.applications.info.fields.authImage,
          value: authUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
              <Image
                src={authUrl}
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
      title: messages.admin.applications.info.sections.urls,
      columns: 1,
      items: [
        { label: messages.admin.applications.info.fields.homeUrl, value: application.homeUrl ?? '—' },
        {
          label: messages.admin.applications.info.fields.logoutUrls,
          value:
            application.logoutUrl && application.logoutUrl.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {application.logoutUrl.map((url, index) => (
                  <li key={index} className="text-sm break-all">
                    {url}
                  </li>
                ))}
              </ul>
            ) : (
              '—'
            ),
        },
        {
          label: messages.admin.applications.info.fields.callbackUrls,
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
      title: messages.admin.applications.info.sections.permissions,
      items: [
        {
          label: messages.admin.applications.info.fields.definedPermissions,
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
      title: messages.admin.applications.info.sections.activity,
      columns: 2,
      items: [
        { label: messages.admin.applications.info.fields.created, value: formatDate(application.createdAt) },
        { label: messages.admin.applications.info.fields.updated, value: formatDate(application.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{messages.admin.applications.info.title}</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
          <div className="mt-4 space-y-4">
            <h4 className="text-md font-semibold">{messages.admin.applications.info.credentials}</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {messages.admin.applications.info.credentialsFields.jwtSecret}
              </label>
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
              <label className="text-sm font-medium">
                {messages.admin.applications.info.credentialsFields.clientId}
              </label>
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
              <label className="text-sm font-medium">
                {messages.admin.applications.info.credentialsFields.clientSecret}
              </label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
                  {messages.admin.applications.info.credentialsFields.maskedSecret}
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
