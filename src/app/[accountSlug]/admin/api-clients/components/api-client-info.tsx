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
  const statusLabel = apiClient.status === 'active' ? 'Activo' : 'Suspendido';

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: apiClient.name },
        { label: 'Descripcion', value: apiClient.description },
        {
          label: 'Estado',
          value: (
            <Badge variant={apiClient.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          ),
        },
        { label: 'Expiracion del access token', value: formatExpiry(apiClient.accessTokenExp) },
      ],
    },
    {
      title: 'Roles',
      items: [
        {
          label: 'Roles asignados',
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
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(apiClient.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(apiClient.updatedAt),
        },
        {
          label: 'Ultimo uso',
          value: apiClient.lastUsedAt ? formatDateTime(apiClient.lastUsedAt) : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Detalles del cliente API</SheetTitle>
          <SheetDescription>Visualiza la informacion de este cliente API.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
