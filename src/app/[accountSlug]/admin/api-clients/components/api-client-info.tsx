'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/provider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ApiClientItem } from '@/schemas/api-client';
import { formatDate, formatDateTime } from '@/utils/formatters';

interface ApiClientInfoProps {
  apiClient: ApiClientItem | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}

export function ApiClientInfo({ apiClient, opened, onOpened }: ApiClientInfoProps) {
  const { locale, messages } = useI18n();
  if (!apiClient) return null;
  const statusLabel =
    apiClient.status === 'active'
      ? messages.admin.apiClients.labels.status.active
      : messages.admin.apiClients.labels.status.suspended;
  const formatAccessTokenExpiry = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (locale === 'en') {
      if (minutes === 0) return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
      if (secs === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${secs} ${
        secs === 1 ? 'second' : 'seconds'
      }`;
    }

    if (minutes === 0) return `${secs} ${secs === 1 ? 'segundo' : 'segundos'}`;
    if (secs === 0) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} ${secs} ${
      secs === 1 ? 'segundo' : 'segundos'
    }`;
  };

  const sections: DescriptionSection[] = [
    {
      title: messages.admin.apiClients.info.sections.basic,
      columns: 2,
      items: [
        { label: messages.admin.apiClients.info.fields.name, value: apiClient.name },
        { label: messages.admin.apiClients.info.fields.description, value: apiClient.description },
        {
          label: messages.admin.apiClients.info.fields.status,
          value: (
            <Badge variant={apiClient.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          ),
        },
        {
          label: messages.admin.apiClients.info.fields.accessTokenExp,
          value: formatAccessTokenExpiry(apiClient.accessTokenExp),
        },
      ],
    },
    {
      title: messages.admin.apiClients.info.sections.roles,
      items: [
        {
          label: messages.admin.apiClients.info.fields.assignedRoles,
          value: apiClient.roles?.length ? (
            <div className="flex flex-wrap gap-1">
              {apiClient.roles.map(({ role }) => (
                <Badge key={role?.id} variant="outline">
                  {role?.name}
                </Badge>
              ))}
            </div>
          ) : null,
          hidden: !apiClient.roles?.length,
        },
      ],
    },
    {
      title: messages.admin.apiClients.info.sections.activity,
      columns: 2,
      items: [
        {
          label: messages.admin.apiClients.info.fields.created,
          value: formatDate(apiClient.createdAt),
        },
        {
          label: messages.admin.apiClients.info.fields.updated,
          value: formatDate(apiClient.updatedAt),
        },
        {
          label: messages.admin.apiClients.info.fields.lastUsed,
          value: apiClient.lastUsedAt
            ? formatDateTime(apiClient.lastUsedAt)
            : messages.admin.apiClients.info.never,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{messages.admin.apiClients.info.title}</SheetTitle>
          <SheetDescription>{messages.admin.apiClients.info.description}</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
