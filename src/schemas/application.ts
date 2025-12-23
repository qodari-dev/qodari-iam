import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  StringOperatorsSchema,
  UUIDOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// WHERE
// ============================================

const ApplicationWhereFieldsSchema = z
  .object({
    id: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    name: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    slug: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const APPLICATION_SORT_FIELDS = ['id', 'name', 'slug', 'status', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const APPLICATION_INCLUDE_OPTIONS = ['permissions'] as const;
const ApplicationIncludeSchema = createIncludeSchema(APPLICATION_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListApplicationsQuerySchema = createListQuerySchema({
  whereFields: ApplicationWhereFieldsSchema,
  sortFields: APPLICATION_SORT_FIELDS,
  includeFields: APPLICATION_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuerySchema>;

export const GetApplicationQuerySchema = z.object({
  include: ApplicationIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

const PermissionInputSchema = z.object({
  name: z.string().min(1).max(45),
  resource: z.string().min(1).max(45),
  action: z.string().min(1).max(45),
  description: z.string().max(500).optional(),
});

export const CreateApplicationBodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'suspended']),
  clientType: z.enum(['public', 'confidential']),
  clientId: z.string(),
  clientSecret: z.string(),
  authCodeExp: z.number(),
  accessTokenExp: z.number(),
  refreshTokenExp: z.number(),
  clientJwtSecret: z.string(),
  logo: z.string().url().optional(),
  homeUrl: z.string().url().optional(),
  logoutUrl: z.string().url().optional(),
  callbackUrl: z.string().url().optional(),
  permissions: PermissionInputSchema.array().optional(),
});

export const UpdateApplicationBodySchema = CreateApplicationBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type ApplicationPaginated = ClientInferResponseBody<Contract['application']['list'], 200>;

export type Application = ApplicationPaginated['data'][number];

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];
export type ApplicationInclude = (typeof APPLICATION_INCLUDE_OPTIONS)[number];
