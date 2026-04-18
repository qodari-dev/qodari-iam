'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/provider';
import type { AuditLog } from '@/schemas/audit';
import { formatDate } from '@/utils/formatters';
import { format } from 'date-fns';
import { User, Bot, CheckCircle, XCircle } from 'lucide-react';

// ============================================================================
// JSON Viewer Component
// ============================================================================

function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const { messages } = useI18n();
  if (!data) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        {messages.admin.audit.info.json.noData(label)}
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
  const { messages } = useI18n();
  if (!beforeValue && !afterValue) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        {messages.admin.audit.info.diff.noData}
      </div>
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
      <div className="text-muted-foreground py-4 text-center text-sm">
        {messages.admin.audit.info.diff.noChanges}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="diff" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diff">{messages.admin.audit.info.diff.tabs.changes}</TabsTrigger>
          <TabsTrigger value="before">{messages.admin.audit.info.diff.tabs.before}</TabsTrigger>
          <TabsTrigger value="after">{messages.admin.audit.info.diff.tabs.after}</TabsTrigger>
        </TabsList>
        <TabsContent value="diff" className="mt-4">
          {changedKeys.length > 0 ? (
            <div className="space-y-2">
              {changedKeys.map((key) => (
                <div key={key} className="bg-muted rounded-md p-3">
                  <div className="mb-2 text-sm font-medium">{key}</div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        {messages.admin.audit.info.diff.before}
                      </span>
                      <pre className="mt-1 rounded bg-red-50 p-2 wrap-break-word whitespace-pre-wrap text-red-600 dark:bg-red-950/20 dark:text-red-400">
                        {JSON.stringify(beforeValue?.[key] ?? null, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {messages.admin.audit.info.diff.after}
                      </span>
                      <pre className="mt-1 rounded bg-green-50 p-2 wrap-break-word whitespace-pre-wrap text-green-600 dark:bg-green-950/20 dark:text-green-400">
                        {JSON.stringify(afterValue?.[key] ?? null, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <JsonViewer data={afterValue || beforeValue} label={messages.admin.audit.info.diff.fallbackLabel} />
          )}
        </TabsContent>
        <TabsContent value="before" className="mt-4">
          <JsonViewer data={beforeValue} label={messages.admin.audit.info.diff.beforeLabel} />
        </TabsContent>
        <TabsContent value="after" className="mt-4">
          <JsonViewer data={afterValue} label={messages.admin.audit.info.diff.afterLabel} />
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
  const { messages } = useI18n();
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
  const actionLabels: Record<string, string> = {
    create: messages.admin.audit.labels.action.create,
    update: messages.admin.audit.labels.action.update,
    delete: messages.admin.audit.labels.action.delete,
    read: messages.admin.audit.labels.action.read,
    login: messages.admin.audit.labels.action.login,
    logout: messages.admin.audit.labels.action.logout,
    other: messages.admin.audit.labels.action.other,
  };

  const sections: DescriptionSection[] = [
    {
      title: messages.admin.audit.info.sections.basic,
      columns: 2,
      items: [
        {
          label: messages.admin.audit.info.fields.dateTime,
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
          label: messages.admin.audit.info.fields.status,
          value: (
            <Badge variant={isSuccess ? 'default' : 'destructive'} className="gap-1">
              {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isSuccess
                ? messages.admin.audit.labels.status.success
                : messages.admin.audit.labels.status.failure}
            </Badge>
          ),
        },
        {
          label: messages.admin.audit.info.fields.action,
          value: (
            <Badge variant="secondary">
              {actionLabels[String(auditLog.action)] ?? String(auditLog.action)}
            </Badge>
          ),
        },
        {
          label: messages.admin.audit.info.fields.resourceKey,
          value: String(auditLog.resourceKey),
        },
        {
          label: messages.admin.audit.info.fields.actionKey,
          value: String(auditLog.actionKey),
        },
      ],
    },
    {
      title: messages.admin.audit.info.sections.actor,
      columns: 2,
      items: [
        {
          label: messages.admin.audit.info.fields.type,
          value: (
            <div className="flex items-center gap-2">
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              <span>
                {isUser ? messages.admin.audit.labels.actor.user : messages.admin.audit.labels.actor.apiClient}
              </span>
            </div>
          ),
        },
        {
          label: isUser
            ? messages.admin.audit.info.fields.actorNameUser
            : messages.admin.audit.info.fields.actorNameClient,
          value: actorName || '-',
        },
        {
          label: isUser
            ? messages.admin.audit.info.fields.actorIdUser
            : messages.admin.audit.info.fields.actorIdClient,
          value: ((isUser ? auditLog.userId : auditLog.apiClientId) as string | null) || '-',
          hidden: !(isUser ? auditLog.userId : auditLog.apiClientId),
        },
      ],
    },
    {
      title: messages.admin.audit.info.sections.resource,
      columns: 2,
      items: [
        {
          label: messages.admin.audit.info.fields.resource,
          value: String(auditLog.resourceKey),
        },
        {
          label: messages.admin.audit.info.fields.resourceId,
          value: auditLog.resourceId ? String(auditLog.resourceId) : '-',
        },
        {
          label: messages.admin.audit.info.fields.resourceLabel,
          value: auditLog.resourceLabel ? String(auditLog.resourceLabel) : '-',
        },
        {
          label: messages.admin.audit.info.fields.application,
          value: auditLog.applicationName ? String(auditLog.applicationName) : '-',
        },
      ],
    },
    {
      title: messages.admin.audit.info.sections.request,
      columns: 2,
      items: [
        {
          label: messages.admin.audit.info.fields.ipAddress,
          value: auditLog.ipAddress ? (
            <span className="font-mono text-sm">{String(auditLog.ipAddress)}</span>
          ) : (
            '-'
          ),
        },
        {
          label: messages.admin.audit.info.fields.userAgent,
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
      title: messages.admin.audit.info.sections.error,
      items: [
        {
          label: messages.admin.audit.info.fields.errorMessage,
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
          <SheetTitle>{messages.admin.audit.info.title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <DescriptionList sections={sections} columns={2} />

            {/* Changes Section */}
            <div className="mt-6">
              <h3 className="mb-4 text-sm font-medium">{messages.admin.audit.info.changes}</h3>
              <ChangesDiff beforeValue={auditLog.beforeValue} afterValue={auditLog.afterValue} />
            </div>

            {/* Metadata Section */}
            {hasMetadata && (
              <div className="mt-6">
                <h3 className="mb-4 text-sm font-medium">{messages.admin.audit.info.metadata}</h3>
                <JsonViewer
                  data={auditLog.metadata as Record<string, unknown>}
                  label={messages.admin.audit.info.metadataLabel}
                />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
