'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useRegenerateApiClientSecret } from '@/hooks/queries/use-api-client-queries';
import { useI18n } from '@/i18n/provider';
import { ApiClientItem } from '@/schemas/api-client';
import { AlertTriangle, Check, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ApiClientInfoProps {
  apiClient: ApiClientItem | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}

export function ApiClientInfoCrendentials({ apiClient, opened, onOpened }: ApiClientInfoProps) {
  const { messages } = useI18n();
  const [copiedField, setCopiedField] = useState<'clientId' | 'secret' | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const { mutateAsync: regenerateSecret, isPending: isRegenerating } =
    useRegenerateApiClientSecret();

  const copyToClipboard = async (text: string, field: 'clientId' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(messages.common.copiedToClipboard);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(messages.common.copyToClipboardFailed);
    }
  };

  const handleRegenerate = async () => {
    if (!apiClient?.id) return;
    const result = await regenerateSecret({ params: { id: apiClient.id } });
    if (result.status === 200) {
      setNewSecret(result.body.clientSecret);
    }
    setShowRegenerateDialog(false);
  };

  if (!apiClient) return null;

  return (
    <>
      <Sheet open={opened} onOpenChange={onOpened}>
        <SheetContent className="overflow-y-scroll sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{messages.admin.apiClients.secretSheet.title}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 py-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">
                {messages.admin.apiClients.secretSheet.sectionTitle}
              </h4>

              <div>
                <label className="text-muted-foreground text-sm">
                  {messages.admin.apiClients.secretSheet.clientId}
                </label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 overflow-auto rounded px-2 py-1 font-mono text-sm">
                    {apiClient.clientId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(apiClient.clientId, 'clientId')}
                  >
                    {copiedField === 'clientId' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {newSecret ? (
                <div className="bg-warning/10 border-warning/50 rounded-lg border p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-warning h-5 w-5 shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {messages.admin.apiClients.secretSheet.newSecretTitle}
                      </p>
                      <code className="bg-muted block overflow-auto rounded px-2 py-1 font-mono text-xs">
                        {newSecret}
                      </code>
                      <p className="text-muted-foreground text-xs">
                        {messages.admin.apiClients.secretSheet.newSecretDescription}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(newSecret, 'secret')}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {messages.admin.apiClients.secretSheet.copySecret}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-muted-foreground text-sm">
                    {messages.admin.apiClients.secretSheet.clientSecret}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded px-2 py-1 font-mono text-sm">
                      {messages.admin.apiClients.secretSheet.maskedSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRegenerateDialog(true)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {messages.admin.apiClients.secretSheet.regenerate}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.admin.apiClients.dialogs.regenerate.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.admin.apiClients.dialogs.regenerate.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.admin.apiClients.form.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={isRegenerating} onClick={handleRegenerate}>
              {isRegenerating && <Spinner className="mr-2" />}
              {messages.admin.apiClients.dialogs.regenerate.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
