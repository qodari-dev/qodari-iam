import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  EnumOperatorsSchema,
  StringOperatorsSchema,
  UUIDOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// CONSTANTS AND ENUMS
// ============================================

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'read',
  'login',
  'logout',
  'other',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_STATUS = ['success', 'failure'] as const;
export type AuditStatus = (typeof AUDIT_STATUS)[number];

export const ACTOR_TYPES = ['user', 'api_client'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const AuditActionEnum = z.enum(AUDIT_ACTIONS);
export const AuditStatusEnum = z.enum(AUDIT_STATUS);
export const ActorTypeEnum = z.enum(ACTOR_TYPES);

// Options for UI selects
export const auditActionOptions = [
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Read', value: 'read' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
  { label: 'Other', value: 'other' },
] as const;

export const auditStatusOptions = [
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
] as const;

export const actorTypeOptions = [
  { label: 'User', value: 'user' },
  { label: 'API Client', value: 'api_client' },
] as const;

// ============================================
// REQUEST BODY FOR CREATING (used by external apps via M2M)
// ============================================

export const CreateAuditLogBodySchema = z.object({
  action: AuditActionEnum,
  resourceKey: z.string().min(1).max(100),
  functionName: z.string().min(1).max(100),
  resourceId: z.string().max(255).optional(),
  resourceLabel: z.string().max(255).optional(),
  userId: z.string().uuid().optional(),
  userName: z.string().max(100).optional(),
  status: AuditStatusEnum,
  errorMessage: z.string().max(1000).optional(),
  beforeValue: z.record(z.unknown()).optional(),
  afterValue: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAuditLogBody = z.infer<typeof CreateAuditLogBodySchema>;

// ============================================
// WHERE
// ============================================

const AuditLogWhereFieldsSchema = z
  .object({
    id: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    actorType: z.union([ActorTypeEnum, EnumOperatorsSchema(ACTOR_TYPES)]).optional(),
    userId: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    apiClientId: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    applicationId: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    action: z.union([AuditActionEnum, EnumOperatorsSchema(AUDIT_ACTIONS)]).optional(),
    actionKey: z.union([z.string(), StringOperatorsSchema]).optional(),
    resourceKey: z.union([z.string(), StringOperatorsSchema]).optional(),
    resourceId: z.union([z.string(), StringOperatorsSchema]).optional(),
    status: z.union([AuditStatusEnum, EnumOperatorsSchema(AUDIT_STATUS)]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const AUDIT_LOG_SORT_FIELDS = [
  'id',
  'actorType',
  'action',
  'actionKey',
  'resourceKey',
  'status',
  'createdAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const AUDIT_LOG_INCLUDE_OPTIONS = ['user', 'apiClient', 'application'] as const;
const AuditLogIncludeSchema = createIncludeSchema(AUDIT_LOG_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListAuditLogsQuerySchema = createListQuerySchema({
  whereFields: AuditLogWhereFieldsSchema,
  sortFields: AUDIT_LOG_SORT_FIELDS,
  includeFields: AUDIT_LOG_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

export const GetAuditLogQuerySchema = z.object({
  include: AuditLogIncludeSchema,
});

// ============================================
// EXPORT QUERY PARAMS
// ============================================

export const AuditLogExportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  // Filters
  actorType: ActorTypeEnum.optional(),
  userId: z.string().uuid().optional(),
  apiClientId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  action: z.array(AuditActionEnum).optional(),
  status: AuditStatusEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().optional(),
});

export type AuditLogExportQuery = z.infer<typeof AuditLogExportQuerySchema>;

// ============================================
// RESPONSE ITEM SCHEMA
// ============================================

export const AuditLogItemSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  actorType: ActorTypeEnum,
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  apiClientId: z.string().uuid().nullable(),
  apiClientName: z.string().nullable(),
  applicationId: z.string().uuid().nullable(),
  applicationName: z.string().nullable(),
  action: z.string(),
  actionKey: z.string(),
  resourceKey: z.string(),
  resourceId: z.string().nullable(),
  resourceLabel: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  status: z.string(),
  errorMessage: z.string().nullable(),
  beforeValue: z.object({}).nullable(),
  afterValue: z.object({}).nullable(),
  metadata: z.object({}).nullable(),
  createdAt: z.coerce.date(),
});

export type AuditLogItem = z.infer<typeof AuditLogItemSchema>;

// ============================================
// TYPES FROM CONTRACT
// ============================================

export type AuditLogPaginated = ClientInferResponseBody<Contract['audit']['list'], 200>;

// Use the contract-inferred type for API compatibility
export type AuditLog = AuditLogPaginated['data'][number];

export type AuditLogSortField = (typeof AUDIT_LOG_SORT_FIELDS)[number];
export type AuditLogInclude = (typeof AUDIT_LOG_INCLUDE_OPTIONS)[number];
