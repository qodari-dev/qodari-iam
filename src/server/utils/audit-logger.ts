import { db } from '@/server/db';
import { auditLogs, type ActorType, type NewAuditLog } from '@/server/db/schema';
import type { AuditAction, AuditStatus } from '@/schemas/audit';
import { UnifiedAuthContext } from './auth-context';

export type AuditLogParams = {
  accountId?: string;

  // Actor (one of the two)
  actorType?: ActorType;
  userId?: string;
  userName?: string;
  apiClientId?: string;
  apiClientName?: string;

  // Context
  applicationId?: string;
  applicationName?: string;

  // Operation
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceLabel?: string;

  // Request info
  ipAddress?: string | null;
  userAgent?: string | null;

  // Result
  status: AuditStatus;
  errorMessage?: string;

  // Changes
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;

  // Extra
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget audit logger for internal IAM operations.
 * Does not block the main operation - errors are logged but not thrown.
 */
export async function logAudit(session: UnifiedAuthContext, params: AuditLogParams): Promise<void> {
  const insertData: NewAuditLog = {
    ...params,
    ...(session.type === 'user'
      ? {
          actorType: 'user',
          userId: session.user.id,
          userName: `${session.user.firstName} ${session.user.lastName}`,
          applicationName: 'iam',
        }
      : {
          actorType: 'api_client',
          apiClientId: session.apiClientId,
          apiClientName: session.apiClientName,
          applicationId: session.applicationId,
          applicationName: session.applicationName,
        }),
    accountId: session.accountId,
    errorMessage: params.errorMessage,
    beforeValue: params.beforeValue,
    afterValue: params.afterValue,
    metadata: params.metadata,
  };

  db.insert(auditLogs)
    .values(insertData)
    .catch((error) => {
      console.error('[AuditLogger] Failed to log audit event:', error);
    });
}
