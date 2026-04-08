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
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };
  if (!application) return null;

  const logoUrl = getStorageUrl(application.logo);
  const portalUrl = getStorageUrl(application.image);
  const authUrl = getStorageUrl(application.imageAd);
  const statusLabel = application.status === 'active' ? 'Activo' : 'Suspendido';
  const clientTypeLabel = application.clientType === 'public' ? 'Publico' : 'Confidencial';
  const mfaLabel = application.mfaEnabled ? 'Activado' : 'Desactivado';

  const sections: DescriptionSection[] = [
    {
      title: 'Datos basicos',
      columns: 2,
      items: [
        { label: 'Nombre', value: application.name },
        { label: 'Slug', value: application.slug },
        { label: 'Tipo de cliente', value: clientTypeLabel },
        {
          label: 'MFA',
          value: (
            <Badge variant={application.mfaEnabled ? 'default' : 'secondary'}>{mfaLabel}</Badge>
          ),
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={application.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
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
        {
          label: 'Imagen del portal',
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
          label: 'Imagen de anuncio (auth)',
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
      title: 'URLs',
      columns: 1,
      items: [
        { label: 'URL de inicio', value: application.homeUrl ?? '—' },
        {
          label: 'URLs de logout',
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
          label: 'URLs de callback',
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
      title: 'Permisos',
      items: [
        {
          label: 'Permisos definidos',
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
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(application.createdAt) },
        { label: 'Actualizado', value: formatDate(application.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Aplicacion</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
          <div className="mt-4 space-y-4">
            <h4 className="text-md font-semibold">Credenciales</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">JWT secret</label>
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
              <label className="text-sm font-medium">ID del cliente</label>
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
              <label className="text-sm font-medium">Secreto del cliente</label>
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
