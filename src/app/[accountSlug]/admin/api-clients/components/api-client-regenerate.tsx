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
  const [copiedClientId, setCopiedClientId] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const { mutateAsync: regenerateSecret, isPending: isRegenerating } =
    useRegenerateApiClientSecret();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedClientId(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedClientId(false), 2000);
    } catch {
      toast.error('Failed to copy');
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
            <SheetTitle>API Client Tokens</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 py-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Credentials</h4>

              <div>
                <label className="text-muted-foreground text-sm">Client ID</label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 overflow-auto rounded px-2 py-1 font-mono text-sm">
                    {apiClient.clientId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(apiClient.clientId)}
                  >
                    {copiedClientId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {newSecret ? (
                <div className="bg-warning/10 border-warning/50 rounded-lg border p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-warning h-5 w-5 shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">New Secret Generated</p>
                      <code className="bg-muted block overflow-auto rounded px-2 py-1 font-mono text-xs">
                        {newSecret}
                      </code>
                      <p className="text-muted-foreground text-xs">
                        Save this secret now. It will not be shown again.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(newSecret)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Secret
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-muted-foreground text-sm">Client Secret</label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded px-2 py-1 font-mono text-sm">
                      ••••••••••••••••••••
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRegenerateDialog(true)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
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
            <AlertDialogTitle>Regenerate Client Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current secret immediately. Any systems using the current
              secret will need to be updated with the new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isRegenerating} onClick={handleRegenerate}>
              {isRegenerating && <Spinner className="mr-2" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
