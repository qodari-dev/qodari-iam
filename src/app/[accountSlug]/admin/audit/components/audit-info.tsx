'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AuditLog } from '@/schemas/audit';
import { formatDate } from '@/utils/formatters';
import { format } from 'date-fns';
import { User, Bot, CheckCircle, XCircle } from 'lucide-react';

// ============================================================================
// JSON Viewer Component
// ============================================================================

function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        No {label.toLowerCase()} data
      </div>
    );
  }

  return (
    <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}

// ============================================================================
// Changes Diff Component
// ============================================================================

function ChangesDiff({
  beforeValue,
  afterValue,
}: {
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
}) {
  if (!beforeValue && !afterValue) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">No change data available</div>
    );
  }

  // Get all unique keys from both objects
  const allKeys = new Set<string>();
  if (beforeValue) Object.keys(beforeValue).forEach((k) => allKeys.add(k));
  if (afterValue) Object.keys(afterValue).forEach((k) => allKeys.add(k));

  const changedKeys = Array.from(allKeys).filter((key) => {
    const before = beforeValue?.[key];
    const after = afterValue?.[key];
    return JSON.stringify(before) !== JSON.stringify(after);
  });

  if (changedKeys.length === 0 && beforeValue && afterValue) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">No changes detected</div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="diff" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diff">Changes</TabsTrigger>
          <TabsTrigger value="before">Before</TabsTrigger>
          <TabsTrigger value="after">After</TabsTrigger>
        </TabsList>
        <TabsContent value="diff" className="mt-4">
          {changedKeys.length > 0 ? (
            <div className="space-y-2">
              {changedKeys.map((key) => (
                <div key={key} className="bg-muted rounded-md p-3">
                  <div className="mb-2 text-sm font-medium">{key}</div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Before:</span>
                      <pre className="mt-1 rounded bg-red-50 p-2 wrap-break-word whitespace-pre-wrap text-red-600 dark:bg-red-950/20 dark:text-red-400">
                        {JSON.stringify(beforeValue?.[key] ?? null, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-muted-foreground">After:</span>
                      <pre className="mt-1 rounded bg-green-50 p-2 wrap-break-word whitespace-pre-wrap text-green-600 dark:bg-green-950/20 dark:text-green-400">
                        {JSON.stringify(afterValue?.[key] ?? null, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <JsonViewer data={afterValue || beforeValue} label="Data" />
          )}
        </TabsContent>
        <TabsContent value="before" className="mt-4">
          <JsonViewer data={beforeValue} label="Before" />
        </TabsContent>
        <TabsContent value="after" className="mt-4">
          <JsonViewer data={afterValue} label="After" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AuditInfo({
  auditLog,
  opened,
  onOpened,
}: {
  auditLog: AuditLog | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!auditLog) return null;

  const isUser = auditLog.actorType === 'user';
  const actorName = isUser
    ? auditLog.userName
      ? String(auditLog.userName)
      : null
    : auditLog.apiClientName
      ? String(auditLog.apiClientName)
      : null;
  const isSuccess = auditLog.status === 'success';

  const sections: DescriptionSection[] = [
    {
      title: 'Basic Information',
      columns: 2,
      items: [
        {
          label: 'Date & Time',
          value: (
            <div>
              <div>{formatDate(auditLog.createdAt)}</div>
              <div className="text-muted-foreground text-xs">
                {format(new Date(auditLog.createdAt), 'h:mm:ss a')}
              </div>
            </div>
          ),
        },
        {
          label: 'Status',
          value: (
            <Badge variant={isSuccess ? 'default' : 'destructive'} className="gap-1">
              {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isSuccess ? 'Success' : 'Failure'}
            </Badge>
          ),
        },
        {
          label: 'Action',
          value: <Badge variant="secondary">{String(auditLog.action)}</Badge>,
        },
        {
          label: 'ResourceKey',
          value: String(auditLog.resourceKey),
        },
        {
          label: 'ActionKey',
          value: String(auditLog.actionKey),
        },
      ],
    },
    {
      title: 'Actor',
      columns: 2,
      items: [
        {
          label: 'Type',
          value: (
            <div className="flex items-center gap-2">
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              <span>{isUser ? 'User' : 'API Client'}</span>
            </div>
          ),
        },
        {
          label: isUser ? 'User Name' : 'Client Name',
          value: actorName || '-',
        },
        {
          label: isUser ? 'User ID' : 'Client ID',
          value: ((isUser ? auditLog.userId : auditLog.apiClientId) as string | null) || '-',
          hidden: !(isUser ? auditLog.userId : auditLog.apiClientId),
        },
      ],
    },
    {
      title: 'Resource Details',
      columns: 2,
      items: [
        {
          label: 'Resource',
          value: String(auditLog.resourceKey),
        },
        {
          label: 'Resource ID',
          value: auditLog.resourceId ? String(auditLog.resourceId) : '-',
        },
        {
          label: 'Resource Label',
          value: auditLog.resourceLabel ? String(auditLog.resourceLabel) : '-',
        },
        {
          label: 'Application',
          value: auditLog.applicationName ? String(auditLog.applicationName) : '-',
        },
      ],
    },
    {
      title: 'Request Information',
      columns: 2,
      items: [
        {
          label: 'IP Address',
          value: auditLog.ipAddress ? (
            <span className="font-mono text-sm">{String(auditLog.ipAddress)}</span>
          ) : (
            '-'
          ),
        },
        {
          label: 'User Agent',
          value: auditLog.userAgent ? (
            <span
              className="block max-w-[300px] truncate text-xs"
              title={String(auditLog.userAgent)}
            >
              {String(auditLog.userAgent)}
            </span>
          ) : (
            '-'
          ),
        },
      ],
    },
  ];

  // Add error section if there's an error
  if (auditLog.errorMessage) {
    sections.push({
      title: 'Error',
      items: [
        {
          label: 'Error Message',
          value: (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {String(auditLog.errorMessage)}
            </div>
          ),
        },
      ],
    });
  }

  const hasMetadata =
    auditLog.metadata &&
    typeof auditLog.metadata === 'object' &&
    Object.keys(auditLog.metadata as object).length > 0;

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="flex flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Audit Log Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <DescriptionList sections={sections} columns={2} />

            {/* Changes Section */}
            <div className="mt-6">
              <h3 className="mb-4 text-sm font-medium">Changes</h3>
              <ChangesDiff beforeValue={auditLog.beforeValue} afterValue={auditLog.afterValue} />
            </div>

            {/* Metadata Section */}
            {hasMetadata && (
              <div className="mt-6">
                <h3 className="mb-4 text-sm font-medium">Additional Metadata</h3>
                <JsonViewer data={auditLog.metadata as Record<string, unknown>} label="Metadata" />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
