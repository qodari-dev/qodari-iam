'use client';

import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ApiClientCredentialsProps {
  clientId: string;
  clientSecret: string;
  onClose: () => void;
}

export function ApiClientCredentials({
  clientId,
  clientSecret,
  onClose,
}: ApiClientCredentialsProps) {
  const [copiedField, setCopiedField] = useState<'clientId' | 'clientSecret' | null>(null);

  const copyToClipboard = async (text: string, field: 'clientId' | 'clientSecret') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="bg-warning/10 border-warning/50 rounded-lg border p-4">
        <div className="flex gap-3">
          <AlertTriangle className="text-warning h-5 w-5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold">Guarda tus credenciales</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Esta es la unica vez que se mostrara el client secret. Guardalo de forma segura.
              No se podra recuperar despues, tendras que regenerarlo si lo pierdes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ID de cliente</label>
          <div className="flex gap-2">
            <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
              {clientId}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(clientId, 'clientId')}
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
          <div className="flex gap-2">
            <code className="bg-muted flex-1 overflow-auto rounded-md p-3 font-mono text-sm">
              {clientSecret}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(clientSecret, 'clientSecret')}
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

      <div className="bg-muted/50 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Ejemplo de uso</h4>
        <pre className="text-muted-foreground mt-2 overflow-auto text-xs">
          {`curl -X POST /api/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "${clientId}",
    "client_secret": "${clientSecret}",
    "app_slug": "your-app-slug"
  }'`}
        </pre>
      </div>

      <SheetFooter>
        <Button onClick={onClose}>Ya guarde las credenciales</Button>
      </SheetFooter>
    </div>
  );
}
