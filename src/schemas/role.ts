import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  StringOperatorsSchema,
  UUIDOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const RoleWhereFieldsSchema = z
  .object({
    id: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    applicationId: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    name: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    slug: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    description: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const ROLE_SORT_FIELDS = [
  'id',
  'application_id',
  'name',
  'slug',
  'description',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const ROLE_INCLUDE_OPTIONS = ['application', 'permissions'] as const;
const RoleIncludeSchema = createIncludeSchema(ROLE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListRolesQuerySchema = createListQuerySchema({
  whereFields: RoleWhereFieldsSchema,
  sortFields: ROLE_SORT_FIELDS,
  includeFields: ROLE_INCLUDE_OPTIONS,
  sortMax: 3,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateRoleBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  applicationId: z.string().uuid(),
  description: z.string().max(500).optional(),
  permissions: z
    .array(
      z.object({
        permissionId: z.string().uuid(),
      })
    )
    .optional(),
});

export const UpdateRoleBodySchema = CreateRoleBodySchema.partial();

export type ListRolesQuery = z.infer<typeof ListRolesQuerySchema>;

export const GetRoleQuerySchema = z.object({
  include: RoleIncludeSchema,
});

export type RolePaginated = ClientInferResponseBody<Contract['role']['list'], 200>;

export type Role = RolePaginated['data'][number];

export type RoleSortField = (typeof ROLE_SORT_FIELDS)[number];
export type RoleInclude = (typeof ROLE_INCLUDE_OPTIONS)[number];
