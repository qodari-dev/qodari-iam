'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ApiClientItem } from '@/schemas/api-client';
import { formatDate, formatDateTime, formatExpiry } from '@/utils/formatters';

interface ApiClientInfoProps {
  apiClient: ApiClientItem | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}

export function ApiClientInfo({ apiClient, opened, onOpened }: ApiClientInfoProps) {
  if (!apiClient) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Basic Information',
      columns: 2,
      items: [
        { label: 'Name', value: apiClient.name },
        { label: 'Description', value: apiClient.description },
        {
          label: 'Status',
          value: (
            <Badge variant={apiClient.status === 'active' ? 'default' : 'secondary'}>
              {apiClient.status}
            </Badge>
          ),
        },
        { label: 'Access Token Expiration', value: formatExpiry(apiClient.accessTokenExp) },
      ],
    },
    {
      title: 'Roles',
      items: [
        {
          label: 'Assigned Roles',
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
      title: 'Activity',
      columns: 2,
      items: [
        {
          label: 'Created',
          value: formatDate(apiClient.createdAt),
        },
        {
          label: 'Updated',
          value: formatDate(apiClient.updatedAt),
        },
        {
          label: 'Last Used',
          value: apiClient.lastUsedAt ? formatDateTime(apiClient.lastUsedAt) : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>API Client Details</SheetTitle>
          <SheetDescription>View information about this API client.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
