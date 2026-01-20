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
// CONSTANTES Y ENUMS
// ============================================

export const apiClientStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
] as const;

const API_CLIENT_STATUS = ['active', 'suspended'] as const;
const ApiClientStatusEnum = z.enum(API_CLIENT_STATUS);
export type ApiClientStatus = z.infer<typeof ApiClientStatusEnum>;

// ============================================
// WHERE
// ============================================

const ApiClientWhereFieldsSchema = z
  .object({
    id: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    name: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    clientId: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    status: z.union([ApiClientStatusEnum, EnumOperatorsSchema(API_CLIENT_STATUS)]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    lastUsedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const API_CLIENT_SORT_FIELDS = [
  'id',
  'name',
  'clientId',
  'status',
  'createdAt',
  'updatedAt',
  'lastUsedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const API_CLIENT_INCLUDE_OPTIONS = ['roles'] as const;
const ApiClientIncludeSchema = createIncludeSchema(API_CLIENT_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListApiClientsQuerySchema = createListQuerySchema({
  whereFields: ApiClientWhereFieldsSchema,
  sortFields: API_CLIENT_SORT_FIELDS,
  includeFields: API_CLIENT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListApiClientsQuery = z.infer<typeof ListApiClientsQuerySchema>;

export const GetApiClientQuerySchema = z.object({
  include: ApiClientIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateApiClientBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  accessTokenExp: z.number().min(60).max(3600).optional(), // 1 min - 1 hour
  roleIds: z.array(z.string().uuid()).optional(),
});

export type CreateApiClientBody = z.infer<typeof CreateApiClientBodySchema>;

export const UpdateApiClientBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: ApiClientStatusEnum.optional(),
  accessTokenExp: z.number().min(60).max(3600).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type UpdateApiClientBody = z.infer<typeof UpdateApiClientBodySchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const ApiClientCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  clientId: z.string(),
  clientSecret: z.string(), // Only returned on create
  status: ApiClientStatusEnum,
  accessTokenExp: z.number(),
  lastUsedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApiClientCreatedResponse = z.infer<typeof ApiClientCreatedResponseSchema>;

export const RegenerateSecretResponseSchema = z.object({
  clientSecret: z.string(),
});

export type RegenerateSecretResponse = z.infer<typeof RegenerateSecretResponseSchema>;

// ============================================
// TYPES
// ============================================

export type ApiClientPaginated = ClientInferResponseBody<Contract['apiClient']['list'], 200>;

export type ApiClientItem = ApiClientPaginated['data'][number];

export type ApiClientSortField = (typeof API_CLIENT_SORT_FIELDS)[number];
export type ApiClientInclude = (typeof API_CLIENT_INCLUDE_OPTIONS)[number];
