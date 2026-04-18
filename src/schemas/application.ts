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

export const PermissionInputSchema = z.object({
  name: z
    .string()
    .min(1, 'APPLICATION_PERMISSION_NAME_REQUIRED')
    .max(45, 'APPLICATION_PERMISSION_NAME_TOO_LONG'),
  resource: z
    .string()
    .min(1, 'APPLICATION_PERMISSION_RESOURCE_REQUIRED')
    .max(45, 'APPLICATION_PERMISSION_RESOURCE_TOO_LONG'),
  action: z
    .string()
    .min(1, 'APPLICATION_PERMISSION_ACTION_REQUIRED')
    .max(45, 'APPLICATION_PERMISSION_ACTION_TOO_LONG'),
  description: z.string().max(500, 'APPLICATION_PERMISSION_DESCRIPTION_TOO_LONG').optional(),
});

export type PermissionInput = z.infer<typeof PermissionInputSchema>;

export const CreateApplicationBodySchema = z.object({
  name: z.string().min(1, 'APPLICATION_NAME_REQUIRED').max(255, 'APPLICATION_NAME_TOO_LONG'),
  slug: z.string().min(1, 'APPLICATION_SLUG_REQUIRED').max(100, 'APPLICATION_SLUG_TOO_LONG'),
  description: z.string().max(500, 'APPLICATION_DESCRIPTION_TOO_LONG').optional(),
  status: z.enum(['active', 'suspended']),
  clientType: z.enum(['public', 'confidential']),
  clientId: z.string().min(1, 'APPLICATION_CLIENT_ID_REQUIRED'),
  clientSecret: z.string().min(1, 'APPLICATION_CLIENT_SECRET_REQUIRED'),
  authCodeExp: z.number(),
  accessTokenExp: z.number(),
  refreshTokenExp: z.number(),
  clientJwtSecret: z.string().min(1, 'APPLICATION_CLIENT_JWT_SECRET_REQUIRED'),
  logo: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  imageAd: z.string().nullable().optional(),
  homeUrl: z.string().url('APPLICATION_HOME_URL_INVALID').optional(),
  logoutUrl: z
    .array(z.string().url('APPLICATION_LOGOUT_URL_INVALID'))
    .min(1, 'APPLICATION_LOGOUT_URL_REQUIRED'),
  callbackUrls: z
    .array(z.string().url('APPLICATION_CALLBACK_URL_INVALID'))
    .min(1, 'APPLICATION_CALLBACK_URL_REQUIRED'),
  permissions: PermissionInputSchema.array().optional(),
  mfaEnabled: z.boolean().optional(),
});

export const UpdateApplicationBodySchema = CreateApplicationBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type ApplicationPaginated = ClientInferResponseBody<Contract['application']['list'], 200>;

export type Application = ApplicationPaginated['data'][number];

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];
export type ApplicationInclude = (typeof APPLICATION_INCLUDE_OPTIONS)[number];
